from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
import logging
from decimal import Decimal
from app.models.scholarship import ScholarshipType, ScholarshipStatus
from app.models.student import Student, StudentTermRecord
from app.core.exceptions import ValidationError
from app.core.config import settings, DEV_SCHOLARSHIP_SETTINGS
from typing import List, Union

logger = logging.getLogger(__name__)

class ScholarshipService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def _safe_gpa_to_decimal(self, gpa: Union[str, int, float, Decimal]) -> Decimal:
        """Safely convert GPA to Decimal for comparison"""
        try:
            if isinstance(gpa, str):
                return Decimal(gpa)
            elif isinstance(gpa, (int, float)):
                return Decimal(str(gpa))
            elif isinstance(gpa, Decimal):
                return gpa
            else:
                logger.warning(f"Unexpected GPA type: {type(gpa)}, value: {gpa}")
                return Decimal("0.0")
        except Exception as e:
            logger.error(f"Error converting GPA '{gpa}' to Decimal: {e}")
            return Decimal("0.0")
    
    def _is_dev_mode(self) -> bool:
        """Check if running in development mode"""
        return settings.debug or settings.environment == "development"
    
    def _should_bypass_application_period(self) -> bool:
        """Check if should bypass application period in dev mode"""
        return (self._is_dev_mode() and 
                DEV_SCHOLARSHIP_SETTINGS.get("ALWAYS_OPEN_APPLICATION", False))
    
    def _should_bypass_whitelist(self) -> bool:
        """Check if should bypass whitelist in dev mode"""
        return (self._is_dev_mode() and 
                DEV_SCHOLARSHIP_SETTINGS.get("BYPASS_WHITELIST", False))
    
    async def get_eligible_scholarships(self, student: Student) -> List[ScholarshipType]:
        """Get scholarships that the student is eligible for"""
        # Get all active scholarships
        stmt = select(ScholarshipType).where(
            ScholarshipType.status == ScholarshipStatus.ACTIVE.value
        )
        result = await self.db.execute(stmt)
        scholarships = result.scalars().all()
        
        logger.info(f"Found {len(scholarships)} active scholarships")
        
        # Get student's academic record to determine type
        from app.models.student import StudentAcademicRecord, StudentType
        stmt = select(StudentAcademicRecord).where(
            StudentAcademicRecord.studentId == student.id
        ).order_by(StudentAcademicRecord.createdAt.desc())
        result = await self.db.execute(stmt)
        academic_record = result.scalar_one_or_none()
        
        # Determine student type based on academic record
        if academic_record:
            if academic_record.degree == 1:  # 學士
                student_type = StudentType.UNDERGRADUATE
            elif academic_record.degree == 2:  # 碩士
                student_type = StudentType.GRADUATE
            elif academic_record.degree == 3:  # 博士
                if student.stdNo and student.stdNo.startswith('D'):
                    student_type = StudentType.DIRECT_PHD
                else:
                    student_type = StudentType.PHD
            else:
                student_type = StudentType.UNDERGRADUATE
        else:
            student_type = StudentType.UNDERGRADUATE
        
        # Get student's latest term record
        stmt = select(StudentTermRecord).where(
            StudentTermRecord.studentId == student.id
        ).order_by(StudentTermRecord.academicYear.desc(), StudentTermRecord.semester.desc())
        result = await self.db.execute(stmt)
        latest_term = result.scalar_one_or_none()
        
        if not latest_term:
            logger.warning(f"No term records found for student {student.stdNo}")
            return []
            
        completed_terms = latest_term.completedTerms
        logger.info(f"Student {student.stdNo} has {completed_terms} completed terms")
        logger.info(f"Student type: {student_type.value}")
        logger.info(f"Student GPA: {latest_term.gpa}")
        
        eligible_scholarships = []
        for scholarship in scholarships:
            try:
                logger.info(f"\nChecking eligibility for scholarship: {scholarship.name}")
                logger.info(f"Application period: {scholarship.application_start_date} to {scholarship.application_end_date}")
                logger.info(f"Current time: {datetime.now(timezone.utc)}")
                logger.info(f"Eligible student types: {scholarship.eligible_student_types}")
                logger.info(f"Min GPA required: {scholarship.min_gpa}")
                logger.info(f"Max completed terms: {scholarship.max_completed_terms}")
                
                # Check if scholarship is in application period
                if not self._should_bypass_application_period() and not scholarship.is_application_period:
                    logger.info(f"Skipping {scholarship.name}: Not in application period")
                    continue
                elif self._should_bypass_application_period():
                    logger.info(f"DEV MODE: Bypassing application period check for {scholarship.name}")
                    
                # Check student type eligibility
                if scholarship.eligible_student_types and student_type.value not in scholarship.eligible_student_types:
                    logger.info(f"Skipping {scholarship.name}: Student type {student_type.value} not in eligible types {scholarship.eligible_student_types}")
                    continue
                
                # Check whitelist eligibility - PRIMARY REQUIREMENT
                # Changed: Only whitelisted students can apply (regardless of GPA)
                if not self._should_bypass_whitelist():
                    if not scholarship.is_student_in_whitelist(student.id):
                        logger.info(f"Skipping {scholarship.name}: Student {student.stdNo} not in whitelist")
                        continue
                    else:
                        logger.info(f"Student {student.stdNo} found in whitelist for {scholarship.name}")
                elif self._should_bypass_whitelist():
                    logger.info(f"DEV MODE: Bypassing whitelist check for {scholarship.name}")
                
                # Optional: Check term count requirement (keeping this as additional validation)
                if scholarship.max_completed_terms and completed_terms > scholarship.max_completed_terms:
                    logger.info(f"Skipping {scholarship.name}: Completed terms {completed_terms} exceeds max {scholarship.max_completed_terms}")
                    continue
                
                # If all checks pass, add to eligible scholarships
                logger.info(f"Scholarship {scholarship.name} is eligible!")
                eligible_scholarships.append(scholarship)
            except ValidationError as e:
                logger.error(f"Validation error for scholarship {scholarship.name}: {str(e)}")
                continue
        
        logger.info(f"Found {len(eligible_scholarships)} eligible scholarships")
        return eligible_scholarships 