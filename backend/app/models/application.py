"""
Application models for scholarship applications
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.student import Student


class ApplicationStatus(enum.Enum):
    """Application status enum"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    PENDING_RECOMMENDATION = "pending_recommendation"
    RECOMMENDED = "recommended"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ReviewStatus(enum.Enum):
    """Review status enum"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"


class FileType(enum.Enum):
    """File type enum"""
    TRANSCRIPT = "transcript"  # 成績單
    RESEARCH_PROPOSAL = "research_proposal"  # 研究計畫
    RECOMMENDATION_LETTER = "recommendation_letter"  # 推薦信
    CERTIFICATE = "certificate"  # 證書
    OTHER = "other"  # 其他


class Application(Base):
    """Scholarship application model"""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(String(20), unique=True, index=True, nullable=False)  # APP-2025-000001
    
    # 申請人資訊
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # 獎學金類型
    scholarship_type = Column(String(50), nullable=False)
    scholarship_name = Column(String(200))
    amount = Column(Numeric(10, 2))
    
    # 申請狀態
    status = Column(String(50), default=ApplicationStatus.DRAFT.value)
    status_name = Column(String(100))
    
    # 學期資訊 (申請當時的學期)
    academic_year = Column(String(10))  # trm_year
    semester = Column(String(10))  # trm_term
    
    # 成績資訊 (申請當時)
    gpa = Column(Numeric(4, 2))  # trm_ascore_gpa
    class_ranking_percent = Column(Numeric(5, 2))  # trm_placingsrate
    dept_ranking_percent = Column(Numeric(5, 2))  # trm_depplacingrate
    completed_terms = Column(Integer)  # trm_termcount
    
    # 聯絡資訊 (申請時填寫)
    contact_phone = Column(String(20))
    contact_email = Column(String(255))
    contact_address = Column(Text)
    bank_account = Column(String(20))
    
    # 申請內容
    research_proposal = Column(Text)  # 研究計畫
    budget_plan = Column(Text)  # 經費規劃
    milestone_plan = Column(Text)  # 里程碑規劃
    
    # 同意條款
    agree_terms = Column(Boolean, default=False)
    
    # 審核相關
    professor_id = Column(Integer, ForeignKey("users.id"))  # 指導教授
    reviewer_id = Column(Integer, ForeignKey("users.id"))  # 審核者
    final_approver_id = Column(Integer, ForeignKey("users.id"))  # 最終核准者
    
    # 審核結果
    review_score = Column(Numeric(5, 2))
    review_comments = Column(Text)
    rejection_reason = Column(Text)
    
    # 時間戳記
    submitted_at = Column(DateTime(timezone=True))
    reviewed_at = Column(DateTime(timezone=True))
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 其他資訊
    form_data = Column(JSON)  # 儲存完整表單資料
    meta_data = Column(JSON)  # 額外的元資料
    
    # 關聯
    student = relationship("User", foreign_keys=[user_id], back_populates="applications")
    student_profile = relationship("Student", back_populates="applications")
    professor = relationship("User", foreign_keys=[professor_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    final_approver = relationship("User", foreign_keys=[final_approver_id])
    
    files = relationship("ApplicationFile", back_populates="application", cascade="all, delete-orphan")
    reviews = relationship("ApplicationReview", back_populates="application", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Application(id={self.id}, app_id={self.app_id}, status={self.status})>"
    
    @property
    def is_editable(self) -> bool:
        """Check if application can be edited"""
        return self.status in [ApplicationStatus.DRAFT.value, ApplicationStatus.RETURNED.value]
    
    @property
    def is_submitted(self) -> bool:
        """Check if application is submitted"""
        return self.status != ApplicationStatus.DRAFT.value
    
    @property
    def can_be_reviewed(self) -> bool:
        """Check if application can be reviewed"""
        return self.status in [
            ApplicationStatus.SUBMITTED.value,
            ApplicationStatus.UNDER_REVIEW.value,
            ApplicationStatus.RECOMMENDED.value
        ]


class ApplicationFile(Base):
    """Application file attachment model"""
    __tablename__ = "application_files"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    
    # 檔案資訊
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    file_type = Column(String(50), default=FileType.OTHER.value)
    
    # OCR 處理結果
    ocr_processed = Column(Boolean, default=False)
    ocr_text = Column(Text)
    ocr_confidence = Column(Numeric(5, 2))
    
    # 檔案狀態
    is_verified = Column(Boolean, default=False)
    verification_notes = Column(Text)
    
    # 時間戳記
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # 關聯
    application = relationship("Application", back_populates="files")

    def __repr__(self):
        return f"<ApplicationFile(id={self.id}, filename={self.filename}, application_id={self.application_id})>"


class ApplicationReview(Base):
    """Application review record model"""
    __tablename__ = "application_reviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 審核資訊
    review_stage = Column(String(50))  # professor_recommendation, department_review, final_approval
    review_status = Column(String(20), default=ReviewStatus.PENDING.value)
    
    # 審核結果
    score = Column(Numeric(5, 2))
    comments = Column(Text)
    recommendation = Column(Text)
    decision_reason = Column(Text)
    
    # 審核標準
    criteria_scores = Column(JSON)  # 各項評分標準的分數
    
    # 時間資訊
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    
    # 關聯
    application = relationship("Application", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews")

    def __repr__(self):
        return f"<ApplicationReview(id={self.id}, application_id={self.application_id}, reviewer_id={self.reviewer_id})>" 