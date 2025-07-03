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
    StudyStatus,
    
    # 多對多關聯表
    student_identities
)
from app.models.scholarship import ScholarshipType, ScholarshipRule
from app.models.scholarship_category import ScholarshipCategory
from app.models.application import Application, ApplicationStatus, ApplicationReview
from app.models.notification import Notification, NotificationType
from app.models.audit_log import AuditLog, AuditAction
from app.models.system_setting import SystemSetting

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
    "student_identities",
    
    # Application models
    "Application",
    "ApplicationStatus",
    "ApplicationReview",
    
    # Scholarship models
    "ScholarshipType",
    "ScholarshipRule",
    "ScholarshipCategory",
    
    # Other models
    "Notification",
    "NotificationType",
    "AuditLog",
    "AuditAction",
    "SystemSetting"
]
