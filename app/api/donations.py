"""API endpoints for donation requests - accessible by both donors and requesters"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole, DonationRequest, Donor
from app.schemas import DonationRequestResponse, CurrentUser
from app.services.donation_request_service import DonationRequestService
from app.services.requester_service import RequesterService
from app.services.donor_service import DonorService
from app.services.audit_service import AuditService
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1/requests", tags=["donation_requests"])


@router.get("/incoming", response_model=List[DonationRequestResponse])
@limiter.limit("30/minute")
def get_incoming_requests(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    """Get all donation requests directed to the current donor"""
    # Find the donor linked to this user
    donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if not donor:
        raise HTTPException(status_code=400, detail="Donor profile not found")
    
    return DonationRequestService.get_requests_by_donor(db, donor.id, skip=skip, limit=limit)


@router.get("/outgoing", response_model=List[DonationRequestResponse])
@limiter.limit("30/minute")
def get_outgoing_requests(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    """Get all donation requests created by the current requester"""
    profile = RequesterService.get_requester_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=400, detail="Requester profile not found")
    
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="requests_listed",
        entity_type="donation_request",
        entity_id=0,
        description="Requester viewed their requests",
        ip_address=get_client_ip(request),
    )
    
    return DonationRequestService.get_requests_by_requester(db, profile.id, skip=skip, limit=limit)


@router.patch("/{request_id}/approve", response_model=DonationRequestResponse)
@limiter.limit("10/minute")
def approve_donation_request(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    """Approve a donation request as a donor"""
    donation_request = DonationRequestService.get_request(db, request_id)
    if not donation_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Verify that this request is for the current donor
    donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if not donor or donation_request.donor_id != donor.id:
        raise HTTPException(status_code=403, detail="Not authorized to approve this request")
    
    updated_request = DonationRequestService.update_request_status(db, request_id, "approved")
    
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="request_approved",
        entity_type="donation_request",
        entity_id=request_id,
        description=f"Donor approved request from requester {donation_request.requester_id}",
        ip_address=get_client_ip(request),
    )
    
    return updated_request


@router.patch("/{request_id}/reject", response_model=DonationRequestResponse)
@limiter.limit("10/minute")
def reject_donation_request(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    """Reject a donation request as a donor"""
    donation_request = DonationRequestService.get_request(db, request_id)
    if not donation_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Verify that this request is for the current donor
    donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if not donor or donation_request.donor_id != donor.id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this request")
    
    updated_request = DonationRequestService.update_request_status(db, request_id, "rejected")
    
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="request_rejected",
        entity_type="donation_request",
        entity_id=request_id,
        description=f"Donor rejected request from requester {donation_request.requester_id}",
        ip_address=get_client_ip(request),
    )
    
    return updated_request
