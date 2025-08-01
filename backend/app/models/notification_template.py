"""
Notification template management models for scholarship-specific notifications
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class NotificationTemplateType(enum.Enum):
    """Notification template type enum"""
    WHITELIST = "whitelist"
    APPLICATION = "application"
    RECOMMENDATION = "recommendation"
    REVIEW = "review"
    SUPPLEMENTARY_DOCUMENT = "supplementary_document"
    RESULT = "result"
    ROSTER_CREATION = "roster_creation"


class NotificationTemplate(Base):
    """Scholarship-specific notification template model"""
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True)
    
    # Template identification
    scholarship_type_id = Column(Integer, ForeignKey("scholarship_types.id"), nullable=True)  # null = global template
    template_type = Column(String(50), nullable=False)  # from NotificationTemplateType enum
    template_key = Column(String(100), nullable=False)  # unique identifier for this template type
    
    # Template content (bilingual support)
    name = Column(String(200), nullable=False)  # Display name for admin interface
    name_en = Column(String(200))
    
    subject_template = Column(String(500), nullable=False)
    subject_template_en = Column(String(500))
    
    body_template = Column(Text, nullable=False)
    body_template_en = Column(Text)
    
    # Email settings
    cc_emails = Column(JSON)  # List of CC email addresses
    bcc_emails = Column(JSON)  # List of BCC email addresses
    
    # Available variables for this template type
    available_variables = Column(JSON)  # Dynamic list of available variables for this template
    
    # Template metadata
    description = Column(Text)  # Description of what this template is used for
    description_en = Column(Text)
    
    # Status and settings
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Is this the default template for this type
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    scholarship_type = relationship("ScholarshipType", back_populates="notification_templates")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    
    # Ensure unique templates per scholarship type and template type
    __table_args__ = (
        UniqueConstraint('scholarship_type_id', 'template_type', 'template_key', 
                        name='_scholarship_template_type_key_uc'),
    )

    def __repr__(self):
        return f"<NotificationTemplate(id={self.id}, scholarship_type_id={self.scholarship_type_id}, template_type={self.template_type})>"
    
    @property
    def is_global_template(self) -> bool:
        """Check if this is a global template (not specific to any scholarship)"""
        return self.scholarship_type_id is None
    
    def get_variables_for_type(self) -> dict:
        """Get available variables for this template type"""
        default_variables = {
            NotificationTemplateType.WHITELIST: {
                "student_name": "學生姓名",
                "student_id": "學號", 
                "scholarship_name": "獎學金名稱",
                "application_period_start": "申請開始日期",
                "application_period_end": "申請結束日期",
                "whitelist_deadline": "白名單截止日期"
            },
            NotificationTemplateType.APPLICATION: {
                "student_name": "學生姓名",
                "student_id": "學號",
                "application_id": "申請編號",
                "scholarship_name": "獎學金名稱",
                "submission_date": "送出日期",
                "application_status": "申請狀態"
            },
            NotificationTemplateType.RECOMMENDATION: {
                "professor_name": "教授姓名",
                "student_name": "學生姓名",
                "student_id": "學號",
                "application_id": "申請編號",
                "scholarship_name": "獎學金名稱",
                "recommendation_deadline": "推薦截止日期"
            },
            NotificationTemplateType.REVIEW: {
                "reviewer_name": "審核者姓名",
                "student_name": "學生姓名",
                "student_id": "學號",
                "application_id": "申請編號",
                "scholarship_name": "獎學金名稱",
                "review_deadline": "審核截止日期",
                "review_stage": "審核階段"
            },
            NotificationTemplateType.SUPPLEMENTARY_DOCUMENT: {
                "student_name": "學生姓名",
                "student_id": "學號",
                "application_id": "申請編號",
                "scholarship_name": "獎學金名稱",
                "required_documents": "需補充文件",
                "document_deadline": "文件截止日期"
            },
            NotificationTemplateType.RESULT: {
                "student_name": "學生姓名",
                "student_id": "學號",
                "application_id": "申請編號",
                "scholarship_name": "獎學金名稱",
                "result": "審核結果",
                "award_amount": "獎學金金額",
                "announcement_date": "公告日期"
            },
            NotificationTemplateType.ROSTER_CREATION: {
                "admin_name": "管理員姓名",
                "scholarship_name": "獎學金名稱",
                "roster_count": "名單人數",
                "creation_date": "名單建立日期",
                "academic_year": "學年度",
                "semester": "學期"
            }
        }
        
        template_type_enum = NotificationTemplateType(self.template_type)
        return default_variables.get(template_type_enum, {})


class NotificationTemplateVariable(Base):
    """Dynamic variables that can be used in notification templates"""
    __tablename__ = "notification_template_variables"

    id = Column(Integer, primary_key=True, index=True)
    
    template_type = Column(String(50), nullable=False)  # Which template type this variable belongs to
    variable_name = Column(String(100), nullable=False)  # Variable name (e.g., "student_name")
    variable_key = Column(String(100), nullable=False)  # Key used in template (e.g., "{student_name}")
    
    # Display information
    display_name = Column(String(200), nullable=False)  # Human readable name
    display_name_en = Column(String(200))
    description = Column(Text)  # Description of what this variable contains
    description_en = Column(Text)
    
    # Variable metadata
    data_type = Column(String(50), default="string")  # string, number, date, boolean
    is_required = Column(Boolean, default=False)  # Is this variable required for the template
    default_value = Column(Text)  # Default value if not provided
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Ensure unique variable names per template type
    __table_args__ = (
        UniqueConstraint('template_type', 'variable_name', name='_template_type_variable_uc'),
    )

    def __repr__(self):
        return f"<NotificationTemplateVariable(id={self.id}, template_type={self.template_type}, variable_name={self.variable_name})>"


class NotificationTemplateHistory(Base):
    """Track changes to notification templates for audit purposes"""
    __tablename__ = "notification_template_history"

    id = Column(Integer, primary_key=True, index=True)
    
    template_id = Column(Integer, ForeignKey("notification_templates.id", ondelete="CASCADE"), nullable=False)
    
    # Store the previous template content as JSON
    previous_content = Column(JSON, nullable=False)
    
    # Change information
    change_type = Column(String(50), nullable=False)  # created, updated, deleted
    change_summary = Column(Text)  # Summary of what changed
    
    # Audit fields
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    changed_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    template = relationship("NotificationTemplate")
    changed_by_user = relationship("User")

    def __repr__(self):
        return f"<NotificationTemplateHistory(id={self.id}, template_id={self.template_id}, change_type={self.change_type})>"