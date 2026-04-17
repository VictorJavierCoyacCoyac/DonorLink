"""Test donation request approval and rejection workflows"""
import pytest
from app.models import Donor, Requester, DonationRequest


@pytest.fixture
def donor_with_profile(client, db, donor_token):
    """Create a donor with a profile for testing"""
    # Get donor user from token (we'll query by email from fixtures)
    from app.models import User
    donor_user = db.query(User).filter(User.email == "donor@test.com").first()
    
    if not donor_user:
        raise AssertionError("Donor user not found")
    
    # Check if donor profile exists, if not create it
    donor = db.query(Donor).filter(Donor.user_id == donor_user.id).first()
    if not donor:
        donor = Donor(
            user_id=donor_user.id,
            blood_type="O+",
            age=30,
            weight=80,
            last_donation_date=None,
        )
        db.add(donor)
        db.commit()
    
    return donor_user, donor, donor_token


@pytest.fixture
def requester_with_profile(client, db):
    """Register a requester and create their profile"""
    # Register requester
    response = client.post(
        "/api/v1/requester/register",
        json={
            "name": "John Hospital",
            "email": "requester@test.com",
            "password": "Testpass123",
            "hospital": "Main Hospital",
            "phone": "1234567890",
        },
    )
    
    if response.status_code not in [201, 400]:
        raise AssertionError(f"Failed to register requester: {response.text}")
    
    # Get requester user and profile
    from app.models import User
    requester_user = db.query(User).filter(User.email == "requester@test.com").first()
    requester = db.query(Requester).filter(Requester.user_id == requester_user.id).first()
    
    return requester_user, requester


@pytest.fixture
def donation_request_setup(db, donor_with_profile, requester_with_profile):
    """Create a donation request for testing"""
    _, donor, _ = donor_with_profile
    _, requester = requester_with_profile
    
    donation_request = DonationRequest(
        requester_id=requester.id,
        donor_id=donor.id,
        reason="Surgery preparation",
        urgency="high",
        status="pending",
    )
    db.add(donation_request)
    db.commit()
    db.refresh(donation_request)
    
    return donation_request


def test_donor_can_approve_request(client, db, donor_with_profile, donation_request_setup):
    """Test that a donor can approve an incoming request"""
    _, _, donor_token = donor_with_profile
    request_id = donation_request_setup.id
    
    # Approve the request
    response = client.patch(
        f"/api/v1/requests/{request_id}/approve",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    
    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_donor_can_reject_request(client, db, donor_with_profile, donation_request_setup):
    """Test that a donor can reject an incoming request"""
    _, _, donor_token = donor_with_profile
    request_id = donation_request_setup.id
    
    # Reject the request
    response = client.patch(
        f"/api/v1/requests/{request_id}/reject",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


def test_donor_cannot_approve_other_donors_request(client, db, donor_token, donation_request_setup):
    """Test that a donor cannot approve requests not directed to them"""
    # donor_token fixture creates a different donor
    request_id = donation_request_setup.id
    
    # Try to approve a request not directed to them
    response = client.patch(
        f"/api/v1/requests/{request_id}/approve",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]


def test_approval_creates_audit_log(client, db, donor_with_profile, donation_request_setup):
    """Test that request approval is logged in audit trail"""
    donor_user, _, donor_token = donor_with_profile
    request_id = donation_request_setup.id
    
    # Approve the request
    response = client.patch(
        f"/api/v1/requests/{request_id}/approve",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    
    assert response.status_code == 200
    
    # Verify audit log entry was created
    from app.models import AuditLog
    audit_log = db.query(AuditLog).filter(
        AuditLog.action == "request_approved",
        AuditLog.entity_id == request_id,
    ).first()
    
    assert audit_log is not None
    assert audit_log.user_id == donor_user.id
    assert "approved" in audit_log.description.lower()


def test_rejection_creates_audit_log(client, db, donor_with_profile, donation_request_setup):
    """Test that request rejection is logged in audit trail"""
    donor_user, _, donor_token = donor_with_profile
    request_id = donation_request_setup.id
    
    # Reject the request
    response = client.patch(
        f"/api/v1/requests/{request_id}/reject",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    
    assert response.status_code == 200
    
    # Verify audit log entry was created
    from app.models import AuditLog
    audit_log = db.query(AuditLog).filter(
        AuditLog.action == "request_rejected",
        AuditLog.entity_id == request_id,
    ).first()
    
    assert audit_log is not None
    assert audit_log.user_id == donor_user.id
    assert "rejected" in audit_log.description.lower()

