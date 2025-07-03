"""
Mock SSO service for development environment
Uses test data from init_db instead of predefined users
"""

from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, UserRole
from app.services.auth_service import AuthService


class MockSSOService:
    """Mock SSO service for development - Uses init_db test data"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_service = AuthService(db)
    
    async def get_mock_users(self) -> List[Dict]:
        """Get list of available users from database for development login"""
        stmt = select(User).where(User.is_active == True).order_by(User.role, User.username)
        result = await self.db.execute(stmt)
        db_users = result.scalars().all()
        
        user_list = []
        for user in db_users:
            # Generate role-based description with student info if available
            if user.role == UserRole.STUDENT and user.student_no:
                description = f"Student ({user.student_no}) - {user.chinese_name or user.full_name}"
            elif user.role == UserRole.PROFESSOR:
                description = f"Professor - {user.chinese_name or user.full_name}"
            elif user.role == UserRole.COLLEGE:
                description = f"College Reviewer - {user.chinese_name or user.full_name}"
            elif user.role == UserRole.ADMIN:
                description = f"Administrator - {user.chinese_name or user.full_name}"
            elif user.role == UserRole.SUPER_ADMIN:
                description = f"Super Administrator - {user.chinese_name or user.full_name}"
            else:
                description = f"{user.role.value.title()} - {user.chinese_name or user.full_name}"
            
            user_list.append({
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "chinese_name": user.chinese_name,
                "english_name": user.english_name,
                "role": user.role.value,
                "description": description
            })
        
        return user_list
    

    
    async def authenticate_mock_user(self, username: str) -> User:
        """Authenticate and return user from database"""
        stmt = select(User).where(User.username == username, User.is_active == True)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {username} not found")
        
        return user
    
    async def mock_sso_login(self, username: str):
        """Simulate SSO login for user"""
        user = await self.authenticate_mock_user(username)
        return await self.auth_service.create_tokens(user) 