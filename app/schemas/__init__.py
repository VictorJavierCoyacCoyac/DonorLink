"""Pydantic schemas for request/response validation"""
import json
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict
from app.models import BloodType, UserRole


# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================


class UserRegister(BaseModel):
    """Schema for user registration"""
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")
    
    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username: alphanumeric and underscore only"""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must contain only letters, numbers, hyphens, and underscores")
        return v
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        return v
    

class UserLogin(BaseModel):
    """Schema for user login"""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")


class PasswordChangeRequest(BaseModel):
    """Schema for password change request"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La nueva contraseña debe tener al menos 8 caracteres")
        if not any(char.isupper() for char in v):
            raise ValueError("La nueva contraseña debe contener al menos una letra mayúscula")
        if not any(char.isdigit() for char in v):
            raise ValueError("La nueva contraseña debe contener al menos un número")
        return v


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Schema for token refresh"""
    refresh_token: str


class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CurrentUser(BaseModel):
    """Schema for current user information"""
    id: int
    username: str
    email: str
    role: UserRole
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")
    role: UserRole = Field(default=UserRole.STAFF, description="Role of the new user")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    """Schema for updating an existing user"""
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserListResponse(BaseModel):
    """Schema for paginated list of users"""
    users: List[UserResponse]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True


# ============================================================================
# SYSTEM CONFIGURATION SCHEMAS
# ============================================================================


class SystemConfigBase(BaseModel):
    """Base system configuration schema"""
    key: str = Field(..., min_length=1, max_length=100, description="Configuration key")
    value: str = Field(..., max_length=1000, description="Configuration value")
    description: Optional[str] = Field(None, max_length=500, description="Configuration description")


class SystemConfigCreate(SystemConfigBase):
    """Schema for creating a system configuration"""
    pass


class SystemConfigUpdate(BaseModel):
    """Schema for updating a system configuration"""
    value: Optional[str] = Field(None, max_length=1000)
    description: Optional[str] = Field(None, max_length=500)


class SystemConfigResponse(SystemConfigBase):
    """Schema for system configuration response"""
    id: int
    modified_by: Optional[int] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemConfigListResponse(BaseModel):
    """Schema for list of system configurations"""
    configs: List[SystemConfigResponse]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True


class MetricsResponse(BaseModel):
    """Schema for admin monitoring metrics"""
    total_users: int
    active_users: int
    total_donors: int
    total_requesters: int
    total_donations: int
    total_messages: int
    total_audit_logs: int
    system_status: str

    class Config:
        from_attributes = True


# ============================================================================
# DONOR SCHEMAS
# ============================================================================


class DonorBase(BaseModel):
    """Base donor schema with common fields"""
    name: str = Field(..., min_length=2, max_length=255, description="Donor full name")
    email: EmailStr = Field(..., description="Valid email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    address: Optional[str] = Field(None, max_length=500, description="Address")
    blood_type: BloodType = Field(..., description="Blood type (O-, O+, A-, A+, B-, B+, AB-, AB+)")
    age: int = Field(..., ge=18, le=120, description="Age between 18 and 120")
    weight: float = Field(..., ge=50, le=200, description="Weight in kg, minimum 50kg")
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate donor name"""
        if not v.replace(" ", "").replace("-", "").isalpha():
            raise ValueError("Donor name must contain only letters, spaces, and hyphens")
        return v.strip()
    
    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        """Validate donor age"""
        if v < 18:
            raise ValueError("Donor must be at least 18 years old")
        if v > 120:
            raise ValueError("Invalid age")
        return v
    
    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: float) -> float:
        """Validate donor weight"""
        if v < 50:
            raise ValueError("Donor weight must be at least 50 kg")
        if v > 200:
            raise ValueError("Invalid weight")
        return v


class DonorCreate(DonorBase):
    """Schema for creating a new donor"""
    last_donation_date: Optional[datetime] = Field(None, description="Date of last donation")
    
    @field_validator("last_donation_date")
    @classmethod
    def validate_last_donation_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Validate that last donation date is not in the future"""
        if v and v > datetime.utcnow():
            raise ValueError("Last donation date cannot be in the future")
        return v


class DonorUpdate(BaseModel):
    """Schema for updating a donor"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    blood_type: Optional[BloodType] = None
    age: Optional[int] = Field(None, ge=18, le=120)
    weight: Optional[float] = Field(None, ge=50, le=200)
    last_donation_date: Optional[datetime] = None
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate donor name"""
        if v is None:
            return v
        if not v.replace(" ", "").replace("-", "").isalpha():
            raise ValueError("Donor name must contain only letters, spaces, and hyphens")
        return v.strip()
    
    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        """Validate donor age"""
        if v is None:
            return v
        if v < 18:
            raise ValueError("Donor must be at least 18 years old")
        return v
    
    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: Optional[float]) -> Optional[float]:
        """Validate donor weight"""
        if v is None:
            return v
        if v < 50:
            raise ValueError("Donor weight must be at least 50 kg")
        return v
    
    @field_validator("last_donation_date")
    @classmethod
    def validate_last_donation_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Validate that last donation date is not in the future"""
        if v and v > datetime.utcnow():
            raise ValueError("Last donation date cannot be in the future")
        return v


class DonorResponse(DonorBase):
    """Schema for donor response"""
    id: int
    last_donation_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DonationCreate(BaseModel):
    """Schema for registering a new donation"""
    volume_ml: float = Field(default=450.0, gt=0, le=500, description="Volume in ml (standard: 450ml)")
    
    @field_validator("volume_ml")
    @classmethod
    def validate_volume(cls, v: float) -> float:
        """Validate donation volume"""
        if v <= 0:
            raise ValueError("Donation volume must be greater than 0")
        if v > 500:
            raise ValueError("Donation volume cannot exceed 500ml")
        if v < 350:
            raise ValueError("Minimum donation volume is 350ml")
        return v


class DonationResponse(BaseModel):
    """Schema for donation response"""
    id: int
    donor_id: int
    donation_date: datetime
    volume_ml: float
    created_at: datetime

    class Config:
        from_attributes = True


class EligibilityResponse(BaseModel):
    """Schema for eligibility check response"""
    is_eligible: bool
    reasons: list[str] = Field(default_factory=list, description="List of reasons if not eligible")
    days_until_eligible: Optional[int] = Field(None, description="Days until eligible again")


# ============================================================================
# ADVANCED SEARCH/FILTER SCHEMAS
# ============================================================================


class DonorFilterParams(BaseModel):
    """Schema for advanced donor search and filtering"""
    name: Optional[str] = Field(None, description="Search by donor name (partial match)")
    email: Optional[str] = Field(None, description="Search by email (partial match)")
    blood_type: Optional[BloodType] = Field(None, description="Filter by blood type")
    min_age: Optional[int] = Field(None, ge=18, le=120, description="Minimum age")
    max_age: Optional[int] = Field(None, ge=18, le=120, description="Maximum age")
    min_weight: Optional[float] = Field(None, ge=50, description="Minimum weight in kg")
    max_weight: Optional[float] = Field(None, le=200, description="Maximum weight in kg")
    is_eligible: Optional[bool] = Field(None, description="Filter by eligibility status")
    donated_after: Optional[datetime] = Field(None, description="Donated after this date")
    donated_before: Optional[datetime] = Field(None, description="Donated before this date")
    never_donated: Optional[bool] = Field(None, description="Filter donors who never donated")
    sort_by: Optional[str] = Field(
        "name",
        description="Sort field: name, age, weight, last_donation_date, created_at"
    )
    sort_order: Optional[str] = Field("asc", description="Sort order: asc or desc")
    
    @field_validator("min_age", "max_age")
    @classmethod
    def validate_age_range(cls, v: Optional[int]) -> Optional[int]:
        """Validate age range values"""
        if v is not None and (v < 18 or v > 120):
            raise ValueError("Age must be between 18 and 120")
        return v
    
    @field_validator("min_weight", "max_weight")
    @classmethod
    def validate_weight_range(cls, v: Optional[float]) -> Optional[float]:
        """Validate weight range values"""
        if v is not None and v < 50:
            raise ValueError("Weight must be at least 50 kg")
        return v
    
    @field_validator("sort_by")
    @classmethod
    def validate_sort_by(cls, v: Optional[str]) -> Optional[str]:
        """Validate sort field"""
        if v is not None:
            valid_fields = ["name", "age", "weight", "last_donation_date", "created_at"]
            if v not in valid_fields:
                raise ValueError(f"sort_by must be one of: {', '.join(valid_fields)}")
        return v
    
    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v: Optional[str]) -> Optional[str]:
        """Validate sort order"""
        if v is not None and v not in ["asc", "desc"]:
            raise ValueError("sort_order must be 'asc' or 'desc'")
        return v
    
    @field_validator("donated_before")
    @classmethod
    def validate_dates_order(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """Validate that donated_before is after donated_after"""
        if v and info.data.get("donated_after"):
            if v < info.data["donated_after"]:
                raise ValueError("donated_before must be after donated_after")
        return v
    
    class Config:
        from_attributes = True


class DonorSearchResponse(BaseModel):
    """Schema for paginated donor search results"""
    donors: List[DonorResponse]
    total: int
    skip: int
    limit: int
    
    class Config:
        from_attributes = True


# ============================================================================
# AUDIT LOG SCHEMAS
# ============================================================================


class AuditLogResponse(BaseModel):
    """Schema for audit log response"""
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: int
    old_values: Optional[str] = None  # JSON string
    new_values: Optional[str] = None  # JSON string
    description: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Schema for paginated audit log list"""
    logs: List[AuditLogResponse]
    total: int
    skip: int
    limit: int
    
    class Config:
        from_attributes = True


# Requester schemas
class RequesterBase(BaseModel):
    """Base requester schema"""
    name: str = Field(..., min_length=2, max_length=255, description="Requester full name")
    email: EmailStr = Field(..., description="Valid email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    address: Optional[str] = Field(None, max_length=500, description="Address")
    blood_type_needed: BloodType = Field(..., description="Blood type needed")
    urgency: Optional[str] = Field(None, max_length=50, description="Urgency level")


class RequesterCreate(RequesterBase):
    """Schema for creating a requester"""
    pass


class RequesterRegister(RequesterBase):
    """Schema for registering a requester user"""
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    password: str = Field(..., min_length=8, description="Password")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must contain only letters, numbers, hyphens, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        return v


class RequesterUpdate(BaseModel):
    """Schema for updating a requester"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    blood_type_needed: Optional[BloodType] = None
    urgency: Optional[str] = Field(None, max_length=50)


class RequesterResponse(RequesterBase):
    """Schema for requester response"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DonorApplicationCreate(BaseModel):
    """Schema for anonymous donor application"""
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name")
    email: EmailStr = Field(..., description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    address: Optional[str] = Field(None, max_length=500, description="Address")
    blood_type: BloodType = Field(..., description="Blood type")
    age: int = Field(..., ge=18, le=120, description="Age")
    weight: float = Field(..., ge=50, le=200, description="Weight in kg")
    questionnaire_answers: Dict[str, str] = Field(default_factory=dict, description="Questionnaire answers")


class DonorApplicationResponse(DonorApplicationCreate):
    """Schema for donor application response"""
    id: int
    status: str
    reviewed_by: Optional[int] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reviewed_at: Optional[datetime] = None

    @field_validator("questionnaire_answers", mode="before")
    @classmethod
    def parse_questionnaire_answers(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value

    class Config:
        from_attributes = True


class DonorApplicationListResponse(BaseModel):
    """Schema for paginated donor application list"""
    applications: List[DonorApplicationResponse]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True


class DonorApplicationApprovalResponse(BaseModel):
    """Schema for donor application approval response"""
    application: DonorApplicationResponse
    username: str
    temporary_password: str

    class Config:
        from_attributes = True


class DonorApplicationReview(BaseModel):
    """Schema for reviewing a donor application"""
    review_notes: Optional[str] = Field(None, description="Optional notes for approval/rejection")


class DonorRegister(DonorBase):
    """Schema for donor self-registration with account creation"""
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    password: str = Field(..., min_length=8, description="Password")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username: alphanumeric and underscore only"""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must contain only letters, numbers, hyphens, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        return v


class DonorQuestionnaireCreate(BaseModel):
    """Schema for creating a donor questionnaire item"""
    question_text: str = Field(..., max_length=1000, description="Question text")
    question_type: str = Field(..., description="Question type (text, yes_no, number, select)")
    is_active: Optional[bool] = Field(True, description="Whether this question is active")
    sort_order: Optional[int] = Field(1, ge=1, description="Sort order")


class DonorQuestionnaireResponse(DonorQuestionnaireCreate):
    """Schema for donor questionnaire response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DonationRequestCreate(BaseModel):
    """Schema for creating a donation request"""
    donor_id: int = Field(..., description="Donor ID")
    reason: Optional[str] = Field(None, max_length=1000, description="Reason for requesting donation")
    urgency: Optional[str] = Field(None, max_length=50, description="Urgency level")


class DonationRequestResponse(DonationRequestCreate):
    """Schema for donation request response"""
    id: int
    requester_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Message schemas
class MessageBase(BaseModel):
    """Base message schema"""
    sender_id: int = Field(..., description="Sender ID")
    receiver_id: int = Field(..., description="Receiver ID")
    sender_type: str = Field(..., description="Sender type: 'donor' or 'requester'")
    receiver_type: str = Field(..., description="Receiver type: 'donor' or 'requester'")
    content: str = Field(..., max_length=1000, description="Message content")


class MessageCreate(MessageBase):
    """Schema for creating a message"""
    pass


class MessageResponse(MessageBase):
    """Schema for message response"""
    id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """Schema for message list"""
    messages: List[MessageResponse]
    
    class Config:
        from_attributes = True
