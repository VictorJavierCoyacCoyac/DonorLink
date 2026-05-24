"""Service for donor-related operations"""
from typing import Optional, List
from datetime import datetime
import json
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, func
from app.models import Donor, Donation, BloodType, UserRole
from app.schemas import DonorCreate, DonorUpdate, DonorFilterParams, DonorRegister
from app.services.audit_service import AuditService
from app.utils.audit_helper import get_model_changes


class DonorService:
    """Service layer for donor operations"""
    
    @staticmethod
    def register_donor_with_user(
        db: Session,
        donor_data: DonorRegister,
        ip_address: Optional[str] = None
    ) -> tuple[Donor, int]:
        """
        Register a new donor with a user account.
        
        Returns:
            Tuple of (Donor, User.id)
        """
        from app.services.user_service import UserService
        
        # Check if email or username already exists
        existing_user = UserService.get_user_by_email(db, donor_data.email)
        if existing_user:
            raise ValueError(f"Email {donor_data.email} is already registered")
        
        existing_user = UserService.get_user_by_username(db, donor_data.username)
        if existing_user:
            raise ValueError(f"Username {donor_data.username} is already taken")
        
        existing_donor = DonorService.get_donor_by_email(db, donor_data.email)
        if existing_donor:
            raise ValueError(f"Donor with email {donor_data.email} already exists")
        
        # Create user
        user = UserService.create_user(
            db,
            username=donor_data.username,
            email=donor_data.email,
            password=donor_data.password,
            role=UserRole.DONOR,
        )
        
        # Create donor linked to user
        donor = Donor(
            user_id=user.id,
            name=donor_data.name,
            email=donor_data.email,
            phone=donor_data.phone,
            address=donor_data.address,
            blood_type=donor_data.blood_type,
            age=donor_data.age,
            weight=donor_data.weight,
            questionnaire_answers=json.dumps(donor_data.questionnaire_answers, default=str) if donor_data.questionnaire_answers else None,
            approval_status="pending",  # Requires admin approval
        )
        db.add(donor)
        db.commit()
        db.refresh(donor)
        
        # Log audit trail
        AuditService.log_action(
            db=db,
            user_id=user.id,
            action="donor_self_registration",
            entity_type="donor",
            entity_id=donor.id,
            new_values={
                "name": donor.name,
                "email": donor.email,
                "blood_type": str(donor.blood_type),
                "age": donor.age,
                "weight": donor.weight,
                "approval_status": donor.approval_status,
                "user_id": user.id,
            },
            description=f"Donor self-registered: {donor.name}",
            ip_address=ip_address,
        )
        
        return donor, user.id
    
    @staticmethod
    def create_donor(db: Session, donor_data: DonorCreate, user_id: Optional[int] = None, ip_address: Optional[str] = None, approval_status: str = "pending") -> Donor:
        """Create a new donor"""
        try:
            donor = Donor(
                user_id=user_id,
                name=donor_data.name,
                email=donor_data.email,
                blood_type=donor_data.blood_type,
                age=donor_data.age,
                weight=donor_data.weight,
                last_donation_date=donor_data.last_donation_date,
                approval_status=approval_status,
            )
            db.add(donor)
            db.commit()
            db.refresh(donor)
            
            # Log audit trail
            AuditService.log_action(
                db=db,
                user_id=user_id,
                action="create",
                entity_type="donor",
                entity_id=donor.id,
                new_values={
                    "name": donor.name,
                    "email": donor.email,
                    "blood_type": str(donor.blood_type),
                    "age": donor.age,
                    "weight": donor.weight,
                    "approval_status": donor.approval_status,
                    "user_id": user_id,
                },
                description=f"Created donor: {donor.name}",
                ip_address=ip_address,
            )
            
            return donor
        except IntegrityError:
            db.rollback()
            raise ValueError(f"Donor with email {donor_data.email} already exists")
    
    @staticmethod
    def get_donor(db: Session, donor_id: int) -> Optional[Donor]:
        """Get a donor by ID"""
        return db.query(Donor).filter(Donor.id == donor_id).first()
    
    @staticmethod
    def get_donor_by_email(db: Session, email: str) -> Optional[Donor]:
        """Get a donor by email"""
        return db.query(Donor).filter(Donor.email == email).first()
    
    @staticmethod
    def get_donor_by_user_id(db: Session, user_id: int) -> Optional[Donor]:
        """Get a donor by user ID"""
        return db.query(Donor).filter(Donor.user_id == user_id).first()
    
    @staticmethod
    def get_all_donors(db: Session, skip: int = 0, limit: int = 100) -> List[Donor]:
        """Get all donors with pagination"""
        return db.query(Donor).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_donor(db: Session, donor_id: int, donor_data: DonorUpdate, user_id: Optional[int] = None, ip_address: Optional[str] = None) -> Optional[Donor]:
        """Update a donor"""
        donor = DonorService.get_donor(db, donor_id)
        if not donor:
            return None
        
        # Capture old values before update
        old_donor = Donor(
            id=donor.id,
            name=donor.name,
            email=donor.email,
            blood_type=donor.blood_type,
            age=donor.age,
            weight=donor.weight,
            last_donation_date=donor.last_donation_date,
        )
        
        update_data = donor_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(donor, field, value)
        
        try:
            db.commit()
            db.refresh(donor)
            
            # Log audit trail
            old_values, new_values = get_model_changes(old_donor, donor)
            if old_values or new_values:
                AuditService.log_action(
                    db=db,
                    user_id=user_id,
                    action="update",
                    entity_type="donor",
                    entity_id=donor.id,
                    old_values=old_values if old_values else None,
                    new_values=new_values if new_values else None,
                    description=f"Updated donor: {donor.name}",
                    ip_address=ip_address,
                )
            
            return donor
        except IntegrityError:
            db.rollback()
            raise ValueError(f"Email already in use")
    
    @staticmethod
    def delete_donor(db: Session, donor_id: int, user_id: Optional[int] = None, ip_address: Optional[str] = None) -> bool:
        """Delete a donor"""
        donor = DonorService.get_donor(db, donor_id)
        if not donor:
            return False
        
        donor_name = donor.name  # Save name for audit log
        
        db.delete(donor)
        db.commit()
        
        # Log audit trail
        AuditService.log_action(
            db=db,
            user_id=user_id,
            action="delete",
            entity_type="donor",
            entity_id=donor_id,
            old_values={
                "name": donor_name,
            },
            description=f"Deleted donor: {donor_name}",
            ip_address=ip_address,
        )
        
        return True
    
    @staticmethod
    def approve_donor(db: Session, donor_id: int, admin_user_id: Optional[int] = None, ip_address: Optional[str] = None) -> Optional[Donor]:
        """Approve a pending donor (make them visible to requesters)"""
        donor = DonorService.get_donor(db, donor_id)
        if not donor:
            return None
        
        if donor.approval_status == "approved":
            raise ValueError("Donor is already approved")
        
        donor.approval_status = "approved"
        db.commit()
        db.refresh(donor)
        
        # Log audit trail
        AuditService.log_action(
            db=db,
            user_id=admin_user_id,
            action="approve_donor",
            entity_type="donor",
            entity_id=donor_id,
            new_values={"approval_status": donor.approval_status},
            description=f"Approved donor: {donor.name}",
            ip_address=ip_address,
        )
        
        return donor
    
    @staticmethod
    def reject_donor(db: Session, donor_id: int, admin_user_id: Optional[int] = None, ip_address: Optional[str] = None) -> Optional[Donor]:
        """Reject a pending donor"""
        donor = DonorService.get_donor(db, donor_id)
        if not donor:
            return None
        
        if donor.approval_status != "pending":
            raise ValueError("Only pending donors can be rejected")
        
        donor.approval_status = "rejected"
        db.commit()
        db.refresh(donor)
        
        # Log audit trail
        AuditService.log_action(
            db=db,
            user_id=admin_user_id,
            action="reject_donor",
            entity_type="donor",
            entity_id=donor_id,
            new_values={"approval_status": donor.approval_status},
            description=f"Rejected donor: {donor.name}",
            ip_address=ip_address,
        )
        
        return donor
    
    @staticmethod
    def register_donation(db: Session, donor_id: int, volume_ml: float = 450.0, user_id: Optional[int] = None, ip_address: Optional[str] = None) -> Optional[Donation]:
        """Register a donation for a donor"""
        donor = DonorService.get_donor(db, donor_id)
        if not donor:
            return None
        
        from datetime import datetime
        donation = Donation(
            donor_id=donor_id,
            volume_ml=volume_ml,
            donation_date=datetime.utcnow(),
        )
        donor.last_donation_date = donation.donation_date
        donor.last_donation_volume_ml = volume_ml

        db.add(donation)
        db.commit()
        db.refresh(donation)
        
        # Log audit trail
        AuditService.log_action(
            db=db,
            user_id=user_id,
            action="create",
            entity_type="donation",
            entity_id=donation.id,
            new_values={
                "donor_id": donor_id,
                "volume_ml": volume_ml,
                "donation_date": str(donation.donation_date),
            },
            description=f"Registered donation for donor {donor_id}: {volume_ml}ml",
            ip_address=ip_address,
        )
        
        return donation
    
    @staticmethod
    def get_donor_donations(db: Session, donor_id: int) -> List[Donation]:
        """Get all donations for a donor"""
        return db.query(Donation).filter(Donation.donor_id == donor_id).all()
    
    @staticmethod
    def search_donors(
        db: Session,
        filters: DonorFilterParams,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[Donor], int]:
        """
        Search and filter donors with advanced criteria.
        
        Only returns approved donors (visible to requesters).
        
        Returns:
            Tuple of (donors list, total count)
        """
        # Start with base query - only include approved donors
        query = db.query(Donor).filter(Donor.approval_status == "approved")
        
        # Apply text filters
        conditions = []
        
        if filters.name:
            conditions.append(Donor.name.ilike(f"%{filters.name}%"))
        
        if filters.email:
            conditions.append(Donor.email.ilike(f"%{filters.email}%"))
        
        if filters.blood_type:
            conditions.append(Donor.blood_type == filters.blood_type)
        
        # Apply age filters
        if filters.min_age is not None:
            conditions.append(Donor.age >= filters.min_age)
        
        if filters.max_age is not None:
            conditions.append(Donor.age <= filters.max_age)
        
        # Apply weight filters
        if filters.min_weight is not None:
            conditions.append(Donor.weight >= filters.min_weight)
        
        if filters.max_weight is not None:
            conditions.append(Donor.weight <= filters.max_weight)
        
        # Apply donation date filters
        if filters.donated_after:
            conditions.append(Donor.last_donation_date >= filters.donated_after)
        
        if filters.donated_before:
            conditions.append(Donor.last_donation_date <= filters.donated_before)
        
        # Apply "never donated" filter
        if filters.never_donated is not None:
            if filters.never_donated:
                conditions.append(Donor.last_donation_date.is_(None))
            else:
                conditions.append(Donor.last_donation_date.isnot(None))
        
        # Combine all conditions with AND
        if conditions:
            query = query.filter(and_(*conditions))
        
        # Apply eligibility filter if requested
        if filters.is_eligible is not None:
            from app.services import EligibilityService
            # Import here to avoid circular imports
            # Note: This is a simplified implementation
            # For production, consider moving eligibility checks to the database
            eligible_donor_ids = []
            all_donors = query.all()
            for donor in all_donors:
                eligibility = EligibilityService.check_eligibility(donor)
                if eligibility["is_eligible"] == filters.is_eligible:
                    eligible_donor_ids.append(donor.id)
            
            if eligible_donor_ids:
                query = query.filter(Donor.id.in_(eligible_donor_ids))
            else:
                # Return empty if no eligible donors match
                return [], 0
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        sort_field = "name"  # default
        if filters.sort_by and filters.sort_by in ["name", "age", "weight", "last_donation_date", "created_at"]:
            sort_field = filters.sort_by
        
        # Get sort column
        sort_column = getattr(Donor, sort_field, Donor.name)
        
        if filters.sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Apply pagination
        donors = query.offset(skip).limit(limit).all()
        
        return donors, total_count
