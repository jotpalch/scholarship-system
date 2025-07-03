from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.schemas.scholarship import ScholarshipTypeResponse


class ScholarshipCategoryResponse(BaseModel):
    """Scholarship category response schema"""
    id: int
    name: str = Field(..., alias="nameZh")
    name_en: Optional[str] = Field(None, alias="nameEn")
    description: Optional[str] = None
    description_en: Optional[str] = Field(None, alias="descriptionEn")
    created_at: datetime = Field(..., alias="createdAt")
    scholarships: Optional[List[ScholarshipTypeResponse]] = None

    class Config:
        from_attributes = True
        populate_by_name = True