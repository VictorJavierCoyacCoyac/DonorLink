"""Service for donor application workflow"""
import json
import secrets
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import DonorApplication, UserRole
from app.schemas import DonorApplicationCreate
from app.services.user_service import UserService
from app.services.donor_service import DonorService
from app.services.audit_service import AuditService
from app.schemas import DonorCreate


class DonorApplicationService:
    """Service layer for donor application operations"""

    @staticmethod
    def create_application(
        db: Session,
        application_data: DonorApplicationCreate,
        ip_address: str | None = None,
    ) -> DonorApplication:
        """Create a new donor application"""
        application = DonorApplication(
            full_name=application_data.full_name,
            email=application_data.email,
            phone=application_data.phone,
            address=application_data.address,
            blood_type=application_data.blood_type,
            age=application_data.age,
            weight=application_data.weight,
            questionnaire_answers=json.dumps(application_data.questionnaire_answers, default=str),
            status="pending",
        )
        db.add(application)
        db.commit()
        db.refresh(application)

        AuditService.log_action(
            db=db,
            user_id=None,
            action="donor_application_submitted",
            entity_type="donor_application",
            entity_id=application.id,
            new_values={
                "full_name": application.full_name,
                "email": application.email,
                "blood_type": str(application.blood_type),
                "status": application.status,
            },
            description=f"Donor application submitted for {application.email}",
            ip_address=ip_address,
        )

        return application

    @staticmethod
    def get_application(db: Session, application_id: int) -> Optional[DonorApplication]:
        return db.query(DonorApplication).filter(DonorApplication.id == application_id).first()

    @staticmethod
    def get_applications(db: Session, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> tuple[List[DonorApplication], int]:
        query = db.query(DonorApplication)
        if status:
            query = query.filter(DonorApplication.status == status)
        total = query.count()
        applications = query.order_by(DonorApplication.created_at.desc()).offset(skip).limit(limit).all()
        return applications, total

    @staticmethod
    def approve_application(
        db: Session,
        application_id: int,
        admin_user_id: int,
        review_notes: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> tuple[DonorApplication, str, str]:
        application = DonorApplicationService.get_application(db, application_id)
        if not application:
            raise ValueError("Donor application not found")
        if application.status != "pending":
            raise ValueError("Only pending applications can be approved")

        existing_user = UserService.get_user_by_email(db, application.email)
        if existing_user:
            raise ValueError("A user with this email already exists")

        existing_donor = DonorService.get_donor_by_email(db, application.email)
        if existing_donor:
            raise ValueError("A donor with this email already exists")

        username = DonorApplicationService._generate_username(application.full_name, application.email)
        temp_password = secrets.token_urlsafe(10)

        user = UserService.create_user(
            db,
            username=username,
            email=application.email,
            password=temp_password,
            role=UserRole.DONOR,
        )

        donor_data = DonorCreate(
            name=application.full_name,
            email=application.email,
            blood_type=application.blood_type,
            age=application.age,
            weight=application.weight,
            last_donation_date=None,
        )
        donor = DonorService.create_donor(
            db, 
            donor_data, 
            user_id=admin_user_id, 
            ip_address=ip_address,
            approval_status="approved"
        )
        
        # Link donor to user
        donor.user_id = user.id
        db.commit()
        db.refresh(donor)

        application.status = "approved"
        application.reviewed_by = admin_user_id
        application.review_notes = review_notes
        application.reviewed_at = datetime.utcnow()
        application.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(application)

        AuditService.log_action(
            db=db,
            user_id=admin_user_id,
            action="donor_application_approved",
            entity_type="donor_application",
            entity_id=application.id,
            new_values={"status": application.status, "review_notes": review_notes, "donor_id": donor.id},
            description=f"Approved donor application for {application.email}",
            ip_address=ip_address,
        )

        return application, username, temp_password

    @staticmethod
    def reject_application(
        db: Session,
        application_id: int,
        admin_user_id: int,
        review_notes: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> DonorApplication:
        application = DonorApplicationService.get_application(db, application_id)
        if not application:
            raise ValueError("Donor application not found")
        if application.status != "pending":
            raise ValueError("Only pending applications can be rejected")

        application.status = "rejected"
        application.reviewed_by = admin_user_id
        application.review_notes = review_notes
        application.reviewed_at = datetime.utcnow()
        application.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(application)

        AuditService.log_action(
            db=db,
            user_id=admin_user_id,
            action="donor_application_rejected",
            entity_type="donor_application",
            entity_id=application.id,
            new_values={"status": application.status, "review_notes": review_notes},
            description=f"Rejected donor application for {application.email}",
            ip_address=ip_address,
        )

        return application

    @staticmethod
    def _generate_username(full_name: str, email: str) -> str:
        base = email.split("@")[0]
        normalized = base.replace(".", "_").replace("-", "_")
        suffix = secrets.token_hex(2)
        return f"{normalized}_{suffix}"