"""Service for notification operations"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import Notification, UserNotification
from app.schemas import NotificationCreate


class NotificationService:
    """Service layer for notification operations"""

    @staticmethod
    def create_notification(
        db: Session,
        notification_data: NotificationCreate,
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            donor_id=notification_data.donor_id,
            requester_id=notification_data.requester_id,
            notification_type=notification_data.notification_type,
            title=notification_data.title,
            content=notification_data.content,
            is_read=False,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_notification(db: Session, notification_id: int) -> Optional[Notification]:
        """Get a notification by ID"""
        return db.query(Notification).filter(Notification.id == notification_id).first()

    @staticmethod
    def get_donor_notifications(
        db: Session,
        donor_id: int,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[Notification], int]:
        """Get notifications for a donor"""
        query = db.query(Notification).filter(Notification.donor_id == donor_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        total = query.count()
        notifications = (
            query.order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return notifications, total

    @staticmethod
    def get_unread_count(db: Session, donor_id: int) -> int:
        """Get unread notification count for a donor"""
        return (
            db.query(Notification)
            .filter(
                and_(
                    Notification.donor_id == donor_id,
                    Notification.is_read == False,
                )
            )
            .count()
        )

    @staticmethod
    def mark_as_read(db: Session, notification_id: int) -> Optional[Notification]:
        """Mark a notification as read"""
        notification = NotificationService.get_notification(db, notification_id)
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session, donor_id: int) -> int:
        """Mark all notifications as read for a donor"""
        count = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.donor_id == donor_id,
                    Notification.is_read == False,
                )
            )
            .update({
                Notification.is_read: True,
                Notification.read_at: datetime.utcnow(),
            })
        )
        db.commit()
        return count

    @staticmethod
    def delete_notification(db: Session, notification_id: int) -> bool:
        """Delete a notification"""
        notification = NotificationService.get_notification(db, notification_id)
        if notification:
            db.delete(notification)
            db.commit()
            return True
        return False

    @staticmethod
    def create_system_notification(
        db: Session,
        donor_id: int,
        title: str,
        content: str,
    ) -> Notification:
        """Create a system notification"""
        notification_data = NotificationCreate(
            donor_id=donor_id,
            notification_type="system",
            title=title,
            content=content,
        )
        return NotificationService.create_notification(db, notification_data)

    @staticmethod
    def create_request_notification(
        db: Session,
        donor_id: int,
        requester_id: int,
        title: str,
        content: str,
    ) -> Notification:
        """Create a request notification"""
        notification_data = NotificationCreate(
            donor_id=donor_id,
            requester_id=requester_id,
            notification_type="request",
            title=title,
            content=content,
        )
        return NotificationService.create_notification(db, notification_data)

    @staticmethod
    def create_message_notification(
        db: Session,
        donor_id: int,
        requester_id: int,
        title: str,
        message_preview: str,
    ) -> Notification:
        """Create a message notification"""
        notification_data = NotificationCreate(
            donor_id=donor_id,
            requester_id=requester_id,
            notification_type="message",
            title=title,
            content=message_preview,
        )
        return NotificationService.create_notification(db, notification_data)

    # -------------------------------------------------------------------------
    # User-based notifications (works for all roles)
    # -------------------------------------------------------------------------

    @staticmethod
    def notify_user(
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        content: str,
    ) -> UserNotification:
        """Create a notification for any user (all roles)"""
        notif = UserNotification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            content=content,
            is_read=False,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[UserNotification], int]:
        query = db.query(UserNotification).filter(UserNotification.user_id == user_id)
        if unread_only:
            query = query.filter(UserNotification.is_read == False)
        total = query.count()
        notifications = query.order_by(UserNotification.created_at.desc()).offset(skip).limit(limit).all()
        return notifications, total

    @staticmethod
    def get_user_unread_count(db: Session, user_id: int) -> int:
        return (
            db.query(UserNotification)
            .filter(UserNotification.user_id == user_id, UserNotification.is_read == False)
            .count()
        )

    @staticmethod
    def mark_user_notification_as_read(db: Session, notification_id: int, user_id: int) -> Optional[UserNotification]:
        notif = db.query(UserNotification).filter(
            UserNotification.id == notification_id,
            UserNotification.user_id == user_id,
        ).first()
        if notif:
            notif.is_read = True
            notif.read_at = datetime.utcnow()
            db.commit()
            db.refresh(notif)
        return notif

    @staticmethod
    def mark_all_user_notifications_as_read(db: Session, user_id: int) -> int:
        count = (
            db.query(UserNotification)
            .filter(UserNotification.user_id == user_id, UserNotification.is_read == False)
            .update({UserNotification.is_read: True, UserNotification.read_at: datetime.utcnow()})
        )
        db.commit()
        return count
