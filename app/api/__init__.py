"""API routes for donor management"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List

from app.api.dependencies import get_db, get_current_user, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole
from app.schemas import (
    DonorCreate,
    DonorUpdate,
    DonorResponse,
    DonationCreate,
    DonationResponse,
    EligibilityResponse,
    CurrentUser,
    DonorFilterParams,
    DonorSearchResponse,
)
from app.services.donor_service import DonorService
from app.services import EligibilityService
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1", tags=["donors"])


# ============================================================================
# DONOR MANAGEMENT ENDPOINTS (PROTECTED)
# ============================================================================


@router.post("/donors", response_model=DonorResponse, status_code=201)
@limiter.limit("10/minute")
def create_donor(
    donor: DonorCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Create a new donor (requires ADMIN or STAFF role)"""
    try:
        ip_address = get_client_ip(request)
        return DonorService.create_donor(db, donor, user_id=current_user.id, ip_address=ip_address)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/donors/{donor_id}", response_model=DonorResponse)
@limiter.limit("60/minute")
def get_donor(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Get a donor by ID (requires ADMIN or STAFF role)"""
    donor = DonorService.get_donor(db, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    return donor


@router.get("/donors", response_model=List[DonorResponse])
@limiter.limit("30/minute")
def list_donors(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """List all donors with pagination (requires ADMIN or STAFF role)"""
    return DonorService.get_all_donors(db, skip=skip, limit=limit)


@router.post("/donors/search", response_model=DonorSearchResponse)
@limiter.limit("30/minute")
def search_donors(
    filters: DonorFilterParams,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """
    Advanced donor search with filtering, sorting, and pagination.
    
    Supports filtering by:
    - name, email (partial match)
    - blood_type
    - age range (min_age, max_age)
    - weight range (min_weight, max_weight)
    - donation dates (donated_after, donated_before)
    - eligibility status
    - never_donated flag
    
    And sorting by: name, age, weight, last_donation_date, created_at
    """
    donors, total = DonorService.search_donors(db, filters, skip=skip, limit=limit)
    return DonorSearchResponse(
        donors=donors,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.patch("/donors/{donor_id}", response_model=DonorResponse)
@limiter.limit("10/minute")
def update_donor(
    donor_id: int,
    donor: DonorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Update a donor (requires ADMIN or STAFF role)"""
    try:
        ip_address = get_client_ip(request)
        updated_donor = DonorService.update_donor(db, donor_id, donor, user_id=current_user.id, ip_address=ip_address)
        if not updated_donor:
            raise HTTPException(status_code=404, detail="Donor not found")
        return updated_donor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/donors/{donor_id}", status_code=204)
@limiter.limit("5/minute")
def delete_donor(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Delete a donor (requires ADMIN role)"""
    ip_address = get_client_ip(request)
    if not DonorService.delete_donor(db, donor_id, user_id=current_user.id, ip_address=ip_address):
        raise HTTPException(status_code=404, detail="Donor not found")


# ============================================================================
# ELIGIBILITY AND DONATION ENDPOINTS (PROTECTED)
# ============================================================================


@router.get("/donors/{donor_id}/eligibility", response_model=EligibilityResponse)
@limiter.limit("30/minute")
def check_eligibility(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Check if a donor is eligible to donate today (requires ADMIN or STAFF role)"""
    donor = DonorService.get_donor(db, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    eligibility = EligibilityService.check_eligibility(donor)
    return EligibilityResponse(**eligibility)


@router.post("/donors/{donor_id}/donate", response_model=DonationResponse, status_code=201)
@limiter.limit("20/minute")
def register_donation(
    donor_id: int,
    donation: DonationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Register a donation for a donor (requires ADMIN or STAFF role)"""
    # First check eligibility
    donor = DonorService.get_donor(db, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    eligibility = EligibilityService.check_eligibility(donor)
    if not eligibility["is_eligible"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Donor is not eligible to donate",
                "reasons": eligibility["reasons"],
            },
        )
    
    # Register the donation
    ip_address = get_client_ip(request)
    donation_record = DonorService.register_donation(db, donor_id, donation.volume_ml, user_id=current_user.id, ip_address=ip_address)
    return donation_record


@router.get("/donors/{donor_id}/donations", response_model=List[DonationResponse])
@limiter.limit("30/minute")
def get_donor_donations(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Get all donations for a donor (requires ADMIN or STAFF role)"""
    donor = DonorService.get_donor(db, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    return DonorService.get_donor_donations(db, donor_id)


# ============================================================================
# HEALTH CHECK
# ============================================================================


@router.get("/health", tags=["health"])
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "DonorLink API"}
