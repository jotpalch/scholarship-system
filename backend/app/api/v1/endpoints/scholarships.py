from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.deps import get_db
from app.core.security import require_student, require_admin
from app.models.user import User
from app.models.student import Student
from app.models.scholarship import ScholarshipType
from app.schemas.scholarship import ScholarshipTypeResponse
from app.services.scholarship_service import ScholarshipService
from app.core.config import settings
from app.schemas.response import ApiResponse

router = APIRouter()

@router.get("/eligible", response_model=List[ScholarshipTypeResponse])
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
    return await service.get_eligible_scholarships(student)

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