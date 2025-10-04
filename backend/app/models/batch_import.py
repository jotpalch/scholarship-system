"""
Batch Import models for offline application data import
"""

from typing import TYPE_CHECKING

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base

if TYPE_CHECKING:
    pass


class BatchImport(Base):
    """Batch import record for offline application data"""

    __tablename__ = "batch_imports"

    id = Column(Integer, primary_key=True, index=True)

    # Importer information
    importer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    college_code = Column(String(10), nullable=False, index=True)

    # Scholarship information
    scholarship_type_id = Column(Integer, ForeignKey("scholarship_types.id"), nullable=True)
    academic_year = Column(Integer, nullable=False)
    semester = Column(String(20), nullable=True)

    # File information
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)  # MinIO object path

    # Import statistics
    total_records = Column(Integer, nullable=False, default=0)
    success_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    error_summary = Column(JSON, nullable=True)  # Store detailed errors
    parsed_data = Column(JSON, nullable=True)  # Store parsed data for confirm step

    # Import status: 'pending', 'processing', 'completed', 'failed'
    import_status = Column(String(20), nullable=False, default="pending", index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    importer = relationship("User", foreign_keys=[importer_id])
    scholarship_type = relationship("ScholarshipType", foreign_keys=[scholarship_type_id])
    applications = relationship("Application", back_populates="batch_import")

    def __repr__(self) -> str:
        return (
            f"<BatchImport(id={self.id}, college={self.college_code}, "
            f"status={self.import_status}, total={self.total_records})>"
        )
