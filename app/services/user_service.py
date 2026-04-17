"""Service for user-related operations"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import User, UserRole
from app.schemas import UserRegister, UserResponse, UserUpdate
from app.core.security import SecurityService


class UserService:
    """Service layer for user operations"""

    @staticmethod
    def create_user(
        db: Session,
        username: str,
        email: str,
        password: str,
        role: UserRole = UserRole.STAFF,
    ) -> User:
        """Create a new user"""
        try:
            hashed_password = SecurityService.hash_password(password)
            user = User(
                username=username,
                email=email,
                hashed_password=hashed_password,
                role=role,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError:
            db.rollback()
            # Check which field caused the error
            if "username" in str(IntegrityError):
                raise ValueError(f"Username '{username}' already exists")
            elif "email" in str(IntegrityError):
                raise ValueError(f"Email '{email}' already exists")
            raise ValueError("User with these credentials already exists")

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get a user by username"""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get a user by email"""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get a user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """
        Authenticate a user.
        
        Args:
            db: Database session
            username: Username or email
            password: Password to verify
            
        Returns:
            User if authenticated, None otherwise
        """
        # Try to get user by username or email
        user = UserService.get_user_by_username(db, username)
        if not user:
            user = UserService.get_user_by_email(db, username)
        
        if not user or not user.is_active:
            return None
        
        # Verify password
        if not SecurityService.verify_password(password, user.hashed_password):
            return None
        
        return user

    @staticmethod
    def register_user(db: Session, user_data: UserRegister) -> User:
        """Register a new user"""
        return UserService.create_user(
            db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            role=UserRole.STAFF,  # Default role for new registrations
        )

    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100):
        """Return paginated list of users"""
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def update_user(db: Session, user_id: int, updates: UserUpdate) -> Optional[User]:
        """Update user fields"""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            return None

        update_data = updates.model_dump(exclude_unset=True)
        if update_data.get("password"):
            update_data["hashed_password"] = SecurityService.hash_password(update_data.pop("password"))

        for field, value in update_data.items():
            setattr(user, field, value)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def deactivate_user(db: Session, user_id: int) -> Optional[User]:
        """Deactivate a user (soft delete)"""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            return None
        
        user.is_active = False
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def activate_user(db: Session, user_id: int) -> Optional[User]:
        """Activate a user"""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            return None

        user.is_active = True
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete a user permanently"""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            return False
        db.delete(user)
        db.commit()
        return True

