"""Eligibility service - core business logic for donor eligibility"""
from datetime import datetime
from app.models import Donor


# Cooldown tiers by volume (NOM-253-SSA1-2012 / WHO guidelines)
# (max_volume_inclusive, cooldown_days, label)
DONATION_COOLDOWN_RULES = [
    (450,  56,  "Sangre total estándar"),        # ≤ 450 ml  → 8 semanas
    (600,  90,  "Donación aumentada"),            # 451–600 ml → 90 días
    (800,  120, "Aféresis / Plasmapéresis"),      # 601–800 ml → 4 meses
    (1000, 180, "Plasmapéresis intensiva"),        # 801–1000 ml → 6 meses
]


def cooldown_days_for_volume(volume_ml: float) -> int:
    """Return the required cooldown in days for a given donation volume."""
    for max_vol, days, _ in DONATION_COOLDOWN_RULES:
        if volume_ml <= max_vol:
            return days
    return 180  # safety fallback


def cooldown_label_for_volume(volume_ml: float) -> str:
    for max_vol, _, label in DONATION_COOLDOWN_RULES:
        if volume_ml <= max_vol:
            return label
    return "Plasmapéresis intensiva"


class EligibilityService:
    """Service to determine if a donor is eligible to donate"""

    MIN_AGE = 18
    MAX_AGE = 65
    MIN_WEIGHT_KG = 50.0

    @staticmethod
    def check_eligibility(donor: Donor) -> dict:
        """
        Check if a donor is eligible to donate today.

        Cooldown period depends on the volume of the last donation,
        following NOM-253-SSA1-2012 and WHO guidelines.

        Returns dict with:
            - is_eligible: bool
            - reasons: list[str]
            - days_until_eligible: int | None
            - required_cooldown_days: int
        """
        reasons = []

        if donor.age < EligibilityService.MIN_AGE:
            reasons.append(
                f"Edad por debajo del mínimo ({donor.age} < {EligibilityService.MIN_AGE})"
            )
        elif donor.age > EligibilityService.MAX_AGE:
            reasons.append(
                f"Edad por encima del máximo ({donor.age} > {EligibilityService.MAX_AGE})"
            )

        if donor.weight < EligibilityService.MIN_WEIGHT_KG:
            reasons.append(
                f"Peso insuficiente ({donor.weight} kg < {EligibilityService.MIN_WEIGHT_KG} kg)"
            )

        last_volume = donor.last_donation_volume_ml or 450.0
        required_cooldown = cooldown_days_for_volume(last_volume)
        days_until_eligible = None

        if donor.last_donation_date:
            days_since = (datetime.utcnow() - donor.last_donation_date).days
            if days_since < required_cooldown:
                days_until_eligible = required_cooldown - days_since
                reasons.append(
                    f"Debe esperar {days_until_eligible} día(s) más "
                    f"({days_since}/{required_cooldown} días transcurridos desde la última donación de {last_volume:.0f} ml)"
                )

        return {
            "is_eligible": len(reasons) == 0,
            "reasons": reasons,
            "days_until_eligible": days_until_eligible,
            "required_cooldown_days": required_cooldown,
        }
