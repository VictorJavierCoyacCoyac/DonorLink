"""Service for administrative monitoring and utility operations"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import User, Donor, Requester, Donation, Message, AuditLog


class AdminService:
    """Service for admin reporting and monitoring"""

    @staticmethod
    def get_system_metrics(db: Session) -> dict:
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
        total_donors = db.query(func.count(Donor.id)).scalar() or 0
        total_requesters = db.query(func.count(Requester.id)).scalar() or 0
        total_donations = db.query(func.count(Donation.id)).scalar() or 0
        total_messages = db.query(func.count(Message.id)).scalar() or 0
        total_audit_logs = db.query(func.count(AuditLog.id)).scalar() or 0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_donors": total_donors,
            "total_requesters": total_requesters,
            "total_donations": total_donations,
            "total_messages": total_messages,
            "total_audit_logs": total_audit_logs,
            "system_status": "healthy",
        }
