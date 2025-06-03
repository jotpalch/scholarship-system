"""
Security utilities for authentication and authorization
"""

from jose import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.db.deps import get_db
from app.models.user import User, UserRole

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token bearer
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.JWTError:
        raise AuthenticationError("Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    try:
        payload = verify_token(credentials.credentials)
        user_id: int = payload.get("sub")
        if user_id is None:
            raise AuthenticationError("Invalid token")
    except Exception:
        raise AuthenticationError("Could not validate credentials")
    
    # Get user from database
    result = await db.get(User, user_id)
    if result is None:
        raise AuthenticationError("User not found")
    
    if not result.is_active:
        raise AuthenticationError("User account is disabled")
    
    return result


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise AuthenticationError("User account is disabled")
    return current_user


def require_role(required_role: UserRole):
    """Role-based access control decorator"""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.has_role(required_role):
            raise AuthorizationError(f"Access denied. Required role: {required_role.value}")
        return current_user
    return role_checker


def require_roles(*required_roles: UserRole):
    """Multiple roles access control decorator"""
    def roles_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not any(current_user.has_role(role) for role in required_roles):
            role_names = [role.value for role in required_roles]
            raise AuthorizationError(f"Access denied. Required roles: {', '.join(role_names)}")
        return current_user
    return roles_checker


# Role-specific dependencies
def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require admin role"""
    if not current_user.is_admin():
        raise AuthorizationError("Admin access required")
    return current_user


def require_student(current_user: User = Depends(get_current_active_user)) -> User:
    """Require student role"""
    if not current_user.is_student():
        raise AuthorizationError("Student access required")
    return current_user


def require_professor(current_user: User = Depends(get_current_active_user)) -> User:
    """Require professor role"""
    if not current_user.is_professor():
        raise AuthorizationError("Professor access required")
    return current_user


def require_reviewer(current_user: User = Depends(get_current_active_user)) -> User:
    """Require reviewer role"""
    if not current_user.is_reviewer():
        raise AuthorizationError("Reviewer access required")
    return current_user


def require_staff(current_user: User = Depends(get_current_active_user)) -> User:
    """Require staff access (admin, reviewer, or professor)"""
    if not any([current_user.is_admin(), current_user.is_reviewer(), current_user.is_professor()]):
        raise AuthorizationError("Staff access required")
    return current_user 