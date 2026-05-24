"""Application configuration"""
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = "sqlite:///./donorlink.db"
    # For PostgreSQL: database_url: str = "postgresql://user:password@localhost:5432/donorlink"
    
    # API
    api_title: str = "DonorLink API"
    api_description: str = "Blood Donor Management Platform"
    api_version: str = "1.0.0"
    
    # CORS settings — comma-separated list of allowed origins
    # In production set: ALLOWED_ORIGINS=https://your-app.vercel.app
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # Email
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    email_from_name: str = os.getenv("EMAIL_FROM_NAME", "DonorLink")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    class Config:
        env_file = ".env"


settings = Settings()
