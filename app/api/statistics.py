"""Statistics endpoints"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_role
from app.models import UserRole
from app.utils.statistics import StatisticsService

router = APIRouter(prefix="/api/v1/statistics", tags=["statistics"])


@router.get("/donors")
def get_donor_stats(
    db: Session = Depends(get_db),
    _: None = Depends(require_role(UserRole.ADMIN)),
):
    """Get donor statistics (requires ADMIN role)"""
    return StatisticsService.get_donor_statistics(db)


@router.get("/donations")
def get_donation_stats(
    db: Session = Depends(get_db),
    _: None = Depends(require_role(UserRole.ADMIN)),
):
    """Get donation statistics (requires ADMIN role)"""
    return StatisticsService.get_donation_statistics(db)


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    _: None = Depends(require_role(UserRole.ADMIN)),
):
    """Get complete summary statistics (requires ADMIN role)"""
    return {
        "donors": StatisticsService.get_donor_statistics(db),
        "donations": StatisticsService.get_donation_statistics(db),
    }


@router.get("/extended")
def get_extended(
    db: Session = Depends(get_db),
    _: None = Depends(require_role(UserRole.ADMIN)),
):
    """Extended stats: approval status, monthly donations, contact requests"""
    return StatisticsService.get_extended_stats(db)
