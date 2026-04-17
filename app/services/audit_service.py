"""Service for audit logging"""
import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import AuditLog


class AuditService:
    """Service for audit trail operations"""
    
    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[int],
        action: str,
        entity_type: str,
        entity_id: int,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        Args:
            db: Database session
            user_id: ID of the user performing the action
            action: Action performed (create, update, delete, login, etc.)
            entity_type: Type of entity modified (donor, donation, user, etc.)
            entity_id: ID of the entity
            old_values: Dictionary of old field values
            new_values: Dictionary of new field values
            description: Human-readable description of the action
            ip_address: IP address of the request (for security)
        """
        # Convert dictionaries to JSON strings
        old_values_str = json.dumps(old_values, default=str) if old_values else None
        new_values_str = json.dumps(new_values, default=str) if new_values else None
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values_str,
            new_values=new_values_str,
            description=description,
            ip_address=ip_address,
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
    
    @staticmethod
    def get_audit_logs(
        db: Session,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[AuditLog], int]:
        """
        Get audit logs with optional filtering.
        
        Returns:
            Tuple of (logs list, total count)
        """
        query = db.query(AuditLog)
        
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        if action:
            query = query.filter(AuditLog.action == action)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Order by newest first and apply pagination
        logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
        
        return logs, total_count
    
    @staticmethod
    def get_entity_history(
        db: Session,
        entity_type: str,
        entity_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[AuditLog], int]:
        """Get full history of changes for a specific entity"""
        return AuditService.get_audit_logs(
            db,
            entity_type=entity_type,
            entity_id=entity_id,
            skip=skip,
            limit=limit,
        )
    
    @staticmethod
    def get_user_activity(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[AuditLog], int]:
        """Get all activity performed by a specific user"""
        return AuditService.get_audit_logs(
            db,
            user_id=user_id,
            skip=skip,
            limit=limit,
        )
