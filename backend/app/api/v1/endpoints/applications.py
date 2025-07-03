"""
Application management API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, Path, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ApplicationListResponse, ApplicationStatusUpdate, DashboardStats, ApplicationReviewCreate, ProfessorReviewCreate
)
from app.schemas.common import MessageResponse
from app.services.application_service import ApplicationService
from app.services.minio_service import minio_service
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


@router.post("/draft", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def save_application_draft(
    application_data: ApplicationCreate,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Save application as draft"""
    service = ApplicationService(db)
    return await service.save_application_draft(current_user, application_data)


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


@router.get("/{application_id}/files")
async def get_application_files(
    application_id: int = Path(..., description="Application ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all files for an application"""
    from app.models.application import ApplicationFile
    from app.schemas.application import ApplicationFileResponse
    from sqlalchemy import select, and_
    
    # Verify application exists and user has access
    service = ApplicationService(db)
    application = await service.get_application_by_id(application_id, current_user)
    
    # Get files and generate backend proxy URLs with token
    from app.core.config import settings
    from app.core.security import create_access_token
    
    # Generate a temporary token for file access
    token_data = {"sub": str(current_user.id)}
    access_token = create_access_token(token_data)
    
    files_with_urls = []
    for file in application.files or []:
        file_dict = {
            "id": file.id,
            "filename": file.filename,
            "original_filename": file.original_filename,
            "file_size": file.file_size,
            "mime_type": file.mime_type,
            "file_type": file.file_type,
            "is_verified": file.is_verified,
            "uploaded_at": file.uploaded_at,
        }
        
        # Generate backend proxy URLs instead of MinIO direct URLs
        if file.object_name:
            base_url = f"http://localhost:8000{settings.api_v1_str}"
            file_dict["file_path"] = f"{base_url}/files/applications/{application_id}/files/{file.id}?token={access_token}"
            file_dict["download_url"] = f"{base_url}/files/applications/{application_id}/files/{file.id}/download?token={access_token}"
        else:
            file_dict["file_path"] = None
            file_dict["download_url"] = None
            
        files_with_urls.append(file_dict)
    
    return {
        "success": True,
        "message": "Files retrieved successfully",
        "data": files_with_urls
    }


@router.post("/{application_id}/files/upload")
async def upload_file(
    application_id: int = Path(..., description="Application ID"),
    file: UploadFile = File(...),
    file_type: str = Query("other", description="File type"),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Upload file for application using MinIO"""
    service = ApplicationService(db)
    return await service.upload_application_file_minio(application_id, current_user, file, file_type)




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


@router.post("/{application_id}/review", response_model=ApplicationResponse)
async def submit_professor_review(
    application_id: int = Path(..., description="Application ID"),
    review_data: ProfessorReviewCreate = ...,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit professor's review and selected awards for an application"""
    if current_user.role != "professor":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only professors can submit this review.")
    service = ApplicationService(db)
    return await service.create_professor_review(application_id, current_user, review_data)


@router.get("/college/review", response_model=List[ApplicationListResponse])
async def get_college_applications_for_review(
    status: Optional[str] = Query(None, description="Filter by status"),
    scholarship_type: Optional[str] = Query(None, description="Filter by scholarship type"),
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get applications for college review (college role only)"""
    from fastapi import HTTPException
    
    # Ensure user has college role
    if current_user.role != 'college':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="College access required"
        )
    
    service = ApplicationService(db)
    # Get applications that are in submitted or under_review status for college review
    return await service.get_applications_for_review(
        current_user, 
        status or 'submitted',  # Default to submitted for college review
        scholarship_type
    ) 