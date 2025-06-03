"""
Notification schemas for API requests and responses
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


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
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True 