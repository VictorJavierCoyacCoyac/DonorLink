"""API endpoints for requester access and donor search"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole, BloodType
from app.schemas import (
    CurrentUser,
    RequesterRegister,
    RequesterCreate,
    RequesterResponse,
    DonorFilterParams,
    DonorSearchResponse,
    DonorResponse,
    DonationRequestCreate,
    DonationRequestResponse,
)


class RequesterSelfUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    blood_type_needed: Optional[BloodType] = None
    urgency: Optional[str] = Field(None, max_length=50)
from app.services.user_service import UserService
from app.services.requester_service import RequesterService
from app.services.donor_service import DonorService
from app.services.donation_request_service import DonationRequestService
from app.services.audit_service import AuditService
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1/requester", tags=["requester"])


@router.post("/register", response_model=RequesterResponse, status_code=201)
@limiter.limit("5/minute")
def register_requester(
    requester_data: RequesterRegister,
    request: Request,
    db: Session = Depends(get_db),
):
    """Register a requester user"""
    if UserService.get_user_by_username(db, requester_data.username) or UserService.get_user_by_email(db, requester_data.email):
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = UserService.create_user(
        db,
        username=requester_data.username,
        email=requester_data.email,
        password=requester_data.password,
        role=UserRole.REQUESTER,
    )

    profile = RequesterService.create_requester_profile(
        db,
        RequesterCreate(
            name=requester_data.name,
            email=requester_data.email,
            phone=requester_data.phone,
            address=requester_data.address,
            blood_type_needed=requester_data.blood_type_needed,
            urgency=requester_data.urgency,
        ),
        user_id=user.id,
    )

    AuditService.log_action(
        db=db,
        user_id=user.id,
        action="requester_registered",
        entity_type="requester",
        entity_id=profile.id,
        new_values={"name": profile.name, "email": profile.email, "blood_type_needed": str(profile.blood_type_needed)},
        description=f"Created requester account for {profile.name}",
        ip_address=get_client_ip(request),
    )

    return profile


@router.get("/donors", response_model=DonorSearchResponse)
@limiter.limit("30/minute")
def search_donors_for_requester(
    request: Request,
    filters: DonorFilterParams = Depends(),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    donors, total = DonorService.search_donors(db, filters, skip=skip, limit=limit)
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="donor_search",
        entity_type="donor",
        entity_id=0,
        new_values=filters.model_dump(exclude_none=True),
        description="Requester searched donors",
    )
    return DonorSearchResponse(donors=donors, total=total, skip=skip, limit=limit)


@router.get("/donors/{donor_id}", response_model=DonorResponse)
@limiter.limit("30/minute")
def get_donor_detail(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    donor = DonorService.get_donor(db, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    if donor.approval_status != "approved":
        raise HTTPException(status_code=404, detail="Donor not found (not approved yet)")
    
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="donor_viewed",
        entity_type="donor",
        entity_id=donor_id,
        description=f"Requester viewed donor {donor_id}",
    )
    return donor


@router.post("/requests", response_model=DonationRequestResponse, status_code=201)
@limiter.limit("10/minute")
def create_donation_request(
    request_data: DonationRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    profile = RequesterService.get_requester_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=400, detail="Requester profile not found")

    donor = DonorService.get_donor(db, request_data.donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    donation_request = DonationRequestService.create_request(db, profile.id, request_data)
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="donation_request_created",
        entity_type="donation_request",
        entity_id=donation_request.id,
        new_values=request_data.model_dump(),
        description=f"Requester created donation request to donor {request_data.donor_id}",
        ip_address=get_client_ip(request),
    )
    return donation_request


@router.get("/requests", response_model=List[DonationRequestResponse])
@limiter.limit("30/minute")
def list_my_requests(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    profile = RequesterService.get_requester_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=400, detail="Requester profile not found")
    return DonationRequestService.get_requests_by_requester(db, profile.id, skip=skip, limit=limit)


@router.get("/profile", response_model=RequesterResponse)
@limiter.limit("30/minute")
def get_own_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    profile = RequesterService.get_requester_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de solicitante no encontrado")
    return profile


@router.patch("/profile", response_model=RequesterResponse)
@limiter.limit("10/minute")
def update_own_profile(
    body: RequesterSelfUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    from app.models import Requester, User
    profile = RequesterService.get_requester_by_user_id(db, current_user.id)
    if not profile:
        # Profile was never created (e.g. registration failed mid-way) — create it now
        user = db.query(User).filter(User.id == current_user.id).first()
        update_data = body.model_dump(exclude_unset=True)
        if not update_data.get("blood_type_needed"):
            raise HTTPException(
                status_code=400,
                detail="Es necesario especificar el tipo de sangre para crear el perfil.",
            )
        profile = Requester(
            user_id=current_user.id,
            name=update_data.get("name", user.username),
            email=user.email,
            phone=update_data.get("phone"),
            address=update_data.get("address"),
            blood_type_needed=update_data.get("blood_type_needed"),
            urgency=update_data.get("urgency", "normal"),
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile
