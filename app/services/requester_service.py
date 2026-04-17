"""Service for requester operations"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import Requester, UserRole
from app.schemas import RequesterCreate, RequesterUpdate, RequesterRegister
from app.services.audit_service import AuditService


class RequesterService:
    """Service for requester management"""
    
    @staticmethod
    def register_requester_with_user(
        db: Session,
        requester_data: RequesterRegister,
        ip_address: Optional[str] = None
    ) -> tuple[Requester, int]:
        """
        Register a new requester with a user account.
        
        Returns:
            Tuple of (Requester, User.id)
        """
        from app.services.user_service import UserService
        
        # Check if email or username already exists
        existing_user = UserService.get_user_by_email(db, requester_data.email)
        if existing_user:
            raise ValueError(f"Email {requester_data.email} is already registered")
        
        existing_user = UserService.get_user_by_username(db, requester_data.username)
        if existing_user:
            raise ValueError(f"Username {requester_data.username} is already taken")
        
        existing_requester = db.query(Requester).filter(Requester.email == requester_data.email).first()
        if existing_requester:
            raise ValueError(f"Requester with email {requester_data.email} already exists")
        
        # Create user
        user = UserService.create_user(
            db,
            username=requester_data.username,
            email=requester_data.email,
            password=requester_data.password,
            role=UserRole.REQUESTER,
        )
        
        # Create requester linked to user
        db_requester = Requester(
            user_id=user.id,
            name=requester_data.name,
            email=requester_data.email,
            phone=requester_data.phone,
            address=requester_data.address,
            blood_type_needed=requester_data.blood_type_needed,
            urgency=requester_data.urgency,
        )
        db.add(db_requester)
        db.commit()
        db.refresh(db_requester)
        
        # Log audit trail
        AuditService.log_action(
            db=db,
            user_id=user.id,
            action="requester_self_registration",
            entity_type="requester",
            entity_id=db_requester.id,
            new_values={
                "name": db_requester.name,
                "email": db_requester.email,
                "blood_type_needed": str(db_requester.blood_type_needed),
                "urgency": db_requester.urgency,
                "user_id": user.id,
            },
            description=f"Requester self-registered: {db_requester.name}",
            ip_address=ip_address,
        )
        
        return db_requester, user.id
    
    @staticmethod
    def create_requester(db: Session, requester: RequesterCreate) -> Requester:
        """Create a new requester"""
        db_requester = Requester(**requester.model_dump())
        db.add(db_requester)
        db.commit()
        db.refresh(db_requester)
        return db_requester
    
    @staticmethod
    def get_requester(db: Session, requester_id: int) -> Optional[Requester]:
        """Get requester by ID"""
        return db.query(Requester).filter(Requester.id == requester_id).first()

    @staticmethod
    def get_requester_by_user_id(db: Session, user_id: int) -> Optional[Requester]:
        """Get requester profile by linked user ID"""
        return db.query(Requester).filter(Requester.user_id == user_id).first()
    
    @staticmethod
    def get_all_requesters(db: Session, skip: int = 0, limit: int = 100) -> List[Requester]:
        """Get all requesters with pagination"""
        return db.query(Requester).offset(skip).limit(limit).all()
    
    @staticmethod
    def create_requester_profile(db: Session, requester_data: RequesterCreate, user_id: int) -> Requester:
        """Create a new requester profile linked to a user"""
        db_requester = Requester(**requester_data.model_dump(), user_id=user_id)
        db.add(db_requester)
        db.commit()
        db.refresh(db_requester)
        return db_requester
    
    @staticmethod
    def update_requester(db: Session, requester_id: int, updates: RequesterUpdate) -> Optional[Requester]:
        """Update requester"""
        db_requester = db.query(Requester).filter(Requester.id == requester_id).first()
        if not db_requester:
            return None
        
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_requester, field, value)
        
        db.commit()
        db.refresh(db_requester)
        return db_requester
    
    @staticmethod
    def delete_requester(db: Session, requester_id: int) -> bool:
        """Delete requester"""
        db_requester = db.query(Requester).filter(Requester.id == requester_id).first()
        if not db_requester:
            return False
        
        db.delete(db_requester)
        db.commit()
        return True
    
    @staticmethod
    def search_requesters(
        db: Session,
        name: Optional[str] = None,
        blood_type_needed: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Requester]:
        """Search requesters"""
        query = db.query(Requester)
        
        if name:
            query = query.filter(Requester.name.ilike(f"%{name}%"))
        
        if blood_type_needed:
            query = query.filter(Requester.blood_type_needed == blood_type_needed)
        
        return query.offset(skip).limit(limit).all()