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
    
    # CORS settings
    allowed_origins: list[str] = ["*"]
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    
    class Config:
        env_file = ".env"


settings = Settings()
