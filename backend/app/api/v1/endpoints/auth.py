"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.schemas.response import ApiResponse
from app.utils.response import api_response
from app.services.auth_service import AuthService
from app.services.mock_sso_service import MockSSOService
from app.services.developer_profile_service import DeveloperProfileService, DeveloperProfile, DeveloperProfileManager
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole

router = APIRouter()


@router.post("/register", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    auth_service = AuthService(db)
    user = await auth_service.register_user(user_data)
    return api_response(data=user, message="User registered successfully")


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login user and return access token"""
    auth_service = AuthService(db)
    token_response = await auth_service.login(login_data)
    
    return api_response(data=token_response, message="Login successful")


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    user_data = UserResponse.model_validate(current_user)
    return api_response(data=user_data, message="User information retrieved successfully")


@router.post("/logout", response_model=ApiResponse[None])
async def logout():
    """Logout user (client-side token removal)"""
    return api_response(message="Logged out successfully")


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token"""
    auth_service = AuthService(db)
    token_response = await auth_service.create_tokens(current_user)
    
    return api_response(data=token_response, message="Token refreshed successfully")


# Mock SSO endpoints for development
@router.get("/mock-sso/users", response_model=ApiResponse[list])
async def get_mock_users(
    db: AsyncSession = Depends(get_db)
):
    """Get available mock users for development login"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mock SSO is disabled"
        )
    
    mock_sso_service = MockSSOService(db)
    users = await mock_sso_service.get_mock_users()
    
    return api_response(data=users, message="Mock users retrieved successfully")


@router.post("/mock-sso/login", response_model=ApiResponse[TokenResponse])
async def mock_sso_login(
    request_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Login as mock user for development"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mock SSO is disabled"
        )
    
    username = request_data.get("username")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )
    
    try:
        mock_sso_service = MockSSOService(db)
        token_response = await mock_sso_service.mock_sso_login(username)
        
        return api_response(data=token_response, message=f"Mock SSO login successful for {username}")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )





# Developer Profile endpoints for personalized testing
@router.get("/dev-profiles/developers", response_model=ApiResponse[list])
async def get_all_developers(
    db: AsyncSession = Depends(get_db)
):
    """Get list of all developers who have test profiles"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    dev_service = DeveloperProfileService(db)
    developer_ids = await dev_service.get_all_developer_ids()
    
    return api_response(data=developer_ids, message="Developer list retrieved successfully")


@router.get("/dev-profiles/{developer_id}", response_model=ApiResponse[dict])
async def get_developer_profiles(
    developer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all test profiles for a specific developer"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    dev_service = DeveloperProfileService(db)
    users = await dev_service.get_developer_users(developer_id)
    
    profiles = [
        {
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "chinese_name": user.chinese_name,
            "english_name": user.english_name,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        for user in users
    ]
    
    return api_response(
        data={
            "developer_id": developer_id,
            "profiles": profiles,
            "count": len(profiles)
        },
        message=f"Developer profiles for {developer_id} retrieved successfully",
    )


@router.post("/dev-profiles/{developer_id}/quick-setup", response_model=ApiResponse[dict])
async def quick_setup_developer(
    developer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Quick setup default test profiles for a developer"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    dev_service = DeveloperProfileService(db)
    users = await dev_service.quick_setup_developer(developer_id)
    
    profiles = [
        {
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value
        }
        for user in users
    ]
    
    return api_response(
        data={
            "developer_id": developer_id,
            "created_profiles": profiles,
            "count": len(profiles),
        },
        message=f"Quick setup completed for developer {developer_id}",
    )


@router.post("/dev-profiles/{developer_id}/create-custom", response_model=ApiResponse[dict])
async def create_custom_profile(
    developer_id: str,
    profile_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Create a custom test profile for a developer"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    try:
        # Validate role
        role = UserRole(profile_data.get("role"))
        
        # Create profile
        profile = DeveloperProfile(
            developer_id=developer_id,
            full_name=profile_data.get("full_name"),
            chinese_name=profile_data.get("chinese_name"),
            english_name=profile_data.get("english_name"),
            role=role,
            email_domain=profile_data.get("email_domain", "dev.local"),
            custom_attributes=profile_data.get("custom_attributes", {})
        )
        
        dev_service = DeveloperProfileService(db)
        user = await dev_service.create_developer_user(developer_id, profile)
        
        return api_response(
            data={
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value,
            },
            message=f"Custom profile created for {developer_id}",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid profile data: {str(e)}"
        )


@router.post("/dev-profiles/{developer_id}/student-suite", response_model=ApiResponse[dict])
async def create_student_suite(
    developer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Create a complete student test suite for a developer"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    profiles = DeveloperProfileManager.create_student_profiles(developer_id)
    dev_service = DeveloperProfileService(db)
    users = await dev_service.create_developer_test_suite(developer_id, profiles)
    
    created_profiles = [
        {
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "student_type": profiles[i].custom_attributes.get("student_type")
        }
        for i, user in enumerate(users)
    ]
    
    return api_response(
        data={
            "developer_id": developer_id,
            "created_profiles": created_profiles,
            "count": len(created_profiles),
        },
        message=f"Student test suite created for {developer_id}",
    )


@router.post("/dev-profiles/{developer_id}/staff-suite", response_model=ApiResponse[dict])
async def create_staff_suite(
    developer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Create a complete staff test suite for a developer"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    profiles = DeveloperProfileManager.create_staff_profiles(developer_id)
    dev_service = DeveloperProfileService(db)
    users = await dev_service.create_developer_test_suite(developer_id, profiles)
    
    created_profiles = [
        {
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value
        }
        for user in users
    ]
    
    return api_response(
        data={
            "developer_id": developer_id,
            "created_profiles": created_profiles,
            "count": len(created_profiles),
        },
        message=f"Staff test suite created for {developer_id}",
    )


@router.delete("/dev-profiles/{developer_id}", response_model=ApiResponse[dict])
async def delete_developer_profiles(
    developer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete all test profiles for a developer"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    dev_service = DeveloperProfileService(db)
    deleted_count = await dev_service.delete_all_developer_users(developer_id)
    
    return api_response(
        data={
            "developer_id": developer_id,
            "deleted_count": deleted_count,
        },
        message=f"Deleted {deleted_count} profiles for developer {developer_id}",
    )


@router.delete("/dev-profiles/{developer_id}/{role}", response_model=ApiResponse[dict])
async def delete_specific_profile(
    developer_id: str,
    role: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific test profile for a developer"""
    if not settings.enable_mock_sso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Developer profiles are disabled"
        )
    
    try:
        user_role = UserRole(role)
        dev_service = DeveloperProfileService(db)
        deleted = await dev_service.delete_developer_user(developer_id, user_role)
        
        if deleted:
            return api_response(
                data={"deleted": True},
                message=f"Deleted {role} profile for developer {developer_id}",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found: {developer_id}/{role}"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role}"
        ) 