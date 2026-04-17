"""Eligibility service - core business logic for donor eligibility"""
from datetime import datetime, timedelta
from app.models import Donor


class EligibilityService:
    """Service to determine if a donor is eligible to donate"""
    
    # Eligibility constants
    MIN_AGE = 18
    MAX_AGE = 65
    MIN_WEIGHT_KG = 50.0
    MIN_DAYS_BETWEEN_DONATIONS = 56  # 8 weeks for whole blood
    
    @staticmethod
    def check_eligibility(donor: Donor) -> dict:
        """
        Check if a donor is eligible to donate today.
        
        Args:
            donor: Donor model instance
            
        Returns:
            dict with keys:
            - is_eligible: bool
            - reasons: list of reasons if not eligible
            - days_until_eligible: int or None
        """
        reasons = []
        
        # Check age
        if donor.age < EligibilityService.MIN_AGE:
            reasons.append(
                f"Age is below minimum requirement ({donor.age} < {EligibilityService.MIN_AGE})"
            )
        elif donor.age > EligibilityService.MAX_AGE:
            reasons.append(
                f"Age is above maximum requirement ({donor.age} > {EligibilityService.MAX_AGE})"
            )
        
        # Check weight
        if donor.weight < EligibilityService.MIN_WEIGHT_KG:
            reasons.append(
                f"Weight is below minimum requirement ({donor.weight}kg < {EligibilityService.MIN_WEIGHT_KG}kg)"
            )
        
        # Check last donation date
        days_until_eligible = None
        if donor.last_donation_date:
            days_since_last_donation = (datetime.utcnow() - donor.last_donation_date).days
            if days_since_last_donation < EligibilityService.MIN_DAYS_BETWEEN_DONATIONS:
                days_until_eligible = (
                    EligibilityService.MIN_DAYS_BETWEEN_DONATIONS - days_since_last_donation
                )
                reasons.append(
                    f"Must wait {days_until_eligible} more days since last donation "
                    f"({days_since_last_donation}/{EligibilityService.MIN_DAYS_BETWEEN_DONATIONS} days passed)"
                )
        
        is_eligible = len(reasons) == 0
        
        return {
            "is_eligible": is_eligible,
            "reasons": reasons,
            "days_until_eligible": days_until_eligible,
        }
