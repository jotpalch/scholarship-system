from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class ScholarshipCategory(Base):
    """Scholarship category model – groups multiple ScholarshipType records"""
    __tablename__ = "scholarship_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    name_en = Column(String(200), unique=True)
    description = Column(Text)
    description_en = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    scholarship_types = relationship("ScholarshipType", back_populates="category")