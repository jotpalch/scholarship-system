"""
Application service for scholarship application management
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    NotFoundError, ConflictError, ValidationError, 
    BusinessLogicError, AuthorizationError
)
from app.models.user import User, UserRole
from app.models.student import Student, StudentType
from app.models.application import Application, ApplicationStatus, ApplicationReview
from app.models.scholarship import ScholarshipType
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ApplicationListResponse, ApplicationStatusUpdate,
    ApplicationReviewCreate, ApplicationReviewResponse
)


class ApplicationService:
    """Application management service"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def _generate_app_id(self) -> str:
        """Generate unique application ID"""
        year = datetime.now().year
        random_suffix = str(uuid.uuid4().int)[-6:]
        return f"APP-{year}-{random_suffix}"
    
    async def _validate_student_eligibility(
        self, 
        student: Student, 
        scholarship_type: str,
        application_data: ApplicationCreate
    ) -> None:
        """Validate student eligibility for scholarship"""
        # Get scholarship type configuration
        stmt = select(ScholarshipType).where(ScholarshipType.code == scholarship_type)
        result = await self.db.execute(stmt)
        scholarship = result.scalar_one_or_none()
        
        if not scholarship:
            raise NotFoundError("Scholarship type", scholarship_type)
        
        if not scholarship.is_active:
            raise ValidationError("Scholarship type is not active")
        
        if not scholarship.is_application_period:
            raise ValidationError("Application period has ended")
        
        # Check student type eligibility  
        eligible_types: List[str] = scholarship.eligible_student_types or []
        student_type = student.get_student_type().value
        if eligible_types and student_type not in eligible_types:
            raise ValidationError(f"Student type {student_type} is not eligible for this scholarship")
        
        # Check GPA requirement
        if scholarship.min_gpa and application_data.gpa < scholarship.min_gpa:
            raise ValidationError(f"GPA {application_data.gpa} does not meet minimum requirement {scholarship.min_gpa}")
        
        # Check ranking requirement for undergraduate students
        if student_type == "undergraduate" and scholarship.max_ranking_percent:
            if (application_data.class_ranking_percent and 
                application_data.class_ranking_percent > scholarship.max_ranking_percent):
                raise ValidationError(f"Class ranking {application_data.class_ranking_percent}% exceeds maximum {scholarship.max_ranking_percent}%")
        
        # Check term count requirement
        if scholarship.max_completed_terms and application_data.completed_terms > scholarship.max_completed_terms:
            raise ValidationError(f"Completed terms {application_data.completed_terms} exceeds maximum {scholarship.max_completed_terms}")
        
        # Check for existing active applications
        stmt = select(Application).where(
            and_(
                Application.user_id == student.user_id,
                Application.scholarship_type == scholarship_type,
                Application.status.in_([
                    ApplicationStatus.SUBMITTED.value,
                    ApplicationStatus.UNDER_REVIEW.value,
                    ApplicationStatus.PENDING_RECOMMENDATION.value,
                    ApplicationStatus.RECOMMENDED.value
                ])
            )
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ConflictError("You already have an active application for this scholarship")
    
    async def create_application(
        self, 
        user: User, 
        application_data: ApplicationCreate
    ) -> ApplicationResponse:
        """Create a new scholarship application"""
        # Get student profile
        stmt = select(Student).where(Student.user_id == user.id)
        result = await self.db.execute(stmt)
        student = result.scalar_one_or_none()
        
        if not student:
            raise ValidationError("Student profile not found")
        
        # Validate eligibility
        await self._validate_student_eligibility(student, application_data.scholarship_type, application_data)
        
        # Get scholarship details
        stmt = select(ScholarshipType).where(ScholarshipType.code == application_data.scholarship_type)
        result = await self.db.execute(stmt)
        scholarship = result.scalar_one_or_none()
        
        # Create application
        app_id = self._generate_app_id()
        application = Application(
            app_id=app_id,
            user_id=user.id,
            student_id=student.id,
            scholarship_type=application_data.scholarship_type,
            scholarship_name=scholarship.name if scholarship else None,
            amount=scholarship.amount if scholarship else None,
            status=ApplicationStatus.DRAFT.value,
            status_name="草稿",
            academic_year=application_data.academic_year,
            semester=application_data.semester,
            gpa=application_data.gpa,
            class_ranking_percent=application_data.class_ranking_percent,
            dept_ranking_percent=application_data.dept_ranking_percent,
            completed_terms=application_data.completed_terms,
            contact_phone=application_data.contact_phone,
            contact_email=application_data.contact_email,
            contact_address=application_data.contact_address,
            bank_account=application_data.bank_account,
            research_proposal=application_data.research_proposal,
            budget_plan=application_data.budget_plan,
            milestone_plan=application_data.milestone_plan,
            agree_terms=application_data.agree_terms,
            form_data=application_data.model_dump()
        )
        
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        
        return ApplicationResponse.model_validate(application)
    
    async def get_user_applications(
        self, 
        user: User, 
        status: Optional[str] = None
    ) -> List[ApplicationListResponse]:
        """Get applications for a user"""
        stmt = select(Application).where(Application.user_id == user.id)
        
        if status:
            stmt = stmt.where(Application.status == status)
        
        stmt = stmt.order_by(desc(Application.created_at))
        result = await self.db.execute(stmt)
        applications = result.scalars().all()
        
        return [ApplicationListResponse.model_validate(app) for app in applications]
    
    async def get_student_dashboard_stats(self, user: User) -> Dict[str, Any]:
        """Get dashboard statistics for student"""
        # Count applications by status
        stmt = select(
            Application.status,
            func.count(Application.id).label('count')
        ).where(Application.user_id == user.id).group_by(Application.status)
        
        result = await self.db.execute(stmt)
        status_counts = {}
        total_applications = 0
        
        for row in result:
            count_value = row[1]  # Access by index since count is the second column
            status_counts[row[0]] = count_value  # status is the first column
            total_applications += count_value
        
        # Get recent applications
        stmt = select(Application).where(
            Application.user_id == user.id
        ).order_by(desc(Application.created_at)).limit(5)
        
        result = await self.db.execute(stmt)
        recent_applications = result.scalars().all()
        
        return {
            "total_applications": total_applications,
            "status_counts": status_counts,
            "recent_applications": [ApplicationListResponse.model_validate(app) for app in recent_applications]
        }
    
    async def get_application_by_id(
        self, 
        application_id: int, 
        user: Optional[User] = None
    ) -> ApplicationResponse:
        """Get application by ID"""
        stmt = select(Application).options(
            selectinload(Application.files),
            selectinload(Application.reviews)
        ).where(Application.id == application_id)
        
        # If user is provided and not staff, filter by user
        if user and not user.has_role(UserRole.ADMIN) and not user.has_role(UserRole.REVIEWER):
            stmt = stmt.where(Application.user_id == user.id)
        
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise NotFoundError("Application", str(application_id))
        
        return ApplicationResponse.model_validate(application)
    
    async def update_application(
        self, 
        application_id: int, 
        user: User, 
        update_data: ApplicationUpdate
    ) -> ApplicationResponse:
        """Update application"""
        # Get the actual application model, not the response
        stmt = select(Application).where(
            and_(Application.id == application_id, Application.user_id == user.id)
        )
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise NotFoundError("Application", str(application_id))
        
        if not application.is_editable:
            raise BusinessLogicError("Application cannot be edited in current status")
        
        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(application, field):
                setattr(application, field, value)
        
        await self.db.commit()
        await self.db.refresh(application)
        
        return ApplicationResponse.model_validate(application)
    
    async def submit_application(self, application_id: int, user: User) -> ApplicationResponse:
        """Submit application for review"""
        stmt = select(Application).where(
            and_(Application.id == application_id, Application.user_id == user.id)
        )
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise NotFoundError("Application", str(application_id))
        
        if application.status != ApplicationStatus.DRAFT.value:
            raise BusinessLogicError("Only draft applications can be submitted")
        
        if not application.agree_terms:
            raise ValidationError("Must agree to terms and conditions")
        
        # Update status
        application.status = ApplicationStatus.SUBMITTED.value
        application.status_name = "已提交"
        application.submitted_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(application)
        
        return ApplicationResponse.model_validate(application)
    
    async def get_applications_for_review(
        self, 
        user: User,
        status: Optional[str] = None,
        scholarship_type: Optional[str] = None
    ) -> List[ApplicationListResponse]:
        """Get applications for review (staff only)"""
        if not user.has_role(UserRole.ADMIN) and not user.has_role(UserRole.REVIEWER):
            raise AuthorizationError("Staff access required")
        
        stmt = select(Application).join(Student).join(User)
        
        # Filter by status
        if status:
            stmt = stmt.where(Application.status == status)
        else:
            # Default to reviewable statuses
            stmt = stmt.where(Application.status.in_([
                ApplicationStatus.SUBMITTED.value,
                ApplicationStatus.UNDER_REVIEW.value,
                ApplicationStatus.PENDING_RECOMMENDATION.value
            ]))
        
        if scholarship_type:
            stmt = stmt.where(Application.scholarship_type == scholarship_type)
        
        stmt = stmt.order_by(desc(Application.submitted_at))
        result = await self.db.execute(stmt)
        applications = result.scalars().all()
        
        # Add student info to response
        response_list = []
        for app in applications:
            app_data = ApplicationListResponse.model_validate(app)
            if app.student_profile:
                app_data.student_name = app.student_profile.user.display_name
                app_data.student_no = app.student_profile.student_no
            response_list.append(app_data)
        
        return response_list
    
    async def update_application_status(
        self, 
        application_id: int, 
        user: User, 
        status_update: ApplicationStatusUpdate
    ) -> ApplicationResponse:
        """Update application status (staff only)"""
        if not user.has_role(UserRole.ADMIN) and not user.has_role(UserRole.REVIEWER):
            raise AuthorizationError("Staff access required")
        
        stmt = select(Application).where(Application.id == application_id)
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise NotFoundError("Application", str(application_id))
        
        # Update status
        application.status = status_update.status
        application.reviewer_id = user.id
        
        if status_update.status == ApplicationStatus.APPROVED.value:
            application.approved_at = datetime.utcnow()
            application.status_name = "已核准"
        elif status_update.status == ApplicationStatus.REJECTED.value:
            application.status_name = "已拒絕"
            if hasattr(status_update, 'rejection_reason') and status_update.rejection_reason:
                application.rejection_reason = status_update.rejection_reason
        
        if hasattr(status_update, 'comments') and status_update.comments:
            application.review_comments = status_update.comments
        
        application.reviewed_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(application)
        
        return ApplicationResponse.model_validate(application)
    
    async def upload_application_file(
        self, 
        application_id: int, 
        user: User, 
        file, 
        file_type: str
    ) -> Dict[str, Any]:
        """Upload file for application"""
        # Get application
        stmt = select(Application).where(
            and_(Application.id == application_id, Application.user_id == user.id)
        )
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise NotFoundError("Application", str(application_id))
        
        if not application.is_editable:
            raise BusinessLogicError("Cannot upload files to application in current status")
        
        # For now, return a placeholder response
        # In a real implementation, this would handle file storage
        return {
            "message": "File upload functionality not yet implemented",
            "application_id": application_id,
            "file_type": file_type,
            "filename": getattr(file, 'filename', 'unknown')
        } 