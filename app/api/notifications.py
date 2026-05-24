"""Notification endpoints — works for all roles via UserNotification"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, security, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole
from app.schemas import UserNotificationListResponse, UserNotificationResponse
from app.services.notification_service import NotificationService
from app.services.user_service import UserService
from app.core.security import SecurityService, TOKEN_TYPE_ACCESS


class BroadcastPayload(BaseModel):
    donor_id: Optional[int] = None
    user_id: Optional[int] = None
    notification_type: str = "system"
    title: str
    content: str

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def _get_user_id(credentials, db):
    token = credentials.credentials
    payload = SecurityService.verify_token(token, TOKEN_TYPE_ACCESS)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
    user_id = payload.get("user_id")
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user_id


@router.get("", response_model=UserNotificationListResponse)
@limiter.limit("60/minute")
def get_notifications(
    request: Request,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Get notifications for the current user (all roles)"""
    user_id = _get_user_id(credentials, db)
    notifications, total = NotificationService.get_user_notifications(
        db, user_id, unread_only=unread_only, skip=skip, limit=limit
    )
    unread_count = NotificationService.get_user_unread_count(db, user_id)
    return UserNotificationListResponse(notifications=notifications, total=total, unread_count=unread_count)


@router.patch("/read-all")
@limiter.limit("30/minute")
def mark_all_as_read(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read"""
    user_id = _get_user_id(credentials, db)
    count = NotificationService.mark_all_user_notifications_as_read(db, user_id)
    return {"marked": count}


@router.patch("/{notification_id}/read")
@limiter.limit("60/minute")
def mark_as_read(
    notification_id: int,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read"""
    user_id = _get_user_id(credentials, db)
    notif = NotificationService.mark_user_notification_as_read(db, notification_id, user_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return {"ok": True}


@router.post("")
@limiter.limit("30/minute")
def create_notification_admin(
    request: Request,
    body: BroadcastPayload,
    current_user=Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin broadcast: create notification for a user (by donor_id or user_id)"""
    target_user_id = body.user_id

    if not target_user_id and body.donor_id:
        from app.services.donor_service import DonorService
        donor = DonorService.get_donor(db, body.donor_id)
        target_user_id = donor.user_id if donor else None

    # Donor was created manually without a user account — skip silently
    if not target_user_id:
        return {"ok": True, "skipped": True, "reason": "no_user_account"}

    notif = NotificationService.notify_user(
        db=db,
        user_id=target_user_id,
        notification_type=body.notification_type,
        title=body.title,
        content=body.content,
    )
    return {"id": notif.id, "ok": True, "skipped": False}
