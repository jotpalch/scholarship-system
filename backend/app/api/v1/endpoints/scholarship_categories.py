from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db
from app.models.scholarship_category import ScholarshipCategory
from app.models.scholarship import ScholarshipType
from app.schemas.scholarship_category import ScholarshipCategoryResponse
from app.schemas.scholarship import ScholarshipTypeResponse

router = APIRouter()


@router.get("/", response_model=List[ScholarshipCategoryResponse])
async def list_scholarship_categories(db: AsyncSession = Depends(get_db)):
    """List all scholarship categories"""
    stmt = select(ScholarshipCategory).order_by(ScholarshipCategory.id)
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return categories


@router.get("/{category_id}", response_model=ScholarshipCategoryResponse)
async def get_scholarship_category(category_id: int, db: AsyncSession = Depends(get_db)):
    """Get scholarship category details"""
    stmt = select(ScholarshipCategory).where(ScholarshipCategory.id == category_id)
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Scholarship category not found")
    return category


@router.get("/{category_id}/subTypes", response_model=List[ScholarshipTypeResponse])
async def list_sub_types(category_id: int, db: AsyncSession = Depends(get_db)):
    """List scholarship types (sub-types) under a category"""
    stmt = select(ScholarshipType).where(ScholarshipType.category_id == category_id)
    result = await db.execute(stmt)
    types_ = result.scalars().all()
    return types_