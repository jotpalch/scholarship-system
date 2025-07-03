from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
import logging
from decimal import Decimal
from app.models.scholarship import ScholarshipType, ScholarshipStatus, ScholarshipCategory, ScholarshipSubType
from app.models.student import Student, StudentTermRecord
from app.core.exceptions import ValidationError, NotFoundError
from app.core.config import settings, DEV_SCHOLARSHIP_SETTINGS
from app.schemas.scholarship import CombinedScholarshipCreate, ScholarshipTypeCreate
from typing import List, Union, Optional, Dict, Any

logger = logging.getLogger(__name__)

class ScholarshipService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_combined_doctoral_scholarship(self, data: CombinedScholarshipCreate) -> ScholarshipType:
        """Create a combined doctoral scholarship with MOST and MOE sub-types"""
        try:
            # Create parent scholarship
            parent_scholarship = ScholarshipType(
                code="doctoral_combined",
                name=data.name,
                name_en=data.name_en,
                description=data.description,
                description_en=data.description_en,
                category=ScholarshipCategory.DOCTORAL.value,
                sub_type=ScholarshipSubType.GENERAL.value,
                is_combined=True,
                amount=Decimal("0"),  # 總金額將由子獎學金決定
                eligible_student_types=["phd", "direct_phd"],
                status=ScholarshipStatus.ACTIVE.value
            )
            
            self.db.add(parent_scholarship)
            await self.db.flush()
            
            # Create sub-scholarships
            sub_scholarships = []
            for sub_data in data.sub_scholarships:
                sub_scholarship = ScholarshipType(
                    code=sub_data['code'],
                    name=sub_data['name'],
                    name_en=sub_data.get('name_en'),
                    description=sub_data.get('description'),
                    description_en=sub_data.get('description_en'),
                    category=ScholarshipCategory.DOCTORAL.value,
                    sub_type=sub_data['sub_type'],  # MOST or MOE
                    is_combined=False,
                    parent_scholarship_id=parent_scholarship.id,
                    amount=Decimal(str(sub_data['amount'])),
                    min_gpa=Decimal(str(sub_data.get('min_gpa', 3.5))),
                    max_ranking_percent=Decimal(str(sub_data.get('max_ranking_percent', 30))),
                    required_documents=sub_data.get('required_documents', []),
                    eligible_student_types=["phd", "direct_phd"],
                    status=ScholarshipStatus.ACTIVE.value,
                    application_start_date=sub_data.get('application_start_date'),
                    application_end_date=sub_data.get('application_end_date')
                )
                
                self.db.add(sub_scholarship)
                sub_scholarships.append(sub_scholarship)
            
            await self.db.commit()
            await self.db.refresh(parent_scholarship)
            
            return parent_scholarship
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating combined scholarship: {e}")
            raise ValidationError(f"Failed to create combined scholarship: {str(e)}")
    
    async def get_scholarship_with_sub_types(self, scholarship_id: int) -> Optional[ScholarshipType]:
        """Get scholarship with its sub-scholarships if it's a combined type"""
        stmt = select(ScholarshipType).where(ScholarshipType.id == scholarship_id)
        result = await self.db.execute(stmt)
        scholarship = result.scalar_one_or_none()
        
        if not scholarship:
            raise NotFoundError(f"Scholarship with ID {scholarship_id} not found")
        
        # If it's a combined scholarship, load sub-scholarships
        if scholarship.is_combined:
            sub_stmt = select(ScholarshipType).where(
                ScholarshipType.parent_scholarship_id == scholarship_id
            )
            sub_result = await self.db.execute(sub_stmt)
            scholarship.sub_scholarships = sub_result.scalars().all()
        
        return scholarship
    
    async def validate_sub_scholarship_application(self, parent_id: int, sub_id: int) -> bool:
        """Validate that sub_scholarship belongs to parent scholarship"""
        sub_stmt = select(ScholarshipType).where(
            and_(
                ScholarshipType.id == sub_id,
                ScholarshipType.parent_scholarship_id == parent_id
            )
        )
        result = await self.db.execute(sub_stmt)
        sub_scholarship = result.scalar_one_or_none()
        
        return sub_scholarship is not None
    
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
        """Get scholarships that the student is eligible for, including combined scholarships"""
        # Get all active scholarships (only parent scholarships)
        stmt = select(ScholarshipType).where(
            and_(
                ScholarshipType.status == ScholarshipStatus.ACTIVE.value,
                ScholarshipType.parent_scholarship_id.is_(None)  # Only get parent scholarships
            )
        )
        result = await self.db.execute(stmt)
        scholarships = result.scalars().all()
        
        logger.info(f"Found {len(scholarships)} active parent scholarships")
        
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