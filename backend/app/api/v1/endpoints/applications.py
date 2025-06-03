"""
Application management API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, Path, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ApplicationListResponse, ApplicationStatusUpdate, DashboardStats
)
from app.schemas.common import MessageResponse
from app.services.application_service import ApplicationService
from app.core.security import get_current_user, require_student, require_staff
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    application_data: ApplicationCreate,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Create a new scholarship application"""
    service = ApplicationService(db)
    return await service.create_application(current_user, application_data)


@router.get("/", response_model=List[ApplicationListResponse])
async def get_my_applications(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's applications"""
    service = ApplicationService(db)
    return await service.get_user_applications(current_user, status)


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics for student"""
    service = ApplicationService(db)
    return await service.get_student_dashboard_stats(current_user)


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: int = Path(..., description="Application ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get application by ID"""
    service = ApplicationService(db)
    return await service.get_application_by_id(application_id, current_user)


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: int = Path(..., description="Application ID"),
    update_data: ApplicationUpdate = ...,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Update application"""
    service = ApplicationService(db)
    return await service.update_application(application_id, current_user, update_data)


@router.post("/{application_id}/submit", response_model=ApplicationResponse)
async def submit_application(
    application_id: int = Path(..., description="Application ID"),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Submit application for review"""
    service = ApplicationService(db)
    return await service.submit_application(application_id, current_user)


@router.post("/{application_id}/files/upload")
async def upload_file(
    application_id: int = Path(..., description="Application ID"),
    file: UploadFile = File(...),
    file_type: str = Query("other", description="File type"),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Upload file for application"""
    service = ApplicationService(db)
    return await service.upload_application_file(application_id, current_user, file, file_type)


# Staff/Admin endpoints
@router.get("/review/list", response_model=List[ApplicationListResponse])
async def get_applications_for_review(
    status: Optional[str] = Query(None, description="Filter by status"),
    scholarship_type: Optional[str] = Query(None, description="Filter by scholarship type"),
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get applications for review (staff only)"""
    service = ApplicationService(db)
    return await service.get_applications_for_review(current_user, status, scholarship_type)


@router.put("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: int = Path(..., description="Application ID"),
    status_update: ApplicationStatusUpdate = ...,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update application status (staff only)"""
    service = ApplicationService(db)
    return await service.update_application_status(application_id, current_user, status_update) 