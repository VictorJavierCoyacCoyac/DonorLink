"""Authentication endpoints"""
import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, security
from app.core.rate_limiting import limiter
from app.schemas import (
    UserLogin,
    UserRegister,
    TokenResponse,
    TokenRefresh,
    UserResponse,
    CurrentUser,
    PasswordChangeRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserUpdate,
    DonorRegister,
    DonorResponse,
)
from app.models import PasswordResetToken
from app.services.user_service import UserService
from app.services.donor_service import DonorService
from app.services.audit_service import AuditService
from app.services.email_service import EmailService
from app.core.security import SecurityService, TOKEN_TYPE_REFRESH, TOKEN_TYPE_ACCESS
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("3/minute")
def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    - **username**: Unique username (3-100 characters)
    - **email**: Valid email address
    - **password**: Minimum 8 characters
    """
    try:
        user = UserService.register_user(db, user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/donors/register", response_model=DonorResponse, status_code=201)
@limiter.limit("3/minute")
def register_donor(donor_data: DonorRegister, request: Request, db: Session = Depends(get_db)):
    """
    Register a new donor with account creation.
    
    The donor will be created with status 'pending' and will need admin approval
    to appear in donor searches for requesters.
    
    - **username**: Unique username (3-100 characters)
    - **password**: Minimum 8 characters
    - **email**: Valid email address
    - **name**: Full name
    - **blood_type**: Blood type (O-, O+, A-, A+, B-, B+, AB-, AB+)
    - **age**: Age between 18 and 120
    - **weight**: Weight in kg (minimum 50)
    """
    try:
        ip_address = get_client_ip(request)
        donor, user_id = DonorService.register_donor_with_user(db, donor_data, ip_address=ip_address)
        
        # Log successful registration
        AuditService.log_action(
            db=db,
            user_id=user_id,
            action="donor_registration_submitted",
            entity_type="donor",
            entity_id=donor.id,
            description=f"Donor registration submitted for {donor.email}",
            ip_address=ip_address,
        )
        
        return donor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Login with username/email and password.
    
    Returns access and refresh tokens.
    """
    # Authenticate user
    user = UserService.authenticate_user(db, credentials.username, credentials.password)
    
    if not user:
        # Log failed login attempt
        ip_address = get_client_ip(request)
        AuditService.log_action(
            db=db,
            user_id=None,
            action="login_failed",
            entity_type="user",
            entity_id=0,
            description=f"Failed login attempt for username: {credentials.username}",
            ip_address=ip_address,
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    # Log successful login
    ip_address = get_client_ip(request)
    AuditService.log_action(
        db=db,
        user_id=user.id,
        action="login",
        entity_type="user",
        entity_id=user.id,
        description=f"User login: {user.username}",
        ip_address=ip_address,
    )
    
    # Create tokens
    tokens = SecurityService.create_tokens(user.id, user.username)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh_token(
    request: TokenRefresh,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """
    Refresh access token using a refresh token.
    """
    # Verify refresh token
    payload = SecurityService.verify_token(request.refresh_token, TOKEN_TYPE_REFRESH)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    # Get user
    user_id = payload.get("user_id")
    user = UserService.get_user_by_id(db, user_id)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    # Create new tokens
    tokens = SecurityService.create_tokens(user.id, user.username)
    return tokens


@router.get("/me", response_model=CurrentUser)
def get_me(
    credentials: HTTPAuthenticationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Get current user information from token."""
    from app.core.security import TOKEN_TYPE_ACCESS
    
    token = credentials.credentials
    payload = SecurityService.verify_token(token, TOKEN_TYPE_ACCESS)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    user_id = payload.get("user_id")
    user = UserService.get_user_by_id(db, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return CurrentUser(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
    )


@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    credentials: HTTPAuthenticationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Change current user password."""
    token = credentials.credentials
    payload_token = SecurityService.verify_token(token, TOKEN_TYPE_ACCESS)

    if not payload_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload_token.get("user_id")
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not SecurityService.verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta",
        )

    updates = UserUpdate(password=payload.new_password)
    updated_user = UserService.update_user(db, user.id, updates)

    AuditService.log_action(
        db=db,
        user_id=user.id,
        action="password_changed",
        entity_type="user",
        entity_id=user.id,
        description="User changed own password",
        ip_address=get_client_ip(request),
    )

    return {"message": "Contraseña actualizada correctamente"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Request a password reset email.

    Always returns 200 to avoid leaking whether the email exists.
    """
    user = UserService.get_user_by_email(db, payload.email)
    if user and user.is_active:
        # Invalidate any existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).delete()
        db.commit()

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.add(reset_token)
        db.commit()

        EmailService.send_password_reset(user.email, user.username, raw_token)

        AuditService.log_action(
            db=db,
            user_id=user.id,
            action="password_reset_requested",
            entity_type="user",
            entity_id=user.id,
            description=f"Password reset requested for {user.email}",
            ip_address=get_client_ip(request),
        )

    return {"message": "Si el email existe, recibirás un enlace para restablecer tu contraseña."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Reset password using a token received via email."""
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
    ).first()

    if not reset_token or reset_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación es inválido o ha expirado.",
        )

    user = UserService.get_user_by_id(db, reset_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario no encontrado.")

    updates = UserUpdate(password=payload.new_password)
    UserService.update_user(db, user.id, updates)

    reset_token.used_at = datetime.utcnow()
    db.commit()

    AuditService.log_action(
        db=db,
        user_id=user.id,
        action="password_reset_completed",
        entity_type="user",
        entity_id=user.id,
        description=f"Password reset completed for {user.email}",
        ip_address=get_client_ip(request),
    )

    return {"message": "Contraseña restablecida correctamente. Ya puedes iniciar sesión."}


@router.post("/logout")
def logout():
    """
    Logout endpoint (placeholder).
    
    In a production system, you would:
    - Add token to a blacklist/invalidated tokens cache
    - Or implement token revocation in a database
    
    For now, client should simply discard the token.
    """
    return {"message": "Logged out successfully. Please discard your tokens."}
