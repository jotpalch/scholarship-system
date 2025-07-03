"""
User schemas for API requests and responses
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=100)
    chinese_name: Optional[str] = Field(None, max_length=50)
    english_name: Optional[str] = Field(None, max_length=100)
    role: UserRole = UserRole.STUDENT


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8, max_length=100)
    student_no: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = True


class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    chinese_name: Optional[str] = Field(None, max_length=50)
    english_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    student_no: Optional[str] = Field(None, max_length=20)


class UserLogin(BaseModel):
    """User login schema"""
    username: str
    password: str


class UserResponse(UserBase):
    """User response schema"""
    id: int
    is_active: bool
    is_verified: bool
    student_no: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """User list response schema for admin management"""
    id: int
    email: str
    username: str
    full_name: str
    chinese_name: Optional[str] = None
    english_name: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    student_no: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserStatsResponse(BaseModel):
    """User statistics response schema"""
    total_users: int
    role_distribution: dict[str, int]
    active_users: int
    inactive_users: int
    recent_registrations: int


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse 