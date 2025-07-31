from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, desc, asc
from datetime import datetime, timezone, timedelta
import logging
from decimal import Decimal
from app.models.scholarship import ScholarshipType, ScholarshipStatus
from app.models.student import Student, StudentTermRecord
from app.core.exceptions import ValidationError
from app.core.config import settings, DEV_SCHOLARSHIP_SETTINGS
from typing import List, Union, Optional, Dict, Any, Tuple

# Import extended models for comprehensive scholarship system
try:
    from app.models.scholarship_extended import (
        ScholarshipSubTypeConfig, Application, ApplicationFile,
        ApplicationReview, ProfessorReview, ProfessorReviewItem,
        ApplicationStatus, ReviewStatus, ScholarshipMainType, ScholarshipSubType
    )
except ImportError:
    # Fallback if extended models not available
    pass

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


class ScholarshipApplicationService:
    """Comprehensive service for managing scholarship applications and workflows"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_application(
        self,
        student_id: int,
        scholarship_type_id: int,
        sub_type_config_id: int,
        semester: str,
        academic_year: str,
        application_data: Dict[str, Any],
        is_renewal: bool = False,
        previous_application_id: Optional[int] = None
    ) -> Tuple['Application', str]:
        """Create a new scholarship application"""
        
        # Validate eligibility
        scholarship_type = self.db.query(ScholarshipType).filter(
            ScholarshipType.id == scholarship_type_id
        ).first()
        
        if not scholarship_type:
            raise ValueError("Invalid scholarship type")
        
        can_apply, error_msg = scholarship_type.can_student_apply(student_id, semester)
        if not can_apply:
            raise ValueError(error_msg)
        
        # Check for existing application in the same semester
        existing_app = self.db.query(Application).filter(
            and_(
                Application.student_id == student_id,
                Application.scholarship_type_id == scholarship_type_id,
                Application.semester == semester,
                Application.status.notin_([ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED])
            )
        ).first()
        
        if existing_app:
            raise ValueError("Student already has an active application for this scholarship in this semester")
        
        # Generate application number
        app_number = self._generate_application_number(
            scholarship_type_id, sub_type_config_id, academic_year, semester
        )
        
        # Calculate priority score
        priority_score = self._calculate_initial_priority(is_renewal, student_id)
        
        # Create application
        application = Application(
            scholarship_type_id=scholarship_type_id,
            sub_type_config_id=sub_type_config_id,
            student_id=student_id,
            application_number=app_number,
            semester=semester,
            academic_year=academic_year,
            is_renewal=is_renewal,
            previous_application_id=previous_application_id,
            status=ApplicationStatus.DRAFT,
            priority_score=priority_score,
            application_data=application_data,
            requested_amount=application_data.get('requested_amount')
        )
        
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        
        return application, "Application created successfully"
    
    def submit_application(self, application_id: int) -> Tuple[bool, str]:
        """Submit application for review"""
        application = self.db.query(Application).filter(
            Application.id == application_id
        ).first()
        
        if not application:
            return False, "Application not found"
        
        if application.status != ApplicationStatus.DRAFT:
            return False, "Application is not in draft status"
        
        # Validate required documents
        validation_result = self._validate_application_documents(application)
        if not validation_result[0]:
            return False, validation_result[1]
        
        # Update application status
        application.status = ApplicationStatus.SUBMITTED
        application.submitted_at = datetime.now(timezone.utc)
        
        # Set review deadline (30 days from submission)
        application.review_deadline = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Create initial review record
        self._create_initial_review(application)
        
        # If requires professor recommendation, create professor review
        if application.scholarship_type.requires_professor_recommendation:
            self._create_professor_review_request(application)
        
        self.db.commit()
        return True, "Application submitted successfully"
    
    def get_applications_by_priority(
        self,
        scholarship_type_id: Optional[int] = None,
        semester: Optional[str] = None,
        status: Optional[ApplicationStatus] = None,
        limit: int = 100
    ) -> List['Application']:
        """Get applications ordered by priority"""
        query = self.db.query(Application)
        
        if scholarship_type_id:
            query = query.filter(Application.scholarship_type_id == scholarship_type_id)
        
        if semester:
            query = query.filter(Application.semester == semester)
        
        if status:
            query = query.filter(Application.status == status)
        
        # Order by priority score (higher first), then by submission time (earlier first)
        applications = query.order_by(
            desc(Application.priority_score),
            asc(Application.submitted_at)
        ).limit(limit).all()
        
        return applications
    
    def process_renewal_applications_first(self, semester: str) -> Dict[str, int]:
        """Process renewal applications with higher priority"""
        
        # Get all submitted renewal applications for the semester
        renewal_apps = self.db.query(Application).filter(
            and_(
                Application.semester == semester,
                Application.is_renewal == True,
                Application.status == ApplicationStatus.SUBMITTED
            )
        ).order_by(desc(Application.priority_score)).all()
        
        processed_count = 0
        approved_count = 0
        
        for app in renewal_apps:
            # Auto-approve if meets renewal criteria
            if self._meets_renewal_criteria(app):
                app.status = ApplicationStatus.APPROVED
                app.decision_date = datetime.now(timezone.utc)
                approved_count += 1
            else:
                # Move to regular review process
                app.status = ApplicationStatus.UNDER_REVIEW
            
            processed_count += 1
        
        self.db.commit()
        
        return {
            "processed": processed_count,
            "auto_approved": approved_count
        }
    
    def _generate_application_number(
        self,
        scholarship_type_id: int,
        sub_type_config_id: int,
        academic_year: str,
        semester: str
    ) -> str:
        """Generate unique application number"""
        
        # Get count of applications for this combination
        count = self.db.query(Application).filter(
            and_(
                Application.scholarship_type_id == scholarship_type_id,
                Application.sub_type_config_id == sub_type_config_id,
                Application.academic_year == academic_year,
                Application.semester == semester
            )
        ).count()
        
        # Format: ST{scholarship_type_id}-SC{sub_config_id}-{year}{semester}-{count+1:04d}
        return f"ST{scholarship_type_id:03d}-SC{sub_type_config_id:03d}-{academic_year}{semester}-{count+1:04d}"
    
    def _calculate_initial_priority(self, is_renewal: bool, student_id: int) -> int:
        """Calculate initial priority score for application"""
        score = 0
        
        # Renewal applications get higher priority
        if is_renewal:
            score += 100
        
        # Add other priority factors here
        # - Academic performance
        # - Previous scholarship history
        # - Financial need assessment
        
        return score
    
    def _validate_application_documents(self, application: 'Application') -> Tuple[bool, str]:
        """Validate that all required documents are uploaded"""
        
        required_docs = application.scholarship_type.required_documents or []
        uploaded_docs = [f.document_type for f in application.files if f.document_type]
        
        missing_docs = []
        for doc_type in required_docs:
            if doc_type not in uploaded_docs:
                missing_docs.append(doc_type)
        
        if missing_docs:
            return False, f"Missing required documents: {', '.join(missing_docs)}"
        
        return True, "All required documents uploaded"
    
    def _create_initial_review(self, application: 'Application') -> 'ApplicationReview':
        """Create initial review record for submitted application"""
        
        review = ApplicationReview(
            application_id=application.id,
            reviewer_id=1,  # System or default reviewer
            review_stage="initial_review",
            status=ReviewStatus.PENDING,
            due_date=application.review_deadline
        )
        
        self.db.add(review)
        return review
    
    def _create_professor_review_request(self, application: 'Application') -> 'ProfessorReview':
        """Create professor review request"""
        
        # In a real implementation, this would determine the appropriate professor
        professor_id = 1  # Placeholder
        
        professor_review = ProfessorReview(
            application_id=application.id,
            professor_id=professor_id,
            review_type="recommendation",
            is_required=True,
            due_date=datetime.now(timezone.utc) + timedelta(days=14),
            status=ReviewStatus.PENDING
        )
        
        self.db.add(professor_review)
        
        # Create standard review items
        review_items = [
            ("academic_performance", "Academic performance and achievements", 5),
            ("research_potential", "Research potential and capability", 5),
            ("overall_recommendation", "Overall recommendation", 5)
        ]
        
        for item_name, description, max_rating in review_items:
            review_item = ProfessorReviewItem(
                professor_review_id=professor_review.id,
                item_name=item_name,
                item_description=description,
                max_rating=max_rating,
                weight=1.0
            )
            self.db.add(review_item)
        
        return professor_review
    
    def _meets_renewal_criteria(self, application: 'Application') -> bool:
        """Check if renewal application meets auto-approval criteria"""
        
        # Implement renewal criteria logic
        # - Maintained minimum GPA
        # - No academic violations
        # - Satisfactory progress
        # - Complete required documents
        
        # For now, return True as placeholder
        return True


class ScholarshipQuotaService:
    """Service for managing scholarship quotas"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_quota_status(
        self,
        sub_type_config_id: int,
        semester: str
    ) -> Dict[str, Any]:
        """Get quota status for a scholarship sub-type"""
        
        sub_config = self.db.query(ScholarshipSubTypeConfig).filter(
            ScholarshipSubTypeConfig.id == sub_type_config_id
        ).first()
        
        if not sub_config:
            return {}
        
        # Calculate usage by college
        college_usage = {}
        total_approved = 0
        
        if sub_config.quota_per_college:
            for college, quota in sub_config.quota_per_college.items():
                approved_count = self.db.query(Application).filter(
                    and_(
                        Application.sub_type_config_id == sub_type_config_id,
                        Application.semester == semester,
                        Application.status == ApplicationStatus.APPROVED,
                        # Would need proper join to student/college data
                        # Application.student.college == college
                    )
                ).count()
                
                college_usage[college] = {
                    "quota": quota,
                    "used": approved_count,
                    "available": quota - approved_count,
                    "usage_percent": (approved_count / quota * 100) if quota > 0 else 0
                }
                total_approved += approved_count
        
        return {
            "sub_type_config_id": sub_type_config_id,
            "semester": semester,
            "total_quota": sub_config.total_quota,
            "total_used": total_approved,
            "total_available": (sub_config.total_quota or 0) - total_approved,
            "college_breakdown": college_usage
        }
    
    def allocate_remaining_quota(
        self,
        sub_type_config_id: int,
        semester: str
    ) -> Dict[str, int]:
        """Allocate remaining quota to pending applications"""
        
        quota_status = self.get_quota_status(sub_type_config_id, semester)
        
        if quota_status.get("total_available", 0) <= 0:
            return {"allocated": 0, "message": "No remaining quota"}
        
        # Get pending applications ordered by priority
        pending_apps = self.db.query(Application).filter(
            and_(
                Application.sub_type_config_id == sub_type_config_id,
                Application.semester == semester,
                Application.status == ApplicationStatus.UNDER_REVIEW
            )
        ).order_by(
            desc(Application.priority_score),
            asc(Application.submitted_at)
        ).all()
        
        allocated_count = 0
        remaining_quota = quota_status["total_available"]
        
        for app in pending_apps:
            if remaining_quota <= 0:
                break
            
            # Check college-specific quota if applicable
            # In real implementation, would check student's college
            # For now, approve based on total quota
            
            app.status = ApplicationStatus.APPROVED
            app.decision_date = datetime.now(timezone.utc)
            allocated_count += 1
            remaining_quota -= 1
        
        self.db.commit()
        
        return {
            "allocated": allocated_count,
            "remaining_quota": remaining_quota
        } 