"""Security utilities for authentication and password hashing"""
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing context - use Argon2 as primary with bcrypt as fallback
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# Token types
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


class SecurityService:
    """Service for handling password and token operations"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_token(
        data: dict,
        token_type: str = TOKEN_TYPE_ACCESS,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """
        Create a JWT token.
        
        Args:
            data: Payload data to encode
            token_type: Type of token (access or refresh)
            expires_delta: Token expiration time
            
        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            # Default expiration times
            if token_type == TOKEN_TYPE_ACCESS:
                expire = datetime.utcnow() + timedelta(hours=1)
            else:  # refresh token
                expire = datetime.utcnow() + timedelta(days=7)
        
        to_encode.update({"exp": expire, "type": token_type})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm,
        )
        return encoded_jwt

    @staticmethod
    def verify_token(token: str, token_type: str = TOKEN_TYPE_ACCESS) -> Optional[dict]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token to verify
            token_type: Expected token type
            
        Returns:
            Decoded payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm],
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                return None
            
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def create_tokens(user_id: int, username: str) -> dict:
        """Create both access and refresh tokens for a user"""
        access_token = SecurityService.create_token(
            data={"sub": username, "user_id": user_id},
            token_type=TOKEN_TYPE_ACCESS,
        )
        refresh_token = SecurityService.create_token(
            data={"sub": username, "user_id": user_id},
            token_type=TOKEN_TYPE_REFRESH,
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
