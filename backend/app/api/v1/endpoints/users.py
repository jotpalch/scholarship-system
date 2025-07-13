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
from app.schemas.common import MessageResponse, PaginatedResponse
from app.core.security import get_current_user, require_admin, require_super_admin
from app.models.user import User, UserRole, UserType, EmployeeStatus
from app.services.auth_service import AuthService

router = APIRouter()


def convert_user_to_dict(user: User) -> dict:
    """Convert User model to dictionary for Pydantic validation"""
    return {
        "id": user.id,
        "nycu_id": user.nycu_id,
        "name": user.name,
        "email": user.email,
        "user_type": user.user_type.value if user.user_type else None,
        "status": user.status.value if user.status else None,
        "dept_code": user.dept_code,
        "dept_name": user.dept_name,
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
        "comment": user.comment,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
    }


@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return {
        "success": True,
        "message": "User profile retrieved successfully",
        "data": convert_user_to_dict(current_user)
    }


@router.get("/student-info")
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
    
    return {
        "success": True,
        "message": "Student information retrieved successfully",
        "data": {
            "student": student,
            "latest_term": latest_term,
            "contact": contact,
            "academic_records": academic_records
        }
    }


@router.put("/me")
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
    
    return {
        "success": True,
        "message": "Profile updated successfully",
        "data": convert_user_to_dict(current_user)
    }


# ==================== 管理員專用API ====================

@router.get("/")
async def get_all_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name, email, or nycu_id"),
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
            (User.name.icontains(search)) |
            (User.email.icontains(search)) |
            (User.nycu_id.icontains(search)) |
            (User.dept_name.icontains(search))
        )
    
    # Remove is_active filter since we removed that field
    # All users are considered active in the new model
    
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
    
    existing_nycu_id = await auth_service.get_user_by_nycu_id(user_data.nycu_id)
    if existing_nycu_id:
        raise HTTPException(status_code=409, detail="NYCU ID already taken")
    
    # Create user
    user = await auth_service.register_user(user_data)
    
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
    
    # User type distribution
    user_type_stats = {}
    for user_type in UserType:
        stmt = select(func.count(User.id)).where(User.user_type == user_type)
        result = await db.execute(stmt)
        count = result.scalar()
        user_type_stats[user_type.value] = count
    
    # Status distribution
    status_stats = {}
    for status in EmployeeStatus:
        stmt = select(func.count(User.id)).where(User.status == status)
        result = await db.execute(stmt)
        count = result.scalar()
        status_stats[status.value] = count
    
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
            "user_type_distribution": user_type_stats,
            "status_distribution": status_stats,
            "recent_registrations": recent_count
        }
    } 