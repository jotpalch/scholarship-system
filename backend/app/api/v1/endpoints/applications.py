"""
Application management API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, UploadFile, File, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

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
    print(f"[API Debug] Received application creation request from user: {current_user.id}")
    print(f"[API Debug] Raw request data: {application_data.dict(exclude_none=True)}")
    
    try:
        service = ApplicationService(db)
        
        # Get student profile from user
        print("[API Debug] Fetching student profile")
        from app.services.application_service import get_student_from_user
        student = await get_student_from_user(current_user, db)
        
        if not student:
            print(f"[API Error] Student profile not found for user: {current_user.id}")
            print(f"[API Debug] User data: {current_user.dict(exclude={'hashed_password'})}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Student profile not found",
                    "user_id": current_user.id,
                    "student_no": getattr(current_user, 'student_no', None),
                    "error_code": "STUDENT_NOT_FOUND"
                }
            )
            
        print(f"[API Debug] Found student profile: {student.id}")
        
        # Validate scholarship type exists
        if not application_data.scholarship_type:
            print("[API Error] Missing scholarship_type")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Scholarship type is required",
                    "error_code": "MISSING_SCHOLARSHIP_TYPE",
                    "received_data": application_data.dict(exclude_none=True)
                }
            )
            
        # Validate form data
        print("[API Debug] Validating form data")
        if not application_data.form_data:
            print("[API Error] Missing form_data")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Form data is required",
                    "error_code": "MISSING_FORM_DATA",
                    "received_data": application_data.dict(exclude_none=True)
                }
            )
            
        try:
            # Try to validate form data structure
            print("[API Debug] Validating form data structure")
            form_data_dict = application_data.form_data.dict()
            print(f"[API Debug] Form data validated: {form_data_dict}")
        except Exception as e:
            print(f"[API Error] Form data validation failed: {str(e)}")
            print(f"[API Error] Raw form data: {application_data.form_data}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Invalid form data structure",
                    "error_code": "INVALID_FORM_DATA",
                    "error": str(e),
                    "received_form_data": str(application_data.form_data)
                }
            )
        
        print("[API Debug] Creating application")
        result = await service.create_application(
            user_id=current_user.id,
            student_id=student.id,
            application_data=application_data
        )
        print(f"[API Debug] Application created successfully: {result.app_id}")
        return result
        
    except ValidationError as e:
        print(f"[API Error] Validation error: {str(e)}")
        if hasattr(e, 'errors'):
            print(f"[API Debug] Validation errors: {e.errors()}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Validation error",
                "error_code": "VALIDATION_ERROR",
                "errors": e.errors() if hasattr(e, 'errors') else str(e),
                "received_data": application_data.dict(exclude_none=True)
            }
        )
    except Exception as e:
        print(f"[API Error] Unexpected error: {str(e)}")
        import traceback
        error_trace = traceback.format_exc()
        print(f"[API Error] Full traceback: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "An error occurred while creating the application",
                "error_code": "INTERNAL_SERVER_ERROR",
                "error": str(e),
                "error_type": type(e).__name__
            }
        )


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


@router.put("/{application_id}")
async def update_application(
    application_id: int = Path(..., description="Application ID"),
    update_data: ApplicationUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update application"""
    service = ApplicationService(db)
    return await service.update_application(application_id, update_data, current_user)


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
    """Get all files for an application - 現在從 submitted_form_data.documents 中獲取"""
    from app.models.application import ApplicationFile
    from app.schemas.application import ApplicationFileResponse
    from sqlalchemy import select, and_
    
    # Verify application exists and user has access
    service = ApplicationService(db)
    application = await service.get_application_by_id(application_id, current_user)
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # 從 submitted_form_data.documents 中獲取文件資訊
    files_with_urls = []
    if application.submitted_form_data and 'documents' in application.submitted_form_data:
        for doc in application.submitted_form_data['documents']:
            if 'file_id' in doc and doc['file_id']:
                file_dict = {
                    "id": doc['file_id'],
                    "filename": doc.get('filename', ''),
                    "original_filename": doc.get('original_filename', ''),
                    "file_size": doc.get('file_size'),
                    "mime_type": doc.get('mime_type'),
                    "file_type": doc.get('document_type', ''),
                    "is_verified": doc.get('is_verified', False),
                    "uploaded_at": doc.get('upload_time'),
                    "file_path": doc.get('file_path'),
                    "download_url": doc.get('download_url')
                }
                files_with_urls.append(file_dict)
    
    # 如果 submitted_form_data.documents 中沒有文件資訊，嘗試從獨立的 files 欄位獲取（向後兼容）
    if not files_with_urls and application.files:
        # Generate a temporary token for file access
        from app.core.config import settings
        from app.core.security import create_access_token
        
        token_data = {"sub": str(current_user.id)}
        access_token = create_access_token(token_data)
        
        for file in application.files:
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload file for application using MinIO"""
    service = ApplicationService(db)
    return await service.upload_application_file_minio(application_id, current_user, file, file_type)




# Staff/Admin endpoints
@router.get("/review/list", response_model=List[ApplicationListResponse])
async def get_applications_for_review(
    status: Optional[str] = Query(None, description="Filter by status"),
    scholarship_type_id: Optional[int] = Query(None, description="Filter by scholarship type ID"),
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get applications for review (staff only)"""
    service = ApplicationService(db)
    return await service.get_applications_for_review(current_user, status, scholarship_type_id)


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