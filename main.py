"""Main FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import os

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.core.init_db import init_sample_data, init_admin_user, init_questionnaire
from app.core.logging import setup_logging
from app.core.rate_limiting import limiter, rate_limit_exceeded_handler
from app.api import router
from app.api.auth import router as auth_router
from app.api.statistics import router as stats_router
from app.api.audit import router as audit_router
from app.api.requesters import router as requesters_router
from app.api.messages import router as messages_router
from app.api.admin import router as admin_router
from app.api.donor_applications import router as donor_application_router
from app.api.questionnaire import router as questionnaire_router, public_router as public_questionnaire_router
from app.api.requester_access import router as requester_access_router
from app.api.donations import router as donations_router
from app.api.notifications import router as notifications_router
from app.api.chat import router as chat_router
from app.api.donor_profile import router as donor_profile_router

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Setup logging
setup_logging()

# Initialize database
init_db()

# Initialize sample data (only for development)
db = SessionLocal()
try:
    init_admin_user(db)
    init_sample_data(db)
    init_questionnaire(db)
finally:
    db.close()

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add CORS middleware
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.add_middleware(SlowAPIMiddleware)

# Include routers
app.include_router(auth_router)
app.include_router(router)
app.include_router(stats_router)
app.include_router(audit_router)
app.include_router(requesters_router)
app.include_router(messages_router)
app.include_router(admin_router)
app.include_router(donor_application_router)
app.include_router(questionnaire_router)
app.include_router(public_questionnaire_router)
app.include_router(requester_access_router)
app.include_router(donations_router)
app.include_router(notifications_router)
app.include_router(chat_router)
app.include_router(donor_profile_router)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "message": "Welcome to DonorLink API",
        "docs": "/docs",
        "version": settings.api_version,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
