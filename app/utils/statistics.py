"""Statistics and analytics utilities"""
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.models import Donor, Donation, ContactRequest


class StatisticsService:
    """Service for generating statistics about donors and donations"""

    @staticmethod
    def get_donor_statistics(db: Session) -> dict:
        """Get overall donor statistics"""
        total_donors = db.query(func.count(Donor.id)).scalar() or 0

        blood_type_distribution = db.query(
            Donor.blood_type,
            func.count(Donor.id).label("count")
        ).group_by(Donor.blood_type).all()

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

    @staticmethod
    def get_extended_stats(db: Session) -> dict:
        """Extended stats for the admin dashboard"""

        # Donor approval status breakdown
        approval_rows = db.query(
            Donor.approval_status,
            func.count(Donor.id).label("count")
        ).group_by(Donor.approval_status).all()
        approval_status = {row[0]: row[1] for row in approval_rows}

        # Monthly donations — last 6 months (SQLite: strftime)
        monthly_rows = db.execute(text(
            """
            SELECT strftime('%Y-%m', donation_date) as month, COUNT(*) as total
            FROM donations
            WHERE donation_date >= date('now', '-6 months')
            GROUP BY month
            ORDER BY month ASC
            """
        )).fetchall()
        monthly_donations = [{"month": r[0], "total": r[1]} for r in monthly_rows]

        # Contact request stats
        cr_rows = db.query(
            ContactRequest.status,
            func.count(ContactRequest.id).label("count")
        ).group_by(ContactRequest.status).all()
        contact_requests = {row[0]: row[1] for row in cr_rows}

        # Blood type distribution (approved donors only)
        blood_approved = db.query(
            Donor.blood_type,
            func.count(Donor.id).label("count")
        ).filter(Donor.approval_status == "approved").group_by(Donor.blood_type).all()

        def _bt_name(bt):
            s = str(bt)
            mapping = {
                "BloodType.O_NEGATIVE": "O-", "BloodType.O_POSITIVE": "O+",
                "BloodType.A_NEGATIVE": "A-", "BloodType.A_POSITIVE": "A+",
                "BloodType.B_NEGATIVE": "B-", "BloodType.B_POSITIVE": "B+",
                "BloodType.AB_NEGATIVE": "AB-", "BloodType.AB_POSITIVE": "AB+",
            }
            return mapping.get(s, s.replace("BloodType.", ""))

        blood_type_approved = {_bt_name(r[0]): r[1] for r in blood_approved}

        return {
            "approval_status": {
                "pending": approval_status.get("pending", 0),
                "approved": approval_status.get("approved", 0),
                "rejected": approval_status.get("rejected", 0),
            },
            "monthly_donations": monthly_donations,
            "contact_requests": {
                "pending": contact_requests.get("pending", 0),
                "accepted": contact_requests.get("accepted", 0),
                "rejected": contact_requests.get("rejected", 0),
            },
            "blood_type_approved": blood_type_approved,
        }
