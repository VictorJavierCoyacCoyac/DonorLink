"""Dependency injection for API routes"""
from functools import wraps
from typing import List, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_session
from app.core.security import SecurityService, TOKEN_TYPE_ACCESS
from app.services.user_service import UserService
from app.schemas import CurrentUser
from app.models import UserRole

# Security scheme
security = HTTPBearer()


async def get_db() -> Session:
    """Dependency for getting database session"""
    for db in get_session():
        yield db


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Dependency to get the current authenticated user.
    
    Args:
        credentials: HTTP Bearer token
        db: Database session
        
    Returns:
        Current user information
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    # Verify token
    payload = SecurityService.verify_token(token, TOKEN_TYPE_ACCESS)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_id = payload.get("user_id")
    username = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Ensure role is always a UserRole enum, not a string
    user_role = user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    return CurrentUser(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user_role,
    )


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> CurrentUser | None:
    """Optional dependency for getting current user if authenticated"""
    if not credentials:
        return None
    return await get_current_user(credentials, db)


def require_role(allowed_roles: Union[UserRole, List[UserRole]]):
    """
    Dependency to enforce role-based access control.
    
    Args:
        allowed_roles: Single role or list of allowed roles
        
    Returns:
        Async function that validates user role
        
    Raises:
        HTTPException: If user doesn't have required role
        
    Example:
        @router.get("/admin-only")
        def admin_endpoint(
            current_user: CurrentUser = Depends(require_role(UserRole.ADMIN))
        ):
            ...
    """
    # Normalize to list
    if isinstance(allowed_roles, UserRole):
        allowed_roles = [allowed_roles]
    elif isinstance(allowed_roles, str):
        allowed_roles = [UserRole(allowed_roles)]
    else:
        allowed_roles = [UserRole(role) if isinstance(role, str) else role for role in allowed_roles]
    
    async def check_role(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        """Check if user has one of the allowed roles"""
        # Ensure user_role is always an enum
        user_role = current_user.role
        if isinstance(user_role, str):
            user_role = UserRole(user_role)
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}",
            )
        
        return current_user
    
    return check_role


