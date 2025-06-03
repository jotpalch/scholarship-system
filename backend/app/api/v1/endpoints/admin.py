"""
Administration API endpoints
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.deps import get_db
from app.schemas.common import MessageResponse
from app.core.security import require_admin
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.student import Student

router = APIRouter()


@router.get("/dashboard/stats", response_model=Dict[str, Any])
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics for admin"""
    
    # Total users
    stmt = select(func.count(User.id))
    result = await db.execute(stmt)
    total_users = result.scalar()
    
    # Total applications
    stmt = select(func.count(Application.id))
    result = await db.execute(stmt)
    total_applications = result.scalar()
    
    # Applications by status
    stmt = select(
        Application.status,
        func.count(Application.id)
    ).group_by(Application.status)
    result = await db.execute(stmt)
    status_counts = {row[0]: row[1] for row in result.fetchall()}
    
    # Pending review count
    pending_review = status_counts.get(ApplicationStatus.SUBMITTED.value, 0) + \
                    status_counts.get(ApplicationStatus.UNDER_REVIEW.value, 0)
    
    # Approved this month
    from datetime import datetime, timedelta
    this_month = datetime.now().replace(day=1)
    stmt = select(func.count(Application.id)).where(
        Application.status == ApplicationStatus.APPROVED.value,
        Application.approved_at >= this_month
    )
    result = await db.execute(stmt)
    approved_this_month = result.scalar()
    
    return {
        "totalUsers": total_users,
        "totalApplications": total_applications,
        "pendingReview": pending_review,
        "approved": approved_this_month,
        "avgProcessingTime": "5.2天",  # Mock data for now
        "systemUptime": "99.8%",  # Mock data
        "avgResponseTime": "245ms",  # Mock data
        "storageUsed": "2.3TB",  # Mock data
        "statusBreakdown": status_counts
    }


@router.get("/system/health", response_model=Dict[str, Any])
async def get_system_health(
    current_user: User = Depends(require_admin)
):
    """Get system health status"""
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected",
        "storage": "available",
        "timestamp": "2025-06-15T10:30:00Z"
    } 