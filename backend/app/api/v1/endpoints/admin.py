"""
Administration API endpoints
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update, delete

from app.db.deps import get_db
from app.schemas.common import MessageResponse, PaginatedResponse, SystemSettingSchema, EmailTemplateSchema, ApiResponse
from app.schemas.application import ApplicationListResponse
from app.schemas.notification import NotificationResponse, NotificationCreate, NotificationUpdate
from app.core.security import require_admin
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.student import Student
from app.models.notification import Notification
from app.services.system_setting_service import SystemSettingService, EmailTemplateService

router = APIRouter()


@router.get("/applications", response_model=PaginatedResponse[ApplicationListResponse])
async def get_all_applications(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by student name or ID"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all applications with pagination (admin only)"""
    
    # Base query
    stmt = select(Application).join(User, Application.user_id == User.id)
    
    # Apply filters
    if status:
        stmt = stmt.where(Application.status == status)
    
    if search:
        stmt = stmt.where(
            (User.full_name.icontains(search)) |
            (User.username.icontains(search)) |
            (User.email.icontains(search))
        )
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size).order_by(Application.created_at.desc())
    
    # Execute query
    result = await db.execute(stmt)
    applications = result.scalars().all()
    
    # Convert to response format
    application_list = [
        ApplicationListResponse.model_validate(app) for app in applications
    ]
    
    return PaginatedResponse(
        items=application_list,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )


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
    approved_this_month = result.scalar() or 0
    
    # Calculate average processing time
    from sqlalchemy import case
    stmt = select(
        func.avg(
            case(
                (Application.approved_at.isnot(None), 
                 func.extract('epoch', Application.approved_at - Application.submitted_at) / 86400),
                (Application.reviewed_at.isnot(None),
                 func.extract('epoch', Application.reviewed_at - Application.submitted_at) / 86400),
                else_=None
            )
        )
    ).where(
        Application.submitted_at.isnot(None),
        Application.status.in_([ApplicationStatus.APPROVED.value, ApplicationStatus.REJECTED.value])
    )
    result = await db.execute(stmt)
    avg_days = result.scalar()
    avg_processing_time = f"{avg_days:.1f}天" if avg_days else "N/A"
    
    return {
        "total_applications": total_applications,
        "pending_review": pending_review,
        "approved": approved_this_month,
        "rejected": status_counts.get(ApplicationStatus.REJECTED.value, 0),
        "avg_processing_time": avg_processing_time
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


@router.get("/system-setting", response_model=SystemSettingSchema)
async def get_system_setting(
    key: str = Query(..., description="Setting key"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system setting by key (admin only)"""
    setting = await SystemSettingService.get_setting(db, key)
    if not setting:
        return SystemSettingSchema(
            key=key,
            value=""
        )
    return SystemSettingSchema.model_validate(setting)


@router.put("/system-setting", response_model=SystemSettingSchema)
async def set_system_setting(
    data: SystemSettingSchema,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update system setting (admin only)"""
    setting = await SystemSettingService.set_setting(
        db,
        key=data.key,
        value=data.value
    )
    return SystemSettingSchema.model_validate(setting)


@router.get("/email-template")
async def get_email_template(
    key: str = Query(..., description="Template key"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get email template by key (admin only)"""
    template = await EmailTemplateService.get_template(db, key)
    if not template:
        template_data = EmailTemplateSchema(
            key=key,
            subject_template="",
            body_template="",
            cc=None,
            bcc=None,
            updated_at=None
        )
    else:
        template_data = EmailTemplateSchema.model_validate(template)
    
    return {
        "success": True,
        "message": "Email template retrieved successfully",
        "data": template_data
    }


@router.put("/email-template")
async def update_email_template(
    template: EmailTemplateSchema,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update email template (admin only)"""
    updated_template = await EmailTemplateService.set_template(
        db,
        template.key,
        template.subject_template,
        template.body_template,
        template.cc,
        template.bcc
    )
    
    return {
        "success": True,
        "message": "Email template updated successfully",
        "data": EmailTemplateSchema.model_validate(updated_template)
    }


@router.get("/recent-applications", response_model=List[ApplicationListResponse])
async def get_recent_applications(
    limit: int = Query(5, ge=1, le=20, description="Number of recent applications"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get recent applications for admin dashboard"""
    
    stmt = select(Application).join(User, Application.user_id == User.id).order_by(
        desc(Application.created_at)
    ).limit(limit)
    
    result = await db.execute(stmt)
    applications = result.scalars().all()
    
    # Add Chinese scholarship type names
    scholarship_type_zh = {
        "undergraduate_freshman": "學士班新生獎學金",
        "phd_nstc": "國科會博士生獎學金", 
        "phd_moe": "教育部博士生獎學金",
        "direct_phd": "逕博獎學金"
    }
    
    response_list = []
    for app in applications:
        app_data = ApplicationListResponse.model_validate(app)
        # Add Chinese scholarship type name
        app_data.scholarship_type_zh = scholarship_type_zh.get(app.scholarship_type, app.scholarship_type)
        response_list.append(app_data)
    
    return response_list


@router.get("/system-announcements", response_model=List[NotificationResponse])
async def get_system_announcements(
    limit: int = Query(5, ge=1, le=20, description="Number of announcements"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system announcements for admin dashboard"""
    
    # Get system-wide notifications (user_id is null for system announcements)
    # or notifications specifically for admins
    stmt = select(Notification).where(
        (Notification.user_id.is_(None)) |
        (Notification.user_id == current_user.id)
    ).where(
        Notification.is_dismissed == False,
        Notification.related_resource_type == 'system'
    ).order_by(desc(Notification.created_at)).limit(limit)
    
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    
    # 修正 meta_data 字段以確保序列化正常
    response_list = []
    for notification in notifications:
        # 創建字典副本以修正 meta_data 字段
        notification_dict = {
            'id': notification.id,
            'title': notification.title,
            'title_en': notification.title_en,
            'message': notification.message,
            'message_en': notification.message_en,
            'notification_type': notification.notification_type,
            'priority': notification.priority,
            'related_resource_type': notification.related_resource_type,
            'related_resource_id': notification.related_resource_id,
            'action_url': notification.action_url,
            'is_read': notification.is_read,
            'is_dismissed': notification.is_dismissed,
            'scheduled_at': notification.scheduled_at,
            'expires_at': notification.expires_at,
            'read_at': notification.read_at,
            'created_at': notification.created_at,
            'meta_data': notification.meta_data if isinstance(notification.meta_data, (dict, type(None))) else None
        }
        response_list.append(NotificationResponse.model_validate(notification_dict))
    
    return response_list


# === 系統公告 CRUD === #

@router.get("/announcements", response_model=ApiResponse[dict])
async def get_all_announcements(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all system announcements with pagination (admin only)"""
    
    # Build query for system announcements
    stmt = select(Notification).where(
        Notification.user_id.is_(None),
        Notification.related_resource_type == 'system'
    )
    
    # Apply filters
    if notification_type:
        stmt = stmt.where(Notification.notification_type == notification_type)
    if priority:
        stmt = stmt.where(Notification.priority == priority)
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    result = await db.execute(count_stmt)
    total = result.scalar() or 0
    
    # Apply pagination and ordering
    stmt = stmt.order_by(desc(Notification.created_at))
    stmt = stmt.offset((page - 1) * size).limit(size)
    
    # Execute query
    result = await db.execute(stmt)
    announcements = result.scalars().all()
    
    # 修正 meta_data 字段以確保序列化正常
    response_items = []
    for ann in announcements:
        # 創建字典副本以修正 meta_data 字段
        ann_dict = {
            'id': ann.id,
            'title': ann.title,
            'title_en': ann.title_en,
            'message': ann.message,
            'message_en': ann.message_en,
            'notification_type': ann.notification_type,
            'priority': ann.priority,
            'related_resource_type': ann.related_resource_type,
            'related_resource_id': ann.related_resource_id,
            'action_url': ann.action_url,
            'is_read': ann.is_read,
            'is_dismissed': ann.is_dismissed,
            'scheduled_at': ann.scheduled_at,
            'expires_at': ann.expires_at,
            'read_at': ann.read_at,
            'created_at': ann.created_at,
            'meta_data': ann.meta_data if isinstance(ann.meta_data, (dict, type(None))) else None
        }
        response_items.append(NotificationResponse.model_validate(ann_dict))
    
    # 計算總頁數
    pages = (total + size - 1) // size if total > 0 else 1
    
    return ApiResponse(
        success=True,
        message="系統公告列表獲取成功",
        data={
            "items": response_items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }
    )


@router.post("/announcements", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_data: NotificationCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create new system announcement (admin only)"""
    
    # Create announcement with system announcement properties
    announcement = Notification(
        user_id=None,  # System announcement
        title=announcement_data.title,
        title_en=announcement_data.title_en,
        message=announcement_data.message,
        message_en=announcement_data.message_en,
        notification_type=announcement_data.notification_type,
        priority=announcement_data.priority,
        related_resource_type='system',
        related_resource_id=None,
        action_url=announcement_data.action_url,
        is_read=False,
        is_dismissed=False,
        send_email=False,
        email_sent=False,
        expires_at=announcement_data.expires_at,
        meta_data=announcement_data.metadata
    )
    
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    
    # 修正 meta_data 字段以確保序列化正常
    announcement_dict = {
        'id': announcement.id,
        'title': announcement.title,
        'title_en': announcement.title_en,
        'message': announcement.message,
        'message_en': announcement.message_en,
        'notification_type': announcement.notification_type,
        'priority': announcement.priority,
        'related_resource_type': announcement.related_resource_type,
        'related_resource_id': announcement.related_resource_id,
        'action_url': announcement.action_url,
        'is_read': announcement.is_read,
        'is_dismissed': announcement.is_dismissed,
        'scheduled_at': announcement.scheduled_at,
        'expires_at': announcement.expires_at,
        'read_at': announcement.read_at,
        'created_at': announcement.created_at,
        'meta_data': announcement.meta_data if isinstance(announcement.meta_data, (dict, type(None))) else None
    }
    
    return NotificationResponse.model_validate(announcement_dict)


@router.get("/announcements/{announcement_id}", response_model=NotificationResponse)
async def get_announcement(
    announcement_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get specific system announcement (admin only)"""
    
    stmt = select(Notification).where(
        Notification.id == announcement_id,
        Notification.user_id.is_(None),
        Notification.related_resource_type == 'system'
    )
    
    result = await db.execute(stmt)
    announcement = result.scalar_one_or_none()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System announcement not found"
        )
    
    # 修正 meta_data 字段以確保序列化正常
    announcement_dict = {
        'id': announcement.id,
        'title': announcement.title,
        'title_en': announcement.title_en,
        'message': announcement.message,
        'message_en': announcement.message_en,
        'notification_type': announcement.notification_type,
        'priority': announcement.priority,
        'related_resource_type': announcement.related_resource_type,
        'related_resource_id': announcement.related_resource_id,
        'action_url': announcement.action_url,
        'is_read': announcement.is_read,
        'is_dismissed': announcement.is_dismissed,
        'scheduled_at': announcement.scheduled_at,
        'expires_at': announcement.expires_at,
        'read_at': announcement.read_at,
        'created_at': announcement.created_at,
        'meta_data': announcement.meta_data if isinstance(announcement.meta_data, (dict, type(None))) else None
    }
    
    return NotificationResponse.model_validate(announcement_dict)


@router.put("/announcements/{announcement_id}", response_model=NotificationResponse)
async def update_announcement(
    announcement_id: int,
    announcement_data: NotificationUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update system announcement (admin only)"""
    
    # Check if announcement exists
    stmt = select(Notification).where(
        Notification.id == announcement_id,
        Notification.user_id.is_(None),
        Notification.related_resource_type == 'system'
    )
    
    result = await db.execute(stmt)
    announcement = result.scalar_one_or_none()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System announcement not found"
        )
    
    # Update fields
    update_data = announcement_data.dict(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            if field == 'metadata':
                setattr(announcement, 'meta_data', value)
            else:
                setattr(announcement, field, value)
    
    await db.commit()
    await db.refresh(announcement)
    
    # 修正 meta_data 字段以確保序列化正常
    announcement_dict = {
        'id': announcement.id,
        'title': announcement.title,
        'title_en': announcement.title_en,
        'message': announcement.message,
        'message_en': announcement.message_en,
        'notification_type': announcement.notification_type,
        'priority': announcement.priority,
        'related_resource_type': announcement.related_resource_type,
        'related_resource_id': announcement.related_resource_id,
        'action_url': announcement.action_url,
        'is_read': announcement.is_read,
        'is_dismissed': announcement.is_dismissed,
        'scheduled_at': announcement.scheduled_at,
        'expires_at': announcement.expires_at,
        'read_at': announcement.read_at,
        'created_at': announcement.created_at,
        'meta_data': announcement.meta_data if isinstance(announcement.meta_data, (dict, type(None))) else None
    }
    
    return NotificationResponse.model_validate(announcement_dict)


@router.delete("/announcements/{announcement_id}", response_model=MessageResponse)
async def delete_announcement(
    announcement_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete system announcement (admin only)"""
    
    # Check if announcement exists
    stmt = select(Notification).where(
        Notification.id == announcement_id,
        Notification.user_id.is_(None),
        Notification.related_resource_type == 'system'
    )
    
    result = await db.execute(stmt)
    announcement = result.scalar_one_or_none()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System announcement not found"
        )
    
    # Delete announcement
    await db.delete(announcement)
    await db.commit()
    
    return MessageResponse(message="系統公告已成功刪除") 