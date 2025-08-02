"""
Notification schemas for API requests and responses
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from app.models.notification import NotificationType, NotificationPriority


class NotificationResponse(BaseModel):
    """Notification response schema"""
    id: int
    title: str
    title_en: Optional[str] = None
    message: str
    message_en: Optional[str] = None
    notification_type: str
    priority: str
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[int] = None
    action_url: Optional[str] = None
    is_read: bool
    is_dismissed: bool
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = Field(None, alias="meta_data")
    
    class Config:
        from_attributes = True
        populate_by_name = True


class NotificationCreate(BaseModel):
    """Schema for creating system announcements"""
    title: str = Field(..., min_length=1, max_length=200, description="公告標題")
    title_en: Optional[str] = Field(None, max_length=200, description="英文標題")
    message: str = Field(..., min_length=1, description="公告內容")
    message_en: Optional[str] = Field(None, description="英文內容")
    notification_type: str = Field(default=NotificationType.INFO.value, description="公告類型")
    priority: str = Field(default=NotificationPriority.NORMAL.value, description="優先級")
    action_url: Optional[str] = Field(None, max_length=500, description="行動連結")
    expires_at: Optional[datetime] = Field(None, description="過期時間")
    metadata: Optional[Dict[str, Any]] = Field(None, description="額外資料")
    
    @validator('notification_type')
    def validate_notification_type(cls, v):
        valid_types = [t.value for t in NotificationType]
        if v not in valid_types:
            raise ValueError(f'Invalid notification type. Must be one of: {valid_types}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        valid_priorities = [p.value for p in NotificationPriority]
        if v not in valid_priorities:
            raise ValueError(f'Invalid priority. Must be one of: {valid_priorities}')
        return v


class NotificationUpdate(BaseModel):
    """Schema for updating system announcements"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    title_en: Optional[str] = Field(None, max_length=200)
    message: Optional[str] = Field(None, min_length=1)
    message_en: Optional[str] = Field(None)
    notification_type: Optional[str] = Field(None)
    priority: Optional[str] = Field(None)
    action_url: Optional[str] = Field(None, max_length=500)
    expires_at: Optional[datetime] = Field(None)
    metadata: Optional[Dict[str, Any]] = Field(None)
    is_dismissed: Optional[bool] = Field(None, description="是否已關閉")
    
    @validator('notification_type')
    def validate_notification_type(cls, v):
        if v is not None:
            valid_types = [t.value for t in NotificationType]
            if v not in valid_types:
                raise ValueError(f'Invalid notification type. Must be one of: {valid_types}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        if v is not None:
            valid_priorities = [p.value for p in NotificationPriority]
            if v not in valid_priorities:
                raise ValueError(f'Invalid priority. Must be one of: {valid_priorities}')
        return v


class NotificationPreferenceBase(BaseModel):
    """Base schema for notification preferences"""
    email_enabled: bool = True
    email_application_updates: bool = True
    email_system_announcements: bool = True
    email_deadline_reminders: bool = True
    email_document_requests: bool = True
    
    push_enabled: bool = True
    push_application_updates: bool = True
    push_system_announcements: bool = True
    push_deadline_reminders: bool = True
    push_document_requests: bool = True
    
    digest_frequency: str = "daily"  # immediate, daily, weekly, disabled
    quiet_hours_start: Optional[str] = None  # Format: "22:00"
    quiet_hours_end: Optional[str] = None    # Format: "08:00"
    
    notification_types: List[str] = ["info", "warning", "error", "success", "reminder"]
    priority_threshold: str = "normal"  # only show notifications of this priority or higher
    
    auto_mark_read_after_days: int = 7
    
    @validator('digest_frequency')
    def validate_digest_frequency(cls, v):
        allowed = ['immediate', 'daily', 'weekly', 'disabled']
        if v not in allowed:
            raise ValueError(f'digest_frequency must be one of {allowed}')
        return v
    
    @validator('priority_threshold')
    def validate_priority_threshold(cls, v):
        allowed = ['low', 'normal', 'high', 'urgent']
        if v not in allowed:
            raise ValueError(f'priority_threshold must be one of {allowed}')
        return v
    
    @validator('quiet_hours_start', 'quiet_hours_end')
    def validate_time_format(cls, v):
        if v is not None:
            import re
            if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
                raise ValueError('Time must be in HH:MM format')
        return v
    
    @validator('notification_types')
    def validate_notification_types(cls, v):
        allowed = ['info', 'warning', 'error', 'success', 'reminder']
        for ntype in v:
            if ntype not in allowed:
                raise ValueError(f'notification_type must be one of {allowed}')
        return v
    
    @validator('auto_mark_read_after_days')
    def validate_auto_mark_read_days(cls, v):
        if v < 1 or v > 365:
            raise ValueError('auto_mark_read_after_days must be between 1 and 365')
        return v


class NotificationPreferenceCreate(NotificationPreferenceBase):
    """Schema for creating notification preferences"""
    pass


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences"""
    email_enabled: Optional[bool] = None
    email_application_updates: Optional[bool] = None
    email_system_announcements: Optional[bool] = None
    email_deadline_reminders: Optional[bool] = None
    email_document_requests: Optional[bool] = None
    
    push_enabled: Optional[bool] = None
    push_application_updates: Optional[bool] = None
    push_system_announcements: Optional[bool] = None
    push_deadline_reminders: Optional[bool] = None
    push_document_requests: Optional[bool] = None
    
    digest_frequency: Optional[str] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    
    notification_types: Optional[List[str]] = None
    priority_threshold: Optional[str] = None
    
    auto_mark_read_after_days: Optional[int] = None
    
    # Apply same validators as base class
    @validator('digest_frequency')
    def validate_digest_frequency(cls, v):
        if v is not None:
            allowed = ['immediate', 'daily', 'weekly', 'disabled']
            if v not in allowed:
                raise ValueError(f'digest_frequency must be one of {allowed}')
        return v
    
    @validator('priority_threshold')
    def validate_priority_threshold(cls, v):
        if v is not None:
            allowed = ['low', 'normal', 'high', 'urgent']
            if v not in allowed:
                raise ValueError(f'priority_threshold must be one of {allowed}')
        return v
    
    @validator('quiet_hours_start', 'quiet_hours_end')
    def validate_time_format(cls, v):
        if v is not None:
            import re
            if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
                raise ValueError('Time must be in HH:MM format')
        return v
    
    @validator('notification_types')
    def validate_notification_types(cls, v):
        if v is not None:
            allowed = ['info', 'warning', 'error', 'success', 'reminder']
            for ntype in v:
                if ntype not in allowed:
                    raise ValueError(f'notification_type must be one of {allowed}')
        return v
    
    @validator('auto_mark_read_after_days')
    def validate_auto_mark_read_days(cls, v):
        if v is not None and (v < 1 or v > 365):
            raise ValueError('auto_mark_read_after_days must be between 1 and 365')
        return v


class NotificationPreferenceResponse(NotificationPreferenceBase):
    """Response schema for notification preferences"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True 