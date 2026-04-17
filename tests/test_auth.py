"""Tests for authentication endpoints"""
import pytest


class TestAuthentication:
    """Test cases for authentication"""

    def test_register_user(self, client):
        """Test user registration"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "testpass123",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert "hashed_password" not in data

    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username"""
        # Register first user
        client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test1@example.com",
                "password": "testpass123",
            },
        )
        
        # Try to register with same username
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test2@example.com",
                "password": "testpass123",
            },
        )
        assert response.status_code == 400

    def test_login_success(self, client):
        """Test successful login"""
        # Register user
        client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "testpass123",
            },
        )
        
        # Login
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "testpass123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_password(self, client):
        """Test login with invalid password"""
        # Register user
        client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "testpass123",
            },
        )
        
        # Try to login with wrong password
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "wrongpassword",
            },
        )
        assert response.status_code == 401

    def test_login_user_not_found(self, client):
        """Test login with non-existent user"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "nonexistent",
                "password": "testpass123",
            },
        )
        assert response.status_code == 401

    def test_get_current_user(self, client, admin_token):
        """Test getting current user info"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testadmin"
        assert data["email"] == "admin@test.com"

    def test_protected_endpoint_without_token(self, client):
        """Test accessing protected endpoint without token"""
        response = client.get("/api/v1/donors")
        assert response.status_code == 403

    def test_protected_endpoint_with_invalid_token(self, client):
        """Test accessing protected endpoint with invalid token"""
        response = client.get(
            "/api/v1/donors",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 403

    def test_refresh_token(self, client, admin_token):
        """Test token refresh"""
        # First get a refresh token
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testadmin",
                "password": "testpass123",
            },
        )
        refresh_token = response.json()["refresh_token"]
        
        # Refresh the token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
