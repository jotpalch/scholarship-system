"""
User model for authentication and role management
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class UserRole(enum.Enum):
    """User role enum"""
    STUDENT = "student"
    PROFESSOR = "professor" 
    REVIEWER = "reviewer"
    ADMIN = "admin"


class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Basic info
    full_name = Column(String(100), nullable=False)
    chinese_name = Column(String(50))
    english_name = Column(String(100))
    
    # Role and status
    role: Mapped[UserRole] = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    
    # Authentication tokens
    verification_token = Column(String(255))
    reset_password_token = Column(String(255))
    reset_password_expires = Column(DateTime(timezone=True))
    
    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False)
    applications = relationship("Application", back_populates="student")
    reviews = relationship("ApplicationReview", back_populates="reviewer")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role.value})>"
    
    @property
    def display_name(self) -> str:
        """Get display name based on locale preference"""
        return str(self.chinese_name or self.full_name or self.username)
    
    def has_role(self, role: UserRole) -> bool:
        """Check if user has specific role"""
        return self.role == role
    
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return bool(self.role == UserRole.ADMIN)
    
    def is_student(self) -> bool:
        """Check if user is student"""
        return bool(self.role == UserRole.STUDENT)
    
    def is_professor(self) -> bool:
        """Check if user is professor"""
        return bool(self.role == UserRole.PROFESSOR)
    
    def is_reviewer(self) -> bool:
        """Check if user is reviewer"""
        return bool(self.role == UserRole.REVIEWER) 