"""
User management API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update, delete
from sqlalchemy.orm import selectinload

from app.db.deps import get_db
from app.schemas.user import UserResponse, UserUpdate, UserCreate, UserListResponse
from app.schemas.common import PaginatedResponse
from app.core.security import get_current_user, require_admin, require_super_admin
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.schemas.response import ApiResponse
from app.utils.response import api_response

router = APIRouter()


def convert_user_to_dict(user: User) -> dict:
    """Convert User model to dictionary for Pydantic validation"""
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "chinese_name": user.chinese_name,
        "english_name": user.english_name,
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "student_no": user.student_no,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
    }


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return api_response(
        data=convert_user_to_dict(current_user),
        message="User profile retrieved successfully",
    )


@router.get("/student-info", response_model=ApiResponse[dict])
async def get_student_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get student information"""
    from app.services.application_service import get_student_from_user
    from app.models.student import StudentTermRecord
    from sqlalchemy import select, desc
    
    if current_user.role.value != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can access student information"
        )
    
    # Get student profile
    student = await get_student_from_user(current_user, db)
    
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )
    
    # Get latest term record for GPA and ranking
    stmt = select(StudentTermRecord).where(
        StudentTermRecord.studentId == student.id
    ).order_by(desc(StudentTermRecord.academicYear), desc(StudentTermRecord.semester))
    
    result = await db.execute(stmt)
    latest_term = result.scalar_one_or_none()
    
    # Get contact info using explicit query
    from app.models.student import StudentContact, StudentAcademicRecord
    contact_stmt = select(StudentContact).where(StudentContact.studentId == student.id)
    contact_result = await db.execute(contact_stmt)
    contact = contact_result.scalar_one_or_none()
    
    # Get academic records using explicit query
    academic_stmt = select(StudentAcademicRecord).where(
        StudentAcademicRecord.studentId == student.id
    ).order_by(desc(StudentAcademicRecord.createdAt))
    academic_result = await db.execute(academic_stmt)
    academic_records = academic_result.scalars().all()
    
    return api_response(
        data={
            "student": student,
            "latest_term": latest_term,
            "contact": contact,
            "academic_records": academic_records,
        },
        message="Student information retrieved successfully",
    )


@router.put("/me", response_model=ApiResponse[UserResponse])
async def update_my_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    # Update user fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return api_response(
        data=convert_user_to_dict(current_user),
        message="Profile updated successfully",
    )


# ==================== 管理員專用API ====================

@router.get("/")
async def get_all_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name, email, or username"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all users with pagination (admin only)"""
    
    # Base query
    stmt = select(User)
    
    # Apply filters
    if role:
        try:
            user_role = UserRole(role)
            stmt = stmt.where(User.role == user_role)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    
    if search:
        stmt = stmt.where(
            (User.full_name.icontains(search)) |
            (User.email.icontains(search)) |
            (User.username.icontains(search)) |
            (User.chinese_name.icontains(search)) |
            (User.english_name.icontains(search))
        )
    
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size).order_by(desc(User.created_at))
    
    # Execute query
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    # Convert to response format
    user_list = [convert_user_to_dict(user) for user in users]
    
    return {
        "success": True,
        "message": "Users retrieved successfully",
        "data": {
            "items": user_list,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
    }


@router.get("/{user_id}")
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "success": True,
        "message": "User retrieved successfully",
        "data": convert_user_to_dict(user)
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user (admin only)"""
    auth_service = AuthService(db)
    
    # Check if user already exists
    existing_user = await auth_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="User with this email already exists")
    
    existing_username = await auth_service.get_user_by_username(user_data.username)
    if existing_username:
        raise HTTPException(status_code=409, detail="Username already taken")
    
    # Create user
    user = await auth_service.create_user(user_data)
    
    return {
        "success": True,
        "message": "User created successfully",
        "data": convert_user_to_dict(user)
    }


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    update_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return {
        "success": True,
        "message": "User updated successfully",
        "data": convert_user_to_dict(user)
    }


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete user (super admin only)"""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete - set is_active to False
    user.is_active = False
    await db.commit()
    
    return {
        "success": True,
        "message": "User deleted successfully",
        "data": {"user_id": user_id}
    }


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Activate user (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = True
    await db.commit()
    
    return {
        "success": True,
        "message": "User activated successfully",
        "data": {"user_id": user_id}
    }


@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate user (admin only)"""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = False
    await db.commit()
    
    return {
        "success": True,
        "message": "User deactivated successfully",
        "data": {"user_id": user_id}
    }


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reset user password (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate temporary password
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    
    # Hash and set password
    auth_service = AuthService(db)
    user.hashed_password = auth_service.get_password_hash(temp_password)
    await db.commit()
    
    return {
        "success": True,
        "message": "Password reset successfully",
        "data": {
            "user_id": user_id,
            "temporary_password": temp_password
        }
    }


@router.get("/stats/overview")
async def get_user_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user statistics (admin only)"""
    # Total users by role
    role_stats = {}
    for role in UserRole:
        stmt = select(func.count(User.id)).where(User.role == role)
        result = await db.execute(stmt)
        count = result.scalar()
        role_stats[role.value] = count
    
    # Active vs inactive users
    active_stmt = select(func.count(User.id)).where(User.is_active == True)
    active_result = await db.execute(active_stmt)
    active_count = active_result.scalar()
    
    inactive_stmt = select(func.count(User.id)).where(User.is_active == False)
    inactive_result = await db.execute(inactive_stmt)
    inactive_count = inactive_result.scalar()
    
    # Recent registrations (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_stmt = select(func.count(User.id)).where(User.created_at >= thirty_days_ago)
    recent_result = await db.execute(recent_stmt)
    recent_count = recent_result.scalar()
    
    return {
        "success": True,
        "message": "User statistics retrieved successfully",
        "data": {
            "total_users": sum(role_stats.values()),
            "role_distribution": role_stats,
            "active_users": active_count,
            "inactive_users": inactive_count,
            "recent_registrations": recent_count
        }
    } 