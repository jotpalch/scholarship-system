from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.deps import get_db
from app.core.security import require_student, require_admin
from app.models.user import User
from app.models.student import Student
from app.models.scholarship import ScholarshipType
from app.schemas.scholarship import (
    ScholarshipTypeResponse,
    CombinedScholarshipCreate,
    ScholarshipTypeCreate,
)
from app.services.scholarship_service import ScholarshipService
from app.core.config import settings
from app.schemas.response import ApiResponse
from app.utils.response import api_response

router = APIRouter()

@router.get("/eligible", response_model=ApiResponse[List[ScholarshipTypeResponse]])
async def get_eligible_scholarships(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Get scholarships that the current student is eligible for"""
    # Import the utility function
    from app.services.application_service import get_student_from_user
    
    # Get student profile
    student = await get_student_from_user(current_user, db)
    
    if not student:
        raise HTTPException(
            status_code=404, 
            detail=f"Student profile not found for user {current_user.username}"
        )
    
    service = ScholarshipService(db)
    scholarships = await service.get_eligible_scholarships(student)
    return api_response(data=scholarships, message="Eligible scholarships retrieved successfully")

@router.get("/{scholarship_id}", response_model=ApiResponse[ScholarshipTypeResponse])
async def get_scholarship_detail(
    scholarship_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get scholarship details including sub-scholarships for combined types"""
    service = ScholarshipService(db)
    scholarship = await service.get_scholarship_with_sub_types(scholarship_id)
    
    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    
    return api_response(data=scholarship, message="Scholarship detail retrieved successfully")

@router.post("/combined/doctoral", response_model=ScholarshipTypeResponse)
async def create_combined_doctoral_scholarship(
    data: CombinedScholarshipCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a combined doctoral scholarship (MOST + MOE)"""
    service = ScholarshipService(db)
    
    # 預設的子獎學金設定
    if not data.sub_scholarships:
        data.sub_scholarships = [
            {
                "code": "doctoral_most",
                "name": "國科會博士生獎學金",
                "name_en": "MOST Doctoral Scholarship",
                "description": "國科會提供的博士生研究獎學金",
                "description_en": "Doctoral research scholarship provided by MOST",
                "sub_type": "most",
                "amount": 40000,
                "min_gpa": 3.7,
                "max_ranking_percent": 20,
                "required_documents": ["transcript", "research_proposal", "recommendation_letter"],
                "application_start_date": data.application_start_date,
                "application_end_date": data.application_end_date
            },
            {
                "code": "doctoral_moe",
                "name": "教育部博士生獎學金",
                "name_en": "MOE Doctoral Scholarship",
                "description": "教育部提供的博士生學術獎學金",
                "description_en": "Doctoral academic scholarship provided by MOE",
                "sub_type": "moe",
                "amount": 35000,
                "min_gpa": 3.5,
                "max_ranking_percent": 30,
                "required_documents": ["transcript", "research_proposal"],
                "application_start_date": data.application_start_date,
                "application_end_date": data.application_end_date
            }
        ]
    
    scholarship = await service.create_combined_doctoral_scholarship(data)
    
    return ApiResponse(
        success=True,
        message="Combined doctoral scholarship created successfully",
        data=scholarship
    )

@router.get("/combined/list", response_model=ApiResponse[List[ScholarshipTypeResponse]])
async def get_combined_scholarships(
    db: AsyncSession = Depends(get_db)
):
    """Get all combined scholarships"""
    stmt = select(ScholarshipType).where(ScholarshipType.is_combined == True)
    result = await db.execute(stmt)
    scholarships = result.scalars().all()
    
    # Load sub-scholarships for each combined scholarship
    for scholarship in scholarships:
        sub_stmt = select(ScholarshipType).where(
            ScholarshipType.parent_scholarship_id == scholarship.id
        )
        sub_result = await db.execute(sub_stmt)
        scholarship.sub_scholarships = sub_result.scalars().all()
    
    return api_response(data=scholarships, message="Combined scholarships retrieved successfully")

@router.post("/dev/reset-application-periods")
async def reset_application_periods(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reset all scholarship application periods for testing (dev only)"""
    if not settings.debug:
        raise HTTPException(status_code=403, detail="Only available in development mode")
    
    from datetime import datetime, timezone, timedelta
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=30)
    end_date = now + timedelta(days=30)
    
    stmt = select(ScholarshipType)
    result = await db.execute(stmt)
    scholarships = result.scalars().all()
    
    for scholarship in scholarships:
        scholarship.application_start_date = start_date
        scholarship.application_end_date = end_date
    
    await db.commit()
    
    return ApiResponse(
        success=True,
        message=f"Reset {len(scholarships)} scholarship application periods",
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "scholarships_updated": len(scholarships)
        }
    )

@router.post("/dev/toggle-whitelist/{scholarship_id}")
async def toggle_scholarship_whitelist(
    scholarship_id: int,
    enable: bool = True,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Toggle scholarship whitelist for testing (dev only)"""
    if not settings.debug:
        raise HTTPException(status_code=403, detail="Only available in development mode")
    
    stmt = select(ScholarshipType).where(ScholarshipType.id == scholarship_id)
    result = await db.execute(stmt)
    scholarship = result.scalar_one_or_none()
    
    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    
    scholarship.whitelist_enabled = enable
    if not enable:
        scholarship.whitelist_student_ids = []
    
    await db.commit()
    
    return ApiResponse(
        success=True,
        message=f"Whitelist {'enabled' if enable else 'disabled'} for {scholarship.name}",
        data={
            "scholarship_id": scholarship_id,
            "scholarship_name": scholarship.name,
            "whitelist_enabled": scholarship.whitelist_enabled
        }
    )

@router.post("/dev/add-to-whitelist/{scholarship_id}")
async def add_student_to_whitelist(
    scholarship_id: int,
    student_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Add student to scholarship whitelist (dev only)"""
    if not settings.debug:
        raise HTTPException(status_code=403, detail="Only available in development mode")
    
    stmt = select(ScholarshipType).where(ScholarshipType.id == scholarship_id)
    result = await db.execute(stmt)
    scholarship = result.scalar_one_or_none()
    
    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    
    # 確保白名單是列表
    if not scholarship.whitelist_student_ids:
        scholarship.whitelist_student_ids = []
    
    # 加入學生ID（如果不存在）
    if student_id not in scholarship.whitelist_student_ids:
        scholarship.whitelist_student_ids.append(student_id)
        scholarship.whitelist_enabled = True
    
    await db.commit()
    
    return ApiResponse(
        success=True,
        message=f"Student {student_id} added to {scholarship.name} whitelist",
        data={
            "scholarship_id": scholarship_id,
            "student_id": student_id,
            "whitelist_size": len(scholarship.whitelist_student_ids)
        }
    ) 