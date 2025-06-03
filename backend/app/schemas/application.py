"""
Application schemas for API requests and responses
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.application import ApplicationStatus, ReviewStatus, FileType


class ApplicationBase(BaseModel):
    """Base application schema"""
    scholarship_type: str = Field(..., description="Scholarship type code")
    academic_year: str = Field(..., description="Academic year")
    semester: str = Field(..., description="Semester")
    gpa: Optional[Decimal] = Field(None, description="GPA")
    class_ranking_percent: Optional[Decimal] = Field(None, description="Class ranking percentage")
    dept_ranking_percent: Optional[Decimal] = Field(None, description="Department ranking percentage")
    completed_terms: Optional[int] = Field(None, description="Number of completed terms")
    contact_phone: Optional[str] = Field(None, description="Contact phone")
    contact_email: Optional[str] = Field(None, description="Contact email")
    contact_address: Optional[str] = Field(None, description="Contact address")
    bank_account: Optional[str] = Field(None, description="Bank account")
    research_proposal: Optional[str] = Field(None, description="Research proposal")
    budget_plan: Optional[str] = Field(None, description="Budget plan")
    milestone_plan: Optional[str] = Field(None, description="Milestone plan")
    agree_terms: bool = Field(False, description="Agreement to terms")


class ApplicationCreate(ApplicationBase):
    """Application creation schema"""
    pass


class ApplicationUpdate(BaseModel):
    """Application update schema"""
    scholarship_type: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    gpa: Optional[Decimal] = None
    class_ranking_percent: Optional[Decimal] = None
    dept_ranking_percent: Optional[Decimal] = None
    completed_terms: Optional[int] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_address: Optional[str] = None
    bank_account: Optional[str] = None
    research_proposal: Optional[str] = None
    budget_plan: Optional[str] = None
    milestone_plan: Optional[str] = None
    agree_terms: Optional[bool] = None


class ApplicationFileResponse(BaseModel):
    """Application file response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    file_type: str
    is_verified: bool
    uploaded_at: datetime


class ApplicationReviewResponse(BaseModel):
    """Application review response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    reviewer_id: int
    review_stage: str
    review_status: str
    score: Optional[Decimal]
    comments: Optional[str]
    reviewed_at: Optional[datetime]


class ApplicationResponse(BaseModel):
    """Full application response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    app_id: str
    user_id: int
    student_id: int
    scholarship_type: str
    scholarship_name: Optional[str]
    amount: Optional[Decimal]
    status: str
    status_name: Optional[str]
    academic_year: Optional[str]
    semester: Optional[str]
    gpa: Optional[Decimal]
    class_ranking_percent: Optional[Decimal]
    dept_ranking_percent: Optional[Decimal]
    completed_terms: Optional[int]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    contact_address: Optional[str]
    bank_account: Optional[str]
    research_proposal: Optional[str]
    budget_plan: Optional[str]
    milestone_plan: Optional[str]
    agree_terms: Optional[bool]
    professor_id: Optional[int]
    reviewer_id: Optional[int]
    review_score: Optional[Decimal]
    review_comments: Optional[str]
    rejection_reason: Optional[str]
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    files: List[ApplicationFileResponse] = []
    reviews: List[ApplicationReviewResponse] = []


class ApplicationReviewCreate(BaseModel):
    """Application review creation schema"""
    application_id: int
    review_stage: str
    score: Optional[Decimal] = None
    comments: Optional[str] = None
    recommendation: Optional[str] = None


class ApplicationListResponse(BaseModel):
    """Application list item response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    app_id: str
    scholarship_type: str
    scholarship_name: Optional[str]
    amount: Optional[Decimal]
    status: str
    status_name: Optional[str]
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class ApplicationStatusUpdate(BaseModel):
    """Application status update schema"""
    status: str = Field(..., description="New status")
    comments: Optional[str] = Field(None, description="Review comments")
    score: Optional[Decimal] = Field(None, description="Review score")


class DashboardStats(BaseModel):
    """Dashboard statistics schema"""
    total_applications: int = Field(0, description="Total number of applications")
    draft_applications: int = Field(0, description="Number of draft applications")
    submitted_applications: int = Field(0, description="Number of submitted applications")
    approved_applications: int = Field(0, description="Number of approved applications")
    rejected_applications: int = Field(0, description="Number of rejected applications")
    pending_review: int = Field(0, description="Number of applications pending review")
    total_amount: Decimal = Field(0, description="Total scholarship amount approved")
    recent_activities: List[Dict[str, Any]] = Field([], description="Recent application activities") 