"""
Notification model for system messages
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, UniqueConstraint
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 系統公告的 user_id 為 null
    
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
    
    # 狀態 (deprecated for system announcements, use NotificationRead instead)
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
    read_records = relationship("NotificationRead", back_populates="notification", cascade="all, delete-orphan")

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
    
    @property
    def is_system_announcement(self) -> bool:
        """Check if this is a system announcement"""
        return self.user_id is None
    
    def mark_as_read(self):
        """Mark notification as read (for personal notifications only)"""
        if not self.is_system_announcement:
            self.is_read = True
            self.read_at = datetime.now()
    
    def dismiss(self):
        """Dismiss notification"""
        self.is_dismissed = True


class NotificationRead(Base):
    """Track per-user read status for notifications"""
    __tablename__ = "notification_reads"
    
    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # 讀取狀態
    is_read = Column(Boolean, default=True)  # 創建記錄就表示已讀
    read_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯
    notification = relationship("Notification", back_populates="read_records")
    user = relationship("User")
    
    # 確保每個用戶對每個通知只有一個讀取記錄
    __table_args__ = (
        UniqueConstraint('notification_id', 'user_id', name='_notification_user_read_uc'),
    )
    
    def __repr__(self):
        return f"<NotificationRead(notification_id={self.notification_id}, user_id={self.user_id}, read_at={self.read_at})>"


class NotificationPreference(Base):
    """User notification preferences model"""
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Email preferences
    email_enabled = Column(Boolean, default=True)
    email_application_updates = Column(Boolean, default=True)
    email_system_announcements = Column(Boolean, default=True)
    email_deadline_reminders = Column(Boolean, default=True)
    email_document_requests = Column(Boolean, default=True)
    
    # In-app preferences
    push_enabled = Column(Boolean, default=True)
    push_application_updates = Column(Boolean, default=True)
    push_system_announcements = Column(Boolean, default=True)
    push_deadline_reminders = Column(Boolean, default=True)
    push_document_requests = Column(Boolean, default=True)
    
    # Frequency settings
    digest_frequency = Column(String(20), default="daily")  # immediate, daily, weekly, disabled
    quiet_hours_start = Column(String(5))  # Format: "22:00"
    quiet_hours_end = Column(String(5))    # Format: "08:00"
    
    # Notification types to receive
    notification_types = Column(JSON, default=lambda: ["info", "warning", "error", "success", "reminder"])
    priority_threshold = Column(String(20), default="normal")  # only show notifications of this priority or higher
    
    # Auto-read settings
    auto_mark_read_after_days = Column(Integer, default=7)
    
    # Time settings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<NotificationPreference(user_id={self.user_id}, email_enabled={self.email_enabled}, push_enabled={self.push_enabled})>"
    
    def should_send_email(self, notification_type: str) -> bool:
        """Check if email should be sent for a notification type"""
        if not self.email_enabled:
            return False
        
        type_mapping = {
            "application": self.email_application_updates,
            "system": self.email_system_announcements,
            "reminder": self.email_deadline_reminders,
            "document": self.email_document_requests
        }
        
        return type_mapping.get(notification_type, True)
    
    def should_send_push(self, notification_type: str) -> bool:
        """Check if push notification should be sent for a notification type"""
        if not self.push_enabled:
            return False
        
        type_mapping = {
            "application": self.push_application_updates,
            "system": self.push_system_announcements,
            "reminder": self.push_deadline_reminders,
            "document": self.push_document_requests
        }
        
        return type_mapping.get(notification_type, True)
    
    def should_show_notification(self, notification_type: str, priority: str) -> bool:
        """Check if notification should be shown based on preferences"""
        # Check if notification type is enabled
        if notification_type not in self.notification_types:
            return False
        
        # Check priority threshold
        priority_levels = {"low": 1, "normal": 2, "high": 3, "urgent": 4}
        min_priority = priority_levels.get(self.priority_threshold, 2)
        current_priority = priority_levels.get(priority, 2)
        
        return current_priority >= min_priority
    
    def is_quiet_hours(self) -> bool:
        """Check if current time is within quiet hours"""
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        from datetime import datetime, time
        
        now = datetime.now().time()
        start_time = datetime.strptime(self.quiet_hours_start, "%H:%M").time()
        end_time = datetime.strptime(self.quiet_hours_end, "%H:%M").time()
        
        if start_time <= end_time:
            # Same day quiet hours (e.g., 14:00 - 18:00)
            return start_time <= now <= end_time
        else:
            # Overnight quiet hours (e.g., 22:00 - 08:00)
            return now >= start_time or now <= end_time 