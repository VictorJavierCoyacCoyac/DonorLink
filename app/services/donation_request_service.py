"""Service for donation request workflow"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import DonationRequest
from app.schemas import DonationRequestCreate


class DonationRequestService:
    """Service layer for donation request operations"""

    @staticmethod
    def create_request(db: Session, requester_id: int, request_data: DonationRequestCreate) -> DonationRequest:
        donation_request = DonationRequest(
            requester_id=requester_id,
            donor_id=request_data.donor_id,
            reason=request_data.reason,
            urgency=request_data.urgency,
            status="pending",
        )
        db.add(donation_request)
        db.commit()
        db.refresh(donation_request)
        return donation_request

    @staticmethod
    def get_request(db: Session, request_id: int) -> Optional[DonationRequest]:
        return db.query(DonationRequest).filter(DonationRequest.id == request_id).first()

    @staticmethod
    def get_requests_by_requester(db: Session, requester_id: int, skip: int = 0, limit: int = 100) -> List[DonationRequest]:
        return db.query(DonationRequest).filter(DonationRequest.requester_id == requester_id).order_by(DonationRequest.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_requests_by_donor(db: Session, donor_id: int, skip: int = 0, limit: int = 100) -> List[DonationRequest]:
        return db.query(DonationRequest).filter(DonationRequest.donor_id == donor_id).order_by(DonationRequest.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def update_request_status(db: Session, request_id: int, status: str) -> Optional[DonationRequest]:
        donation_request = DonationRequestService.get_request(db, request_id)
        if not donation_request:
            return None
        donation_request.status = status
        db.commit()
        db.refresh(donation_request)
        return donation_request
