"""
Scholarship schemas for API requests and responses
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class ScholarshipCategoryEnum(str, Enum):
    """Scholarship category enum"""
    DOCTORAL = "doctoral"
    UNDERGRADUATE = "undergraduate"
    MASTER = "master"
    SPECIAL = "special"


class ScholarshipSubTypeEnum(str, Enum):
    """Scholarship sub-type enum"""
    MOST = "most"  # 國科會
    MOE = "moe"    # 教育部
    GENERAL = "general"  # 一般


class ScholarshipTypeBase(BaseModel):
    """Base scholarship type schema"""
    code: str
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    category: ScholarshipCategoryEnum
    sub_type: ScholarshipSubTypeEnum = ScholarshipSubTypeEnum.GENERAL
    is_combined: bool = False
    parent_scholarship_id: Optional[int] = None
    amount: Decimal
    currency: str = "TWD"
    eligible_student_types: Optional[List[str]] = None
    min_gpa: Optional[Decimal] = None
    max_ranking_percent: Optional[Decimal] = None
    max_completed_terms: Optional[int] = None
    required_documents: Optional[List[str]] = None
    application_start_date: Optional[datetime] = None
    application_end_date: Optional[datetime] = None
    status: str = "active"
    requires_professor_recommendation: bool = False
    requires_research_proposal: bool = False


class ScholarshipTypeCreate(ScholarshipTypeBase):
    """Create scholarship type schema"""
    pass


class ScholarshipTypeUpdate(BaseModel):
    """Update scholarship type schema"""
    name: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    amount: Optional[Decimal] = None
    min_gpa: Optional[Decimal] = None
    max_ranking_percent: Optional[Decimal] = None
    status: Optional[str] = None


class ScholarshipTypeResponse(ScholarshipTypeBase):
    """Scholarship type response schema"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    sub_scholarships: Optional[List['ScholarshipTypeResponse']] = None
    parent_scholarship: Optional['ScholarshipTypeResponse'] = None
    
    class Config:
        from_attributes = True
        
    @validator('sub_scholarships', pre=True, always=True)
    def validate_sub_scholarships(cls, v, values):
        """Only include sub_scholarships if is_combined is True"""
        if values.get('is_combined'):
            return v
        return None


class CombinedScholarshipCreate(BaseModel):
    """Create combined scholarship with sub-types"""
    name: str = "博士獎學金"
    name_en: str = "Doctoral Scholarship"
    description: str = "國科會與教育部聯合博士獎學金"
    description_en: str = "Combined MOST and MOE Doctoral Scholarship"
    category: ScholarshipCategoryEnum = ScholarshipCategoryEnum.DOCTORAL
    sub_scholarships: List[Dict[str, Any]]  # 子獎學金設定


class ScholarshipApplicationRequest(BaseModel):
    """Scholarship application request"""
    scholarship_id: int = Field(..., description="主獎學金ID")
    sub_scholarship_id: Optional[int] = Field(None, description="子獎學金ID（如果是合併獎學金）")
    personal_statement: str = Field(..., min_length=100)
    research_proposal: Optional[str] = None
    supporting_documents: Optional[List[int]] = None  # Document IDs
    
    @validator('sub_scholarship_id')
    def validate_sub_scholarship(cls, v, values):
        """Validate sub_scholarship_id is required for combined scholarships"""
        # 這裡需要在服務層進一步驗證
        return v


class ScholarshipRuleResponse(BaseModel):
    """Scholarship rule response schema"""
    id: int
    rule_name: str
    rule_type: str
    description: Optional[str] = None
    condition_field: Optional[str] = None
    operator: Optional[str] = None
    expected_value: Optional[str] = None
    error_message: Optional[str] = None
    error_message_en: Optional[str] = None
    is_required: bool
    weight: Decimal
    priority: int
    is_active: bool
    
    class Config:
        from_attributes = True 