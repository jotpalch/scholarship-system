"""
Notification model for system messages
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class NotificationType(enum.Enum):
    """Notification type enum"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"
    REMINDER = "reminder"


class NotificationPriority(enum.Enum):
    """Notification priority enum"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    """Notification model for user messages"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 通知內容
    title = Column(String(200), nullable=False)
    title_en = Column(String(200))
    message = Column(Text, nullable=False)
    message_en = Column(Text)
    
    # 通知類型與優先級
    notification_type = Column(String(20), default=NotificationType.INFO.value)
    priority = Column(String(20), default=NotificationPriority.NORMAL.value)
    
    # 相關資源
    related_resource_type = Column(String(50))  # application, review, system, etc.
    related_resource_id = Column(Integer)
    action_url = Column(String(500))  # 點擊後導向的URL
    
    # 狀態
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    
    # 發送設定
    send_email = Column(Boolean, default=False)
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime(timezone=True))
    
    # 時間設定
    scheduled_at = Column(DateTime(timezone=True))  # 預定發送時間
    expires_at = Column(DateTime(timezone=True))   # 過期時間
    read_at = Column(DateTime(timezone=True))      # 讀取時間
    
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 額外資料
    meta_data = Column(JSON)  # 額外的通知資料
    
    # 關聯
    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, title={self.title})>"
    
    @property
    def is_expired(self) -> bool:
        """Check if notification is expired"""
        if self.expires_at:
            return bool(datetime.now() > self.expires_at)
        return False
    
    @property
    def is_urgent(self) -> bool:
        """Check if notification is urgent"""
        return bool(self.priority == NotificationPriority.URGENT.value)
    
    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = datetime.now()
    
    def dismiss(self):
        """Dismiss notification"""
        self.is_dismissed = True 