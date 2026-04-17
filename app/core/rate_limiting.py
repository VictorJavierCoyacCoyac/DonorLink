"""Rate limiting configuration for API protection"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Initialize limiter with IP address-based key function
limiter = Limiter(key_func=get_remote_address)

# Define rate limit strategies
RATE_LIMITS = {
    # Authentication endpoints: 5 requests per minute
    "auth_login": "5/minute",
    "auth_register": "3/minute",
    
    # Donor endpoints: 30 requests per minute
    "donor_list": "30/minute",
    "donor_create": "10/minute",
    "donor_get": "60/minute",
    "donor_update": "10/minute",
    "donor_delete": "5/minute",
    
    # Donation endpoints: 20 requests per minute
    "donation_create": "20/minute",
    "donation_list": "30/minute",
    
    # Statistics endpoints: 30 requests per minute
    "statistics": "30/minute",
}


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded errors"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "detail": str(exc.detail),
        },
    )
