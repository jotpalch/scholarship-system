"""
Common schemas for API responses and pagination
"""

from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from app.schemas.response import ApiResponse  # noqa: E402

T = TypeVar("T")


class MessageResponse(BaseModel):
    """Standard message response"""
    success: bool = True
    message: str
    trace_id: Optional[str] = None


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper"""
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
    
    @property
    def has_next(self) -> bool:
        """Check if there are more pages"""
        return self.page < self.pages
    
    @property
    def has_prev(self) -> bool:
        """Check if there are previous pages"""
        return self.page > 1


class ValidationErrorDetail(BaseModel):
    """Validation error detail"""
    field: str
    message: str
    value: Any = None


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    message: str
    errors: Optional[List[ValidationErrorDetail]] = None
    trace_id: Optional[str] = None


class SystemSettingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    key: str
    value: str


class EmailTemplateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    key: str
    subject_template: str
    body_template: str
    cc: str | None = None
    bcc: str | None = None
    updated_at: datetime | None = None 