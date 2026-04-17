"""Utilities for request handling"""
from fastapi import Request
from typing import Optional


def get_client_ip(request: Request) -> Optional[str]:
    """
    Extract client IP address from request.
    
    Handles X-Forwarded-For header (for proxies) and direct client IP.
    """
    # Check for X-Forwarded-For (from proxy)
    if request.headers.get("X-Forwarded-For"):
        # Take the first IP in the chain (client's original IP)
        return request.headers.get("X-Forwarded-For").split(",")[0].strip()
    
    # Check for X-Real-IP (from some proxies)
    if request.headers.get("X-Real-IP"):
        return request.headers.get("X-Real-IP")
    
    # Direct connection
    if request.client:
        return request.client.host
    
    return None
