"""
Student schemas for API requests and responses
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class StudentBase(BaseModel):
    """Base student schema"""
    student_no: str = Field(..., description="Student number")
    student_code: str = Field(..., description="Student code")
    personal_id: Optional[str] = Field(None, description="Personal ID")
    degree_level: Optional[str] = Field(None, description="Degree level")
    nationality_1: str = Field("TWN", description="Primary nationality")
    department_name: Optional[str] = Field(None, description="Department name")
    academy_name: Optional[str] = Field(None, description="Academy name")
    cell_phone: Optional[str] = Field(None, description="Cell phone")
    email: Optional[str] = Field(None, description="Email")
    address: Optional[str] = Field(None, description="Address")
    bank_account: Optional[str] = Field(None, description="Bank account")


class StudentCreate(StudentBase):
    """Student creation schema"""
    user_id: int = Field(..., description="User ID")


class StudentUpdate(BaseModel):
    """Student update schema"""
    cell_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    bank_account: Optional[str] = None


class StudentTermRecordResponse(BaseModel):
    """Student term record response schema"""
    id: int
    academic_year: str
    semester: str
    study_status: str
    average_score: Optional[Decimal] = None
    gpa: Optional[Decimal] = None
    semester_gpa: Optional[Decimal] = None
    class_ranking_percent: Optional[Decimal] = None
    dept_ranking_percent: Optional[Decimal] = None
    completed_terms: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class StudentResponse(StudentBase):
    """Student response schema"""
    id: int
    user_id: int
    study_status: str
    student_type: Optional[str] = None
    total_term_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True 