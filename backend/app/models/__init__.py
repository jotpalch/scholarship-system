"""
Import all models here for easy access
"""

from app.models.user import User, UserRole
from app.models.student import (
    # 查詢表模型
    Degree,
    Identity, 
    StudyingStatus,
    SchoolIdentity,
    Academy,
    Department,
    EnrollType,
    
    # 學生資料模型
    Student,
    StudentAcademicRecord,
    StudentContact,
    StudentTermRecord,
    
    # Enum 類別
    StudentType,
    StudyStatus
)
from app.models.scholarship import ScholarshipType, ScholarshipRule
from app.models.application import Application, ApplicationStatus, ApplicationReview
from app.models.notification import Notification, NotificationType
from app.models.audit_log import AuditLog, AuditAction
from app.models.system_setting import SystemSetting
from app.models.application_field import ApplicationField, ApplicationDocument, FieldType

__all__ = [
    "User",
    "UserRole",
    
    # Student models
    "Degree",
    "Identity", 
    "StudyingStatus",
    "SchoolIdentity",
    "Academy",
    "Department",
    "EnrollType",
    "Student",
    "StudentAcademicRecord",
    "StudentContact",
    "StudentTermRecord",
    "StudentType",
    "StudyStatus",
    
    # Application models
    "Application",
    "ApplicationStatus",
    "ApplicationReview",
    
    # Application Field models
    "ApplicationField",
    "ApplicationDocument",
    "FieldType",
    
    # Scholarship models
    "ScholarshipType",
    "ScholarshipRule",
    
    # Other models
    "Notification",
    "NotificationType",
    "AuditLog",
    "AuditAction",
    "SystemSetting"
]
