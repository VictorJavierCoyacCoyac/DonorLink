"""Tests for Role-Based Access Control (RBAC)"""
import pytest


class TestDonorRBAC:
    """Test RBAC for donor endpoints"""

    def test_create_donor_admin_allowed(self, client, admin_token):
        """Test that ADMIN can create donors"""
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Juan García",
                "email": "juan@example.com",
                "blood_type": "O+",
                "age": 28,
                "weight": 75.5,
            },
        )
        assert response.status_code == 201

    def test_create_donor_staff_allowed(self, client, staff_token):
        """Test that STAFF can create donors"""
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={
                "name": "María López",
                "email": "maria@example.com",
                "blood_type": "A+",
                "age": 30,
                "weight": 65.0,
            },
        )
        assert response.status_code == 201

    def test_create_donor_donor_forbidden(self, client, donor_token):
        """Test that DONOR cannot create donors"""
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {donor_token}"},
            json={
                "name": "Pedro Smith",
                "email": "pedro@example.com",
                "blood_type": "B+",
                "age": 35,
                "weight": 80.0,
            },
        )
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]

    def test_get_donor_admin_allowed(self, client, admin_token):
        """Test that ADMIN can get donors"""
        # Create donor
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Get donor
        response = client.get(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

    def test_get_donor_staff_allowed(self, client, staff_token, admin_token):
        """Test that STAFF can get donors"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Get donor with staff
        response = client.get(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert response.status_code == 200

    def test_get_donor_donor_forbidden(self, client, donor_token, admin_token):
        """Test that DONOR cannot get donors"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Try to get donor with donor
        response = client.get(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert response.status_code == 403

    def test_list_donors_admin_allowed(self, client, admin_token):
        """Test that ADMIN can list donors"""
        response = client.get(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

    def test_list_donors_staff_allowed(self, client, staff_token):
        """Test that STAFF can list donors"""
        response = client.get(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert response.status_code == 200

    def test_list_donors_donor_forbidden(self, client, donor_token):
        """Test that DONOR cannot list donors"""
        response = client.get(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert response.status_code == 403

    def test_update_donor_admin_allowed(self, client, admin_token):
        """Test that ADMIN can update donors"""
        # Create donor
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Update donor
        response = client.patch(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"age": 26},
        )
        assert response.status_code == 200

    def test_update_donor_staff_allowed(self, client, staff_token, admin_token):
        """Test that STAFF can update donors"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Update donor with staff
        response = client.patch(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={"age": 26},
        )
        assert response.status_code == 200

    def test_update_donor_donor_forbidden(self, client, donor_token, admin_token):
        """Test that DONOR cannot update donors"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Try to update with donor
        response = client.patch(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {donor_token}"},
            json={"age": 26},
        )
        assert response.status_code == 403

    def test_delete_donor_admin_allowed(self, client, admin_token):
        """Test that ADMIN can delete donors"""
        # Create donor
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Delete donor
        response = client.delete(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 204

    def test_delete_donor_staff_forbidden(self, client, staff_token, admin_token):
        """Test that STAFF cannot delete donors"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Try to delete with staff
        response = client.delete(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert response.status_code == 403

    def test_delete_donor_donor_forbidden(self, client, donor_token, admin_token):
        """Test that DONOR cannot delete donors"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Try to delete with donor
        response = client.delete(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert response.status_code == 403


class TestDonationRBAC:
    """Test RBAC for donation endpoints"""

    def test_register_donation_admin_allowed(self, client, admin_token):
        """Test that ADMIN can register donations"""
        # Create donor
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Register donation
        response = client.post(
            f"/api/v1/donors/{donor_id}/donate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"volume_ml": 450.0},
        )
        assert response.status_code == 201

    def test_register_donation_staff_allowed(self, client, staff_token, admin_token):
        """Test that STAFF can register donations"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Register donation with staff
        response = client.post(
            f"/api/v1/donors/{donor_id}/donate",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={"volume_ml": 450.0},
        )
        assert response.status_code == 201

    def test_register_donation_donor_forbidden(self, client, donor_token, admin_token):
        """Test that DONOR cannot register donations"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Try to register donation with donor
        response = client.post(
            f"/api/v1/donors/{donor_id}/donate",
            headers={"Authorization": f"Bearer {donor_token}"},
            json={"volume_ml": 450.0},
        )
        assert response.status_code == 403

    def test_check_eligibility_admin_allowed(self, client, admin_token):
        """Test that ADMIN can check eligibility"""
        # Create donor
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Check eligibility
        response = client.get(
            f"/api/v1/donors/{donor_id}/eligibility",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

    def test_check_eligibility_staff_allowed(self, client, staff_token, admin_token):
        """Test that STAFF can check eligibility"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Check eligibility with staff
        response = client.get(
            f"/api/v1/donors/{donor_id}/eligibility",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert response.status_code == 200

    def test_check_eligibility_donor_forbidden(self, client, donor_token, admin_token):
        """Test that DONOR cannot check eligibility"""
        # Create donor with admin
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Donor",
                "email": "test@example.com",
                "blood_type": "O+",
                "age": 25,
                "weight": 70.0,
            },
        )
        donor_id = response.json()["id"]
        
        # Try to check eligibility with donor
        response = client.get(
            f"/api/v1/donors/{donor_id}/eligibility",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert response.status_code == 403


class TestStatisticsRBAC:
    """Test RBAC for statistics endpoints"""

    def test_get_donor_stats_admin_allowed(self, client, admin_token):
        """Test that ADMIN can get donor statistics"""
        response = client.get(
            "/api/v1/statistics/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

    def test_get_donor_stats_staff_forbidden(self, client, staff_token):
        """Test that STAFF cannot get donor statistics"""
        response = client.get(
            "/api/v1/statistics/donors",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert response.status_code == 403

    def test_get_donor_stats_donor_forbidden(self, client, donor_token):
        """Test that DONOR cannot get donor statistics"""
        response = client.get(
            "/api/v1/statistics/donors",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert response.status_code == 403

    def test_get_donation_stats_admin_allowed(self, client, admin_token):
        """Test that ADMIN can get donation statistics"""
        response = client.get(
            "/api/v1/statistics/donations",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

    def test_get_donation_stats_staff_forbidden(self, client, staff_token):
        """Test that STAFF cannot get donation statistics"""
        response = client.get(
            "/api/v1/statistics/donations",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert response.status_code == 403

    def test_get_donation_stats_donor_forbidden(self, client, donor_token):
        """Test that DONOR cannot get donation statistics"""
        response = client.get(
            "/api/v1/statistics/donations",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert response.status_code == 403

    def test_get_summary_stats_admin_allowed(self, client, admin_token):
        """Test that ADMIN can get summary statistics"""
        response = client.get(
            "/api/v1/statistics/summary",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

    def test_get_summary_stats_staff_forbidden(self, client, staff_token):
        """Test that STAFF cannot get summary statistics"""
        response = client.get(
            "/api/v1/statistics/summary",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert response.status_code == 403

    def test_get_summary_stats_donor_forbidden(self, client, donor_token):
        """Test that DONOR cannot get summary statistics"""
        response = client.get(
            "/api/v1/statistics/summary",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert response.status_code == 403
