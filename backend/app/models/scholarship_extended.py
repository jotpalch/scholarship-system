"""
Extended scholarship system models based on issue #10 requirements
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class ScholarshipMainType(enum.Enum):
    """Main scholarship types"""
    UNDERGRADUATE_FRESHMAN = "UNDERGRADUATE_FRESHMAN"
    PHD = "PHD" 
    DIRECT_PHD = "DIRECT_PHD"


class ScholarshipSubType(enum.Enum):
    """Sub scholarship types"""
    GENERAL = "GENERAL"
    NSTC = "NSTC"
    MOE_1W = "MOE_1W"
    MOE_2W = "MOE_2W"


class ReviewCycle(enum.Enum):
    """Review cycle types"""
    SEMESTER = "SEMESTER"
    MONTHLY = "MONTHLY"


class ApplicationStatus(enum.Enum):
    """Application status enum"""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    PROFESSOR_REVIEW = "PROFESSOR_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class ReviewStatus(enum.Enum):
    """Review status enum"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"


class ScholarshipSubTypeConfig(Base):
    """Sub-scholarship type configurations"""
    __tablename__ = "scholarship_sub_type_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    main_type = Column(Enum(ScholarshipMainType), nullable=False)
    sub_type = Column(Enum(ScholarshipSubType), nullable=False, default=ScholarshipSubType.GENERAL)
    
    # Configuration details
    name = Column(String(200), nullable=False)
    name_en = Column(String(200))
    description = Column(Text)
    description_en = Column(Text)
    
    # Financial details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="TWD")
    
    # Review settings
    review_cycle = Column(Enum(ReviewCycle), default=ReviewCycle.SEMESTER)
    
    # College-specific quota management
    quota_per_college = Column(JSON)  # {"CS": 10, "EE": 8, ...}
    total_quota = Column(Integer)
    
    # Priority settings
    renewal_priority = Column(Boolean, default=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    applications = relationship("Application", back_populates="sub_type_config")
    
    def __repr__(self):
        return f"<ScholarshipSubTypeConfig(main_type={self.main_type.value}, sub_type={self.sub_type.value})>"


class Application(Base):
    """Scholarship applications"""
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Reference to scholarship and student
    scholarship_type_id = Column(Integer, ForeignKey("scholarship_types.id"), nullable=False)
    sub_type_config_id = Column(Integer, ForeignKey("scholarship_sub_type_configs.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Application metadata
    application_number = Column(String(50), unique=True, index=True)
    semester = Column(String(20), nullable=False)  # e.g., "2024-1", "2024-2"
    academic_year = Column(String(10), nullable=False)  # e.g., "2024"
    
    # Application type
    is_renewal = Column(Boolean, default=False)
    previous_application_id = Column(Integer, ForeignKey("applications.id"))
    
    # Status and priority
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.DRAFT)
    priority_score = Column(Integer, default=0)  # Higher score = higher priority
    
    # Application details
    application_data = Column(JSON)  # Flexible storage for application form data
    requested_amount = Column(Numeric(10, 2))
    
    # Important dates
    submitted_at = Column(DateTime(timezone=True))
    review_deadline = Column(DateTime(timezone=True))
    decision_date = Column(DateTime(timezone=True))
    
    # Review notes
    admin_notes = Column(Text)
    student_notes = Column(Text)
    rejection_reason = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    scholarship_type = relationship("ScholarshipType")
    sub_type_config = relationship("ScholarshipSubTypeConfig", back_populates="applications")
    # student = relationship("Student")  # Uncomment when Student model is available
    files = relationship("ApplicationFile", back_populates="application", cascade="all, delete-orphan")
    reviews = relationship("ApplicationReview", back_populates="application", cascade="all, delete-orphan")
    professor_reviews = relationship("ProfessorReview", back_populates="application", cascade="all, delete-orphan")
    
    # Self-referential relationship for renewals
    previous_application = relationship("Application", remote_side=[id])
    
    def __repr__(self):
        return f"<Application(id={self.id}, number={self.application_number}, status={self.status.value})>"
    
    @property
    def is_overdue(self) -> bool:
        """Check if application review is overdue"""
        if not self.review_deadline:
            return False
        return datetime.now(timezone.utc) > self.review_deadline
    
    def calculate_priority_score(self) -> int:
        """Calculate priority score based on business rules"""
        score = 0
        
        # Renewal applications get higher priority
        if self.is_renewal:
            score += 100
            
        # Add score based on submission time (earlier = higher priority)
        if self.submitted_at:
            days_since_submission = (datetime.now(timezone.utc) - self.submitted_at).days
            score += max(0, 30 - days_since_submission)
            
        return score


class ApplicationFile(Base):
    """Files uploaded with applications"""
    __tablename__ = "application_files"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    
    # File details
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(50))
    mime_type = Column(String(100))
    
    # File classification
    document_type = Column(String(50))  # transcript, research_proposal, recommendation, etc.
    is_required = Column(Boolean, default=False)
    
    # Status
    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer)  # User ID who verified
    verified_at = Column(DateTime(timezone=True))
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    application = relationship("Application", back_populates="files")
    
    def __repr__(self):
        return f"<ApplicationFile(id={self.id}, name={self.file_name}, type={self.document_type})>"


class ApplicationReview(Base):
    """Application reviews by administrators"""
    __tablename__ = "application_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    reviewer_id = Column(Integer, nullable=False)  # User ID of reviewer
    
    # Review details
    review_stage = Column(String(50))  # initial_review, final_review, etc.
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    
    # Review content
    comments = Column(Text)
    recommendation = Column(String(20))  # APPROVE, REJECT, REQUIRE_MORE_INFO
    
    # Scoring (if applicable)
    score = Column(Numeric(5, 2))
    max_score = Column(Numeric(5, 2))
    
    # Important dates
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    application = relationship("Application", back_populates="reviews")
    
    def __repr__(self):
        return f"<ApplicationReview(id={self.id}, status={self.status.value}, recommendation={self.recommendation})>"
    
    @property
    def is_overdue(self) -> bool:
        """Check if review is overdue"""
        if not self.due_date or self.status == ReviewStatus.COMPLETED:
            return False
        return datetime.now(timezone.utc) > self.due_date


class ProfessorReview(Base):
    """Professor reviews for research-based scholarships"""
    __tablename__ = "professor_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    professor_id = Column(Integer, nullable=False)  # User ID of professor
    
    # Review metadata
    review_type = Column(String(50))  # recommendation, evaluation, etc.
    is_required = Column(Boolean, default=True)
    
    # Review content
    overall_rating = Column(Integer)  # 1-5 or 1-10 scale
    comments = Column(Text)
    recommendation = Column(String(20))  # STRONGLY_RECOMMEND, RECOMMEND, NEUTRAL, NOT_RECOMMEND
    
    # Important dates
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    
    # Status
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    application = relationship("Application", back_populates="professor_reviews")
    review_items = relationship("ProfessorReviewItem", back_populates="professor_review", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ProfessorReview(id={self.id}, rating={self.overall_rating}, recommendation={self.recommendation})>"


class ProfessorReviewItem(Base):
    """Individual items in professor reviews"""
    __tablename__ = "professor_review_items"
    
    id = Column(Integer, primary_key=True, index=True)
    professor_review_id = Column(Integer, ForeignKey("professor_reviews.id"), nullable=False)
    
    # Item details
    item_name = Column(String(100), nullable=False)  # research_quality, academic_performance, etc.
    item_description = Column(Text)
    
    # Rating
    rating = Column(Integer)  # Numeric rating for this item
    max_rating = Column(Integer, default=5)
    weight = Column(Numeric(5, 2), default=1.0)
    
    # Comments
    comments = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    professor_review = relationship("ProfessorReview", back_populates="review_items")
    
    def __repr__(self):
        return f"<ProfessorReviewItem(id={self.id}, name={self.item_name}, rating={self.rating})>"