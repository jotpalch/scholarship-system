"""
Scholarship schemas for API requests and responses
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ScholarshipTypeResponse(BaseModel):
    """Scholarship type response schema"""
    id: int
    code: str
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    amount: Decimal
    currency: str
    eligible_student_types: Optional[List[str]] = None
    min_gpa: Optional[Decimal] = None
    max_ranking_percent: Optional[Decimal] = None
    max_completed_terms: Optional[int] = None
    required_documents: Optional[List[str]] = None
    category_id: Optional[int] = Field(None, alias="categoryId")
    sub_type: Optional[str] = Field(None, alias="subType")
    application_start_date: Optional[datetime] = None
    application_end_date: Optional[datetime] = None
    status: str
    requires_professor_recommendation: bool
    requires_research_proposal: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True


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