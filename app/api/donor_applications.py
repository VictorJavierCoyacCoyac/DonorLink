"""API endpoints for donor application workflow"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole
from app.schemas import (
    DonorApplicationCreate,
    DonorApplicationResponse,
    DonorApplicationListResponse,
    DonorApplicationApprovalResponse,
    DonorApplicationReview,
    CurrentUser,
)
from app.services.donor_application_service import DonorApplicationService
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1/donor-applications", tags=["donor_applications"])


@router.post("", response_model=DonorApplicationResponse, status_code=201)
@limiter.limit("10/minute")
def submit_donor_application(
    application_data: DonorApplicationCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Submit a donor application for review"""
    try:
        application = DonorApplicationService.create_application(
            db,
            application_data,
            ip_address=get_client_ip(request),
        )
        return application
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=DonorApplicationListResponse)
@limiter.limit("20/minute")
def list_donor_applications(
    request: Request,
    status: str | None = Query(None, description="Filter applications by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """List donor applications for admin review"""
    applications, total = DonorApplicationService.get_applications(db, status=status, skip=skip, limit=limit)
    return DonorApplicationListResponse(applications=applications, total=total, skip=skip, limit=limit)


@router.get("/{application_id}", response_model=DonorApplicationResponse)
@limiter.limit("20/minute")
def get_donor_application(
    application_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    application = DonorApplicationService.get_application(db, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.patch("/{application_id}/approve", response_model=DonorApplicationApprovalResponse)
@limiter.limit("10/minute")
def approve_donor_application(
    application_id: int,
    review: DonorApplicationReview,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    try:
        application, username, temporary_password = DonorApplicationService.approve_application(
            db,
            application_id,
            admin_user_id=current_user.id,
            review_notes=review.review_notes,
            ip_address=get_client_ip(request),
        )
        return DonorApplicationApprovalResponse(
            application=application,
            username=username,
            temporary_password=temporary_password,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{application_id}/reject", response_model=DonorApplicationResponse)
@limiter.limit("10/minute")
def reject_donor_application(
    application_id: int,
    review: DonorApplicationReview,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    try:
        application = DonorApplicationService.reject_application(
            db,
            application_id,
            admin_user_id=current_user.id,
            review_notes=review.review_notes,
            ip_address=get_client_ip(request),
        )
        return application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
