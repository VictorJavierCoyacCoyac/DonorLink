"""Tests for donor endpoints"""
import pytest
from datetime import datetime, timedelta


class TestDonorEndpoints:
    """Test cases for donor CRUD endpoints"""

    def test_create_donor(self, client, admin_token):
        """Test creating a donor"""
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
        data = response.json()
        assert data["name"] == "Juan García"
        assert data["blood_type"] == "O+"
        assert data["email"] == "juan@example.com"

    def test_create_donor_invalid_age(self, client, admin_token):
        """Test creating a donor with invalid age"""
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Young Donor",
                "email": "young@example.com",
                "blood_type": "O+",
                "age": 15,  # Below minimum age
                "weight": 75.5,
            },
        )
        assert response.status_code == 422

    def test_create_donor_invalid_weight(self, client, admin_token):
        """Test creating a donor with invalid weight"""
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Light Donor",
                "email": "light@example.com",
                "blood_type": "O+",
                "age": 28,
                "weight": 40,  # Below minimum weight
            },
        )
        assert response.status_code == 422

    def test_get_donor(self, client, admin_token):
        """Test getting a donor by ID"""
        # Create a donor first
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
        donor_id = response.json()["id"]
        
        # Get the donor
        response = client.get(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == donor_id
        assert data["name"] == "Juan García"

    def test_get_donor_not_found(self, client, admin_token):
        """Test getting a non-existent donor"""
        response = client.get(
            "/api/v1/donors/999",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    def test_list_donors(self, client, admin_token):
        """Test listing donors"""
        # Create a few donors
        for i in range(3):
            client.post(
                "/api/v1/donors",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "name": f"Donor {i}",
                    "email": f"donor{i}@example.com",
                    "blood_type": "O+",
                    "age": 28 + i,
                    "weight": 75.5,
                },
            )
        
        # List donors
        response = client.get(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3

    def test_update_donor(self, client, admin_token):
        """Test updating a donor"""
        # Create a donor first
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
        donor_id = response.json()["id"]
        
        # Update the donor
        response = client.patch(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "age": 29,
                "weight": 76.0,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["age"] == 29
        assert data["weight"] == 76.0

    def test_delete_donor(self, client, admin_token):
        """Test deleting a donor"""
        # Create a donor first
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
        donor_id = response.json()["id"]
        
        # Delete the donor
        response = client.delete(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 204
        
        # Verify it's deleted
        response = client.get(
            f"/api/v1/donors/{donor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    def test_search_donors(self, client, admin_token):
        """Test searching donors with filters"""
        # Create test donors
        client.post(
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
        client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "María López",
                "email": "maria@example.com",
                "blood_type": "A+",
                "age": 35,
                "weight": 68.0,
            },
        )
        
        # Search by blood type
        response = client.post(
            "/api/v1/donors/search",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"blood_type": "O+"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["donors"]) >= 1
        assert data["donors"][0]["blood_type"] == "O+"
        
        # Search by name
        response = client.post(
            "/api/v1/donors/search",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Juan"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any(d["name"] == "Juan García" for d in data["donors"])


class TestEligibilityEndpoints:
    """Test cases for eligibility check endpoints"""

    def test_check_eligibility_yes(self, client, admin_token):
        """Test checking eligibility for an eligible donor"""
        # Create an eligible donor
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Juan García",
                "email": "juan@example.com",
                "blood_type": "O+",
                "age": 28,
                "weight": 75.5,
                "last_donation_date": None,
            },
        )
        donor_id = response.json()["id"]
        
        # Check eligibility
        response = client.get(
            f"/api/v1/donors/{donor_id}/eligibility",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_eligible"] is True
        assert len(data["reasons"]) == 0

    def test_check_eligibility_no_recent_donation(self, client, admin_token):
        """Test checking eligibility for donor with recent donation"""
        # Create a donor with recent donation
        response = client.post(
            "/api/v1/donors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Juan García",
                "email": "juan@example.com",
                "blood_type": "O+",
                "age": 28,
                "weight": 75.5,
                "last_donation_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            },
        )
        donor_id = response.json()["id"]
        
        # Check eligibility
        response = client.get(
            f"/api/v1/donors/{donor_id}/eligibility",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_eligible"] is False
        assert len(data["reasons"]) > 0
