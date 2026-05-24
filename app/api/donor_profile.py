"""Self-service endpoints for authenticated donors"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole, Donor, Donation
from app.schemas import DonorResponse, DonationResponse, CurrentUser
from app.services.donor_service import DonorService
from app.services import EligibilityService
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1/donor", tags=["donor-profile"])

DONATION_INTERVAL_DAYS = 56


class DonorSelfUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    weight: Optional[float] = Field(None, ge=50, le=200)


class EligibilityDetail(BaseModel):
    is_eligible: bool
    days_until_eligible: Optional[int]
    next_eligible_date: Optional[str]
    last_donation_date: Optional[str]
    reasons: List[str]


def _get_donor(db: Session, user_id: int) -> Donor:
    donor = DonorService.get_donor_by_user_id(db, user_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Perfil de donante no encontrado")
    return donor


@router.get("/profile", response_model=DonorResponse)
@limiter.limit("60/minute")
def get_own_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    return _get_donor(db, current_user.id)


@router.patch("/profile", response_model=DonorResponse)
@limiter.limit("10/minute")
def update_own_profile(
    body: DonorSelfUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    donor = _get_donor(db, current_user.id)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(donor, field, value)
    donor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(donor)
    return donor


@router.get("/donations", response_model=List[DonationResponse])
@limiter.limit("30/minute")
def get_own_donations(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    donor = _get_donor(db, current_user.id)
    return (
        db.query(Donation)
        .filter(Donation.donor_id == donor.id)
        .order_by(Donation.donation_date.desc())
        .all()
    )


@router.get("/eligibility", response_model=EligibilityDetail)
@limiter.limit("30/minute")
def get_own_eligibility(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    donor = _get_donor(db, current_user.id)
    result = EligibilityService.check_eligibility(donor)

    next_date = None
    if donor.last_donation_date and result.get("days_until_eligible"):
        next_date = (donor.last_donation_date + timedelta(days=DONATION_INTERVAL_DAYS)).strftime("%Y-%m-%d")

    return EligibilityDetail(
        is_eligible=result["is_eligible"],
        days_until_eligible=result.get("days_until_eligible"),
        next_eligible_date=next_date,
        last_donation_date=donor.last_donation_date.strftime("%Y-%m-%d") if donor.last_donation_date else None,
        reasons=result.get("reasons", []),
    )
