#!/usr/bin/env python
"""Test script to verify audit endpoints are working"""
import requests
import json
import sys
import time

# Wait for server to fully start
time.sleep(2)

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 60)
print("Testing Audit Endpoints After Fix")
print("=" * 60)

# Test 1: Login
print("\n1. Testing login endpoint...")
try:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": "admin", "password": "admin123"},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"   ✓ Login successful, got token: {token[:20]}...")
    else:
        print(f"   ✗ Login failed: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ Error: {e}")
    sys.exit(1)

# Test 2: Get audit logs
print("\n2. Testing GET /audit/logs endpoint...")
try:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/audit/logs",
        headers=headers,
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Audit logs retrieved successfully")
        print(f"   Total logs: {data.get('total')}")
        print(f"   Returned logs count: {len(data.get('logs', []))}")
    else:
        print(f"   ✗ Failed to get audit logs: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ Error: {e}")
    sys.exit(1)

# Test 3: Get audit logs again (simulating re-entry)
print("\n3. Testing GET /audit/logs again (simulating re-entry to page)...")
try:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/audit/logs",
        headers=headers,
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Audit logs retrieved successfully on re-entry")
    else:
        print(f"   ✗ Failed to get audit logs on re-entry: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ Error: {e}")
    sys.exit(1)

# Test 4: Get entity history
print("\n4. Testing GET /audit/entity/{entity_type}/{entity_id} endpoint...")
try:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/audit/entity/donor/1",
        headers=headers,
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code in [200, 404]:  # 404 is ok if entity not found
        print(f"   ✓ Entity history endpoint works correctly")
    else:
        print(f"   ✗ Failed: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ Error: {e}")
    sys.exit(1)

# Test 5: Get user activity
print("\n5. Testing GET /audit/user/{user_id} endpoint...")
try:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/audit/user/1",
        headers=headers,
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ User activity endpoint works correctly")
    else:
        print(f"   ✗ Failed: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ Error: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✓ All tests passed! Audit endpoints are working correctly.")
print("=" * 60)
