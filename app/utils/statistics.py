"""Statistics and analytics utilities"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Donor, Donation


class StatisticsService:
    """Service for generating statistics about donors and donations"""
    
    @staticmethod
    def get_donor_statistics(db: Session) -> dict:
        """Get overall donor statistics"""
        total_donors = db.query(func.count(Donor.id)).scalar() or 0
        
        # Blood type distribution
        blood_type_distribution = db.query(
            Donor.blood_type,
            func.count(Donor.id).label("count")
        ).group_by(Donor.blood_type).all()
        
        # Age statistics
        average_age = db.query(func.avg(Donor.age)).scalar() or 0
        
        return {
            "total_donors": total_donors,
            "average_age": round(float(average_age), 2),
            "blood_type_distribution": {
                str(bt[0]): bt[1] for bt in blood_type_distribution
            },
        }
    
    @staticmethod
    def get_donation_statistics(db: Session) -> dict:
        """Get overall donation statistics"""
        total_donations = db.query(func.count(Donation.id)).scalar() or 0
        total_volume = db.query(func.sum(Donation.volume_ml)).scalar() or 0
        average_volume = db.query(func.avg(Donation.volume_ml)).scalar() or 0
        
        return {
            "total_donations": total_donations,
            "total_volume_ml": round(float(total_volume), 2),
            "average_volume_ml": round(float(average_volume), 2),
        }
