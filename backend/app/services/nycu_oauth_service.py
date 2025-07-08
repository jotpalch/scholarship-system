"""
NYCU OAuth service for authentication with NYCU's OAuth provider
"""

import httpx
import urllib.parse
from datetime import datetime
from typing import Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.exceptions import AuthenticationError, NotFoundError
from app.models.user import User, UserRole
from app.services.auth_service import AuthService


class NYCUOAuthService:
    """NYCU OAuth service for authentication"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_service = AuthService(db)
    
    def get_authorization_url(self) -> str:
        """Generate NYCU OAuth authorization URL"""
        params = {
            'client_id': settings.nycu_client_id,
            'response_type': 'code',
            'scope': settings.nycu_oauth_scopes,
            'redirect_uri': settings.nycu_redirect_uri
        }
        
        query_string = urllib.parse.urlencode(params)
        return f"{settings.nycu_authorization_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> Dict:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            data = {
                'grant_type': 'authorization_code',
                'code': code,
                'client_id': settings.nycu_client_id,
                'client_secret': settings.nycu_client_secret,
                'redirect_uri': settings.nycu_redirect_uri
            }
            
            response = await client.post(
                settings.nycu_token_url,
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code != 200:
                raise AuthenticationError(f"Failed to exchange code for token: {response.text}")
            
            return response.json()
    
    async def get_user_profile(self, access_token: str) -> Dict:
        """Get user profile from NYCU API"""
        async with httpx.AsyncClient() as client:
            headers = {'Authorization': f'Bearer {access_token}'}
            
            # Get profile information
            profile_response = await client.get(
                settings.nycu_profile_url,
                headers=headers
            )
            
            if profile_response.status_code != 200:
                raise AuthenticationError(f"Failed to get profile: {profile_response.text}")
            
            profile_data = profile_response.json()
            
            # Get name information
            name_response = await client.get(
                settings.nycu_name_url,
                headers=headers
            )
            
            if name_response.status_code != 200:
                raise AuthenticationError(f"Failed to get name: {name_response.text}")
            
            name_data = name_response.json()
            
            # Combine profile and name data
            user_data = {
                'email': profile_data.get('email', ''),
                'username': profile_data.get('username', ''),
                'chinese_name': name_data.get('chinese_name', ''),
                'english_name': name_data.get('english_name', ''),
                'full_name': name_data.get('chinese_name', '') or name_data.get('english_name', '')
            }
            
            return user_data
    
    async def get_user_status(self, access_token: str) -> Dict:
        """Get user status from NYCU API (if available)"""
        try:
            async with httpx.AsyncClient() as client:
                headers = {'Authorization': f'Bearer {access_token}'}
                
                response = await client.get(
                    settings.nycu_status_url,
                    headers=headers
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    # Status endpoint might not be available or authorized
                    return {'status': 'unknown'}
        except Exception:
            return {'status': 'unknown'}
    
    async def authenticate_or_create_user(self, nycu_user_data: Dict) -> User:
        """Authenticate existing user or create new user from NYCU data"""
        email = nycu_user_data.get('email', '')
        username = nycu_user_data.get('username', '')
        
        if not email or not username:
            raise AuthenticationError("Invalid user data from NYCU OAuth")
        
        # Try to find existing user by email
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            # Update user information from NYCU
            user.username = username
            user.chinese_name = nycu_user_data.get('chinese_name', user.chinese_name)
            user.english_name = nycu_user_data.get('english_name', user.english_name)
            user.full_name = nycu_user_data.get('full_name', user.full_name)
            user.last_login_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(user)
            return user
        
        # Create new user
        # Determine role based on email domain or other criteria
        role = self._determine_user_role(email, username)
        
        user = User(
            email=email,
            username=username,
            chinese_name=nycu_user_data.get('chinese_name', ''),
            english_name=nycu_user_data.get('english_name', ''),
            full_name=nycu_user_data.get('full_name', ''),
            role=role,
            is_active=True
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    def _determine_user_role(self, email: str, username: str) -> UserRole:
        """Determine user role based on email/username patterns"""
        # Default to student role
        # In production, you might want to implement more sophisticated role detection
        # based on email domains, username patterns, or additional API calls
        
        # Example logic (customize based on your requirements):
        if '@nycu.edu.tw' in email.lower():
            # Faculty/staff email
            if any(prefix in username.lower() for prefix in ['prof', 'faculty', 'staff']):
                return UserRole.PROFESSOR
            elif any(prefix in username.lower() for prefix in ['admin', 'sys']):
                return UserRole.ADMIN
            else:
                return UserRole.STUDENT
        else:
            return UserRole.STUDENT
    
    async def handle_oauth_callback(self, code: str) -> Tuple[User, str]:
        """Handle OAuth callback and return user with access token"""
        # Exchange code for token
        token_data = await self.exchange_code_for_token(code)
        access_token = token_data.get('access_token')
        
        if not access_token:
            raise AuthenticationError("No access token received from NYCU OAuth")
        
        # Get user profile
        nycu_user_data = await self.get_user_profile(access_token)
        
        # Authenticate or create user
        user = await self.authenticate_or_create_user(nycu_user_data)
        
        # Create application tokens
        token_response = await self.auth_service.create_tokens(user)
        
        return user, token_response.access_token 