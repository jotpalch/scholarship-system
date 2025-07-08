"""
Application schemas for API requests and responses
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, validator
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


class DynamicFormField(BaseModel):
    """動態表單欄位"""
    field_id: str = Field(..., description="欄位ID")
    field_type: str = Field(..., description="欄位類型 (text, number, select, etc.)")
    value: Any = Field(None, description="欄位值")
    required: bool = Field(default=True, description="是否必填")
    validation_rules: Optional[Dict[str, Any]] = Field(default=None, description="驗證規則")

    @validator('value')
    def validate_value_type(cls, v, values):
        """根據 field_type 驗證值的類型"""
        field_type = values.get('field_type')
        if field_type == 'select' and not isinstance(v, (list, str)):
            raise ValueError('Select field value must be a string or list')
        elif field_type == 'number' and not isinstance(v, (int, float)):
            raise ValueError('Number field value must be a number')
        return v


class DocumentData(BaseModel):
    """文件資料"""
    document_id: str = Field(..., description="文件ID")
    document_type: str = Field(..., description="文件類型")
    file_path: str = Field(..., description="檔案路徑")
    original_filename: str = Field(..., description="原始檔名")
    upload_time: str = Field(..., description="上傳時間 (ISO format string)")
    file_size: Optional[int] = Field(None, description="檔案大小")
    mime_type: Optional[str] = Field(None, description="檔案類型")


class ApplicationFormData(BaseModel):
    """申請表單資料"""
    fields: Dict[str, DynamicFormField] = Field(
        ..., 
        description="動態表單欄位",
        example={
            "bank_account": {
                "field_id": "bank_account",
                "field_type": "text",
                "value": "123123",
                "required": True
            }
        }
    )
    documents: List[DocumentData] = Field(
        default=[],
        description="文件列表",
        example=[{
            "document_id": "bank_account_cover",
            "document_type": "存摺封面",
            "file_path": "test.pdf",
            "original_filename": "test.pdf",
            "upload_time": "2024-03-19T10:00:00Z"
        }]
    )

    @validator('fields')
    def validate_required_fields(cls, v):
        """驗證必填欄位"""
        for field_id, field in v.items():
            if field.required and (field.value is None or field.value == ""):
                raise ValueError(f"必填欄位 {field_id} 未填寫")
            
            # 根據 field_type 進行特定驗證
            if field.validation_rules:
                if field.field_type == "number":
                    min_val = field.validation_rules.get("min")
                    max_val = field.validation_rules.get("max")
                    if min_val is not None and field.value < min_val:
                        raise ValueError(f"欄位 {field_id} 值不可小於 {min_val}")
                    if max_val is not None and field.value > max_val:
                        raise ValueError(f"欄位 {field_id} 值不可大於 {max_val}")
                elif field.field_type == "text":
                    min_length = field.validation_rules.get("min_length")
                    max_length = field.validation_rules.get("max_length")
                    if min_length is not None and len(str(field.value)) < min_length:
                        raise ValueError(f"欄位 {field_id} 長度不可小於 {min_length}")
                    if max_length is not None and len(str(field.value)) > max_length:
                        raise ValueError(f"欄位 {field_id} 長度不可大於 {max_length}")
        return v


class ApplicationCreate(BaseModel):
    """建立申請"""
    scholarship_type: str = Field(
        ..., 
        description="獎學金類型代碼",
        example="undergraduate_freshman"
    )
    scholarship_subtype_list: List[str] = Field(
        default=[],
        description="獎學金子類型列表",
        example=["general", "special"]
    )
    form_data: ApplicationFormData = Field(
        ..., 
        description="表單資料"
    )
    agree_terms: Optional[bool] = Field(
        False,
        description="同意條款"
    )
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "scholarship_type": "undergraduate_freshman",
                "scholarship_subtype_list": ["general"],
                "agree_terms": True,
                "form_data": {
                    "fields": {
                        "bank_account": {
                            "field_id": "bank_account",
                            "field_type": "text",
                            "value": "123123",
                            "required": True
                        }
                    },
                    "documents": [
                        {
                            "document_id": "bank_account_cover",
                            "document_type": "存摺封面",
                            "file_path": "test.pdf",
                            "original_filename": "test.pdf",
                            "upload_time": "2024-03-19T10:00:00Z"
                        }
                    ]
                }
            }
        }


class ApplicationUpdate(BaseModel):
    """更新申請"""
    form_data: Optional[ApplicationFormData] = Field(None, description="表單資料")
    status: Optional[str] = Field(None, description="申請狀態")
    agree_terms: Optional[bool] = Field(None, description="同意條款")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ApplicationFileResponse(BaseModel):
    """Application file response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    filename: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    file_type: str
    is_verified: Optional[bool] = False
    uploaded_at: datetime
    file_path: Optional[str] = None  # 預覽/下載URL
    download_url: Optional[str] = None  # 下載URL


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


class ProfessorReviewCreate(BaseModel):
    application_id: int
    selected_awards: Optional[List[str]] = None
    recommendation: Optional[str] = None
    review_status: Optional[str] = None


class ProfessorReviewResponse(BaseModel):
    id: int
    application_id: int
    professor_id: int
    selected_awards: Optional[List[str]] = None
    recommendation: Optional[str] = None
    review_status: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ApplicationResponse(BaseModel):
    """Full application response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    app_id: str
    user_id: int
    student_id: int
    scholarship_type_id: int
    scholarship_subtype_list: Optional[List[str]] = []
    status: str
    status_name: Optional[str]
    academic_year: str
    semester: str
    student_data: Dict[str, Any]
    submitted_form_data: Dict[str, Any]  # 包含整合後的文件資訊
    agree_terms: bool = False
    professor_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    final_approver_id: Optional[int] = None
    review_score: Optional[Decimal] = None
    review_comments: Optional[str] = None
    rejection_reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    meta_data: Optional[Dict[str, Any]] = None
    
    reviews: List[ApplicationReviewResponse] = []
    professor_reviews: List[ProfessorReviewResponse] = []
    
    @property
    def is_editable(self) -> bool:
        """Check if application can be edited"""
        return bool(self.status in [ApplicationStatus.DRAFT.value, ApplicationStatus.RETURNED.value])
    
    @property
    def is_submitted(self) -> bool:
        """Check if application is submitted"""
        return bool(self.status != ApplicationStatus.DRAFT.value)
    
    @property
    def can_be_reviewed(self) -> bool:
        """Check if application can be reviewed"""
        return bool(self.status in [
            ApplicationStatus.SUBMITTED.value,
            ApplicationStatus.UNDER_REVIEW.value,
            ApplicationStatus.RECOMMENDED.value
        ])


class ApplicationReviewCreate(BaseModel):
    """Application review creation schema"""
    application_id: int
    review_stage: str
    score: Optional[Decimal] = None
    comments: Optional[str] = None
    recommendation: Optional[str] = None
    selected_awards: Optional[List[str]] = None


class ApplicationListResponse(BaseModel):
    """Application list response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    app_id: str
    user_id: int
    student_id: int
    scholarship_type: str
    scholarship_type_id: int
    scholarship_type_zh: Optional[str] = None  # 中文獎學金類型名稱
    scholarship_subtype_list: Optional[List[str]] = []  # 獎學金子類型列表
    status: str
    status_name: Optional[str]
    academic_year: str
    semester: str
    student_data: Dict[str, Any]
    submitted_form_data: Dict[str, Any]  # 包含整合後的文件資訊
    agree_terms: bool = False
    professor_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    final_approver_id: Optional[int] = None
    review_score: Optional[Decimal] = None
    review_comments: Optional[str] = None
    rejection_reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    meta_data: Optional[Dict[str, Any]] = None
    
    @property
    def is_editable(self) -> bool:
        """Check if application can be edited"""
        return bool(self.status in [ApplicationStatus.DRAFT.value, ApplicationStatus.RETURNED.value])
    
    @property
    def is_submitted(self) -> bool:
        """Check if application is submitted"""
        return bool(self.status != ApplicationStatus.DRAFT.value)
    
    @property
    def can_be_reviewed(self) -> bool:
        """Check if application can be reviewed"""
        return bool(self.status in [
            ApplicationStatus.SUBMITTED.value,
            ApplicationStatus.UNDER_REVIEW.value,
            ApplicationStatus.RECOMMENDED.value
        ])


class ApplicationStatusUpdate(BaseModel):
    """Application status update schema"""
    status: str = Field(..., description="New status")
    comments: Optional[str] = Field(None, description="Review comments")
    score: Optional[Decimal] = Field(None, description="Review score")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection")


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


class ProfessorReviewCreate(BaseModel):
    application_id: int
    selected_awards: Optional[List[str]] = None
    recommendation: Optional[str] = None
    review_status: Optional[str] = None


class ProfessorReviewResponse(BaseModel):
    id: int
    application_id: int
    professor_id: int
    selected_awards: Optional[List[str]] = None
    recommendation: Optional[str] = None
    review_status: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None 
    