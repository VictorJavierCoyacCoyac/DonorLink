"""Audit log endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole
from app.schemas import AuditLogListResponse, AuditLogResponse, CurrentUser
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("/logs", response_model=AuditLogListResponse)
@limiter.limit("30/minute")
def get_audit_logs(
    request: Request,
    entity_type: str | None = Query(None, description="Filter by entity type (donor, donation, user, etc.)"),
    entity_id: int | None = Query(None, description="Filter by entity ID"),
    user_id: int | None = Query(None, description="Filter by user who performed action"),
    action: str | None = Query(None, description="Filter by action (create, update, delete, login, etc.)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """
    Get audit logs with optional filtering.
    
    **Requires ADMIN role**
    
    Filters:
    - entity_type: Type of entity modified
    - entity_id: ID of the entity
    - user_id: ID of the user who performed the action
    - action: Type of action performed
    """
    logs, total = AuditService.get_audit_logs(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        skip=skip,
        limit=limit,
    )
    
    return AuditLogListResponse(
        logs=logs,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/entity/{entity_type}/{entity_id}", response_model=AuditLogListResponse)
@limiter.limit("30/minute")
def get_entity_history(
    entity_type: str,
    entity_id: int,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """
    Get full change history of a specific entity.
    
    **Requires ADMIN or STAFF role**
    """
    logs, total = AuditService.get_entity_history(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
        skip=skip,
        limit=limit,
    )
    
    return AuditLogListResponse(
        logs=logs,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/user/{user_id}", response_model=AuditLogListResponse)
@limiter.limit("30/minute")
def get_user_activity(
    user_id: int,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """
    Get all activities performed by a specific user.
    
    **Requires ADMIN role**
    """
    logs, total = AuditService.get_user_activity(
        db,
        user_id=user_id,
        skip=skip,
        limit=limit,
    )
    
    return AuditLogListResponse(
        logs=logs,
        total=total,
        skip=skip,
        limit=limit,
    )
