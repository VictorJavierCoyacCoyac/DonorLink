"""Database models for SQLAlchemy ORM"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Enum as SQLEnum, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()


class BloodType(str, enum.Enum):
    """Valid blood types"""
    O_NEGATIVE = "O-"
    O_POSITIVE = "O+"
    A_NEGATIVE = "A-"
    A_POSITIVE = "A+"
    B_NEGATIVE = "B-"
    B_POSITIVE = "B+"
    AB_NEGATIVE = "AB-"
    AB_POSITIVE = "AB+"


class UserRole(str, enum.Enum):
    """User roles"""
    ADMIN = "admin"
    STAFF = "staff"
    DONOR = "donor"
    REQUESTER = "requester"


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.STAFF)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email}, role={self.role})>"


class Donor(Base):
    """Donor model"""
    __tablename__ = "donors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True, unique=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    blood_type = Column(SQLEnum(BloodType), nullable=False)
    age = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False)  # in kg
    last_donation_date = Column(DateTime, nullable=True)
    last_donation_volume_ml = Column(Float, nullable=True)
    questionnaire_answers = Column(String(5000), nullable=True)
    approval_status = Column(String(50), nullable=False, default="pending", index=True)  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    donations = relationship("Donation", back_populates="donor", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Donor(id={self.id}, name={self.name}, email={self.email}, blood_type={self.blood_type}, approval_status={self.approval_status})>"


class Donation(Base):
    """Donation record model"""
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False, index=True)
    donation_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    volume_ml = Column(Float, nullable=False, default=450.0)  # Standard donation volume
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    donor = relationship("Donor", back_populates="donations")

    def __repr__(self):
        return f"<Donation(id={self.id}, donor_id={self.donor_id}, donation_date={self.donation_date})>"


class SystemConfig(Base):
    """System configuration and admin settings"""
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(String(1000), nullable=False)
    description = Column(String(500), nullable=True)
    modified_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<SystemConfig(id={self.id}, key={self.key}, value={self.value})>"


class Requester(Base):
    """Requester model for people seeking donors"""
    __tablename__ = "requesters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    blood_type_needed = Column(SQLEnum(BloodType), nullable=False)
    urgency = Column(String(50), nullable=True)  # e.g., "urgent", "normal"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Requester(id={self.id}, name={self.name}, email={self.email}, blood_type_needed={self.blood_type_needed})>"


class DonorApplication(Base):
    """Anonymous donor application workflow"""
    __tablename__ = "donor_applications"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    blood_type = Column(SQLEnum(BloodType), nullable=False)
    age = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False)
    questionnaire_answers = Column(String(5000), nullable=True)
    status = Column(String(50), nullable=False, default="pending", index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    review_notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<DonorApplication(id={self.id}, email={self.email}, status={self.status})>"


class DonationRequest(Base):
    """Donation request from a requester to a donor"""
    __tablename__ = "donation_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("requesters.id"), nullable=False, index=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending", index=True)
    reason = Column(String(1000), nullable=True)
    urgency = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<DonationRequest(id={self.id}, requester_id={self.requester_id}, donor_id={self.donor_id}, status={self.status})>"


class DonorQuestionnaire(Base):
    """Questionnaire template for donor applications"""
    __tablename__ = "donor_questionnaires"

    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(String(1000), nullable=False)
    question_type = Column(String(50), nullable=False, default="text")
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    sort_order = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<DonorQuestionnaire(id={self.id}, question_text={self.question_text[:30]}...)>"


class ContactRequest(Base):
    """Contact request from a requester to a donor to establish a chat channel"""
    __tablename__ = "contact_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("requesters.id"), nullable=False, index=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, accepted, rejected
    message = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ContactRequest(id={self.id}, requester_id={self.requester_id}, donor_id={self.donor_id}, status={self.status})>"


class Message(Base):
    """Message model for internal chat between donors and requesters"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    contact_request_id = Column(Integer, ForeignKey("contact_requests.id"), nullable=True, index=True)
    sender_id = Column(Integer, nullable=False, index=True)  # Can be donor or requester id
    receiver_id = Column(Integer, nullable=False, index=True)  # Can be donor or requester id
    sender_type = Column(String(10), nullable=False)  # "donor" or "requester"
    receiver_type = Column(String(10), nullable=False)  # "donor" or "requester"
    content = Column(String(1000), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Message(id={self.id}, sender_id={self.sender_id}, receiver_id={self.receiver_id}, content={self.content[:50]}...)>"


class AuditLog(Base):
    """Audit log model for tracking changes"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    old_values = Column(String(2000), nullable=True)
    new_values = Column(String(2000), nullable=True)
    description = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, action={self.action}, entity_type={self.entity_type}, entity_id={self.entity_id})>"


class Notification(Base):
    """Notification model for donor alerts"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("requesters.id"), nullable=True, index=True)
    notification_type = Column(String(50), nullable=False, index=True)  # "message", "request", "alert", "system"
    title = Column(String(255), nullable=False)
    content = Column(String(1000), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    # Relationships
    donor = relationship("Donor", foreign_keys=[donor_id])
    requester = relationship("Requester", foreign_keys=[requester_id])

    def __repr__(self):
        return f"<Notification(id={self.id}, donor_id={self.donor_id}, type={self.notification_type}, title={self.title[:30]}...)>"


class UserNotification(Base):
    """Universal notification for any user role"""
    __tablename__ = "user_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String(1000), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])


class PasswordResetToken(Base):
    """Password reset token for account recovery"""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
