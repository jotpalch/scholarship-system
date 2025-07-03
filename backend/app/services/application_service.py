"""
Application service for scholarship application management
"""

import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import selectinload, joinedload

from app.core.exceptions import (
    NotFoundError, ConflictError, ValidationError, 
    BusinessLogicError, AuthorizationError
)
from app.models.user import User, UserRole
from app.models.student import Student, StudentType
from app.models.application import Application, ApplicationStatus, ApplicationReview, ProfessorReview
from app.models.scholarship import ScholarshipType
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ApplicationListResponse, ApplicationStatusUpdate,
    ApplicationReviewCreate, ApplicationReviewResponse
)
from app.services.email_service import EmailService
from app.services.minio_service import minio_service


async def get_student_from_user(user: User, db: AsyncSession) -> Optional[Student]:
    """Get student record from user"""
    if user.role != UserRole.STUDENT or not user.student_no:
        return None
    
    stmt = select(Student).where(Student.stdNo == user.student_no)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


class ApplicationService:
    """Application management service"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.emailService = EmailService()
    
    def _serialize_for_json(self, data: Any) -> Any:
        """Serialize data for JSON response"""
        if isinstance(data, Decimal):
            return float(data)
        elif isinstance(data, datetime):
            return data.isoformat()
        elif isinstance(data, list):
            return [self._serialize_for_json(item) for item in data]
        elif isinstance(data, dict):
            return {k: self._serialize_for_json(v) for k, v in data.items()}
        return data
    
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
        
        # Check whitelist eligibility (only for scholarships with whitelist enabled)
        if not scholarship.is_student_in_whitelist(student.id):
            if scholarship.whitelist_enabled:
                raise ValidationError("您不在此獎學金的白名單內，僅限預先核准的學生申請")
            else:
                # This should not happen with correct model logic, but kept as safety check
                raise ValidationError("申請資格驗證失敗，請聯繫管理員")
        
        # Optional: Check ranking requirement for undergraduate students (keeping as additional validation)
        if student_type == "undergraduate" and scholarship.max_ranking_percent:
            if (application_data.class_ranking_percent and 
                application_data.class_ranking_percent > scholarship.max_ranking_percent):
                raise ValidationError(f"Class ranking {application_data.class_ranking_percent}% exceeds maximum {scholarship.max_ranking_percent}%")
        
        # Check term count requirement
        if scholarship.max_completed_terms and application_data.completed_terms is not None and application_data.completed_terms > scholarship.max_completed_terms:
            raise ValidationError(f"Completed terms {application_data.completed_terms} exceeds maximum {scholarship.max_completed_terms}")
        
        # ------------------------------------------------------------------
        # GPA validation (must consider sub-scholarship requirements)
        # ------------------------------------------------------------------

        # Determine minimal GPA requirement among the main scholarship and its sub-scholarships (if any)
        min_required_gpa: Optional[Decimal] = scholarship.min_gpa if scholarship.min_gpa is not None else None

        # If the scholarship is combined, inspect sub-scholarships for GPA rules
        if scholarship.is_combined:
            for sub in scholarship.get_sub_scholarships():
                if sub.min_gpa is not None:
                    if min_required_gpa is None or sub.min_gpa < min_required_gpa:
                        min_required_gpa = sub.min_gpa

        # Perform GPA check if requirement exists and application GPA provided
        if min_required_gpa is not None and application_data.gpa is not None:
            if Decimal(application_data.gpa) < Decimal(min_required_gpa):
                raise ValidationError(
                    f"GPA {application_data.gpa} does not meet minimum requirement {min_required_gpa} for this scholarship"
                )
        
        # Check for existing active applications
        # In the new design, we need to get user ID differently
        # For now, we'll pass it as a parameter or check via student_id
        stmt = select(Application).where(
            and_(
                Application.student_id == student.id,
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
        student = await get_student_from_user(user, self.db)
        
        if not student:
            raise ValidationError(f"Student profile not found for user {user.username}")
        
        # Validate eligibility
        await self._validate_student_eligibility(student, application_data.scholarship_type, application_data)
        
        # Get scholarship details
        stmt = select(ScholarshipType).where(ScholarshipType.code == application_data.scholarship_type)
        result = await self.db.execute(stmt)
        scholarship = result.scalar_one_or_none()
        
        # Resolve sub-scholarship if provided
        sub_scholarship: Optional[ScholarshipType] = None
        if getattr(application_data, "sub_scholarship_type_id", None):
            sub_stmt = select(ScholarshipType).where(ScholarshipType.id == application_data.sub_scholarship_type_id)
            sub_result = await self.db.execute(sub_stmt)
            sub_scholarship = sub_result.scalar_one_or_none()
        
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
            scholarship_type_id=scholarship.id if scholarship else None,
            sub_scholarship_type_id=sub_scholarship.id if sub_scholarship else None,
            form_data=self._serialize_for_json(application_data.model_dump())
        )
        
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        
        # Create response with empty lists for related objects
        response_data = application.__dict__.copy()
        response_data['files'] = []
        response_data['reviews'] = []
        response_data['professor_reviews'] = []
        
        return ApplicationResponse.model_validate(response_data)
    
    async def save_application_draft(
        self, 
        user: User, 
        application_data: ApplicationCreate
    ) -> ApplicationResponse:
        """Save application as draft with minimal validation"""
        # Get student profile
        student = await get_student_from_user(user, self.db)
        
        if not student:
            raise ValidationError(f"Student profile not found for user {user.username}")
        
        # 暫存不需要完整驗證，只檢查基本欄位
        if not application_data.scholarship_type:
            raise ValidationError("Scholarship type is required for draft")
        
        # Get scholarship details
        stmt = select(ScholarshipType).where(ScholarshipType.code == application_data.scholarship_type)
        result = await self.db.execute(stmt)
        scholarship = result.scalar_one_or_none()
        
        # Create draft application with minimal required fields
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
            academic_year=getattr(application_data, 'academic_year', None) or "2024",
            semester=getattr(application_data, 'semester', None) or "1",
            gpa=getattr(application_data, 'gpa', None),
            class_ranking_percent=getattr(application_data, 'class_ranking_percent', None),
            dept_ranking_percent=getattr(application_data, 'dept_ranking_percent', None),
            completed_terms=getattr(application_data, 'completed_terms', None),
            contact_phone=getattr(application_data, 'contact_phone', None),
            contact_email=getattr(application_data, 'contact_email', None),
            contact_address=getattr(application_data, 'contact_address', None),
            bank_account=getattr(application_data, 'bank_account', None),
            research_proposal=getattr(application_data, 'research_proposal', None) or getattr(application_data, 'personal_statement', None),
            budget_plan=getattr(application_data, 'budget_plan', None),
            milestone_plan=getattr(application_data, 'milestone_plan', None),
            agree_terms=getattr(application_data, 'agree_terms', None) or False,
            form_data=self._serialize_for_json(application_data.model_dump())
        )
        
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        
        # Create response with empty lists for related objects
        response_data = application.__dict__.copy()
        response_data['files'] = []
        response_data['reviews'] = []
        response_data['professor_reviews'] = []
        
        return ApplicationResponse.model_validate(response_data)
    
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
            selectinload(Application.reviews),
            selectinload(Application.professor_reviews)
        ).where(Application.id == application_id)
        
        # If user is provided and not staff, filter by user
        if user and not user.has_role(UserRole.ADMIN) and not user.has_role(UserRole.COLLEGE):
            stmt = stmt.where(Application.user_id == user.id)
        
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise NotFoundError("Application", str(application_id))
        
        # Convert to response and add file URLs
        app_response = ApplicationResponse.model_validate(application)
        
        # Generate download URLs for files with user token
        if application.files and user:
            from app.schemas.application import ApplicationFileResponse
            from app.core.config import settings
            from app.core.security import create_access_token
            
            # Generate a temporary token for file access
            token_data = {"sub": str(user.id)}
            access_token = create_access_token(token_data)
            
            files_with_urls = []
            for file in application.files:
                # Create proper ApplicationFileResponse object
                file_response = ApplicationFileResponse.model_validate(file)
                
                # Generate backend proxy URLs instead of MinIO direct URLs
                if file.object_name:
                    # Use backend file proxy endpoint with token
                    base_url = f"http://localhost:8000{settings.api_v1_str}"
                    file_response.file_path = f"{base_url}/files/applications/{application_id}/files/{file.id}?token={access_token}"
                    file_response.download_url = f"{base_url}/files/applications/{application_id}/files/{file.id}/download?token={access_token}"
                else:
                    file_response.file_path = None
                    file_response.download_url = None
                
                files_with_urls.append(file_response)
            
            app_response.files = files_with_urls
        
        return app_response
    
    async def update_application(
        self, 
        application_id: int, 
        user: User, 
        update_data: ApplicationUpdate
    ) -> ApplicationResponse:
        """Update application"""
        # Get the actual application model with eager loading of relationships
        stmt = select(Application).options(
            selectinload(Application.files),
            selectinload(Application.reviews),
            selectinload(Application.professor_reviews)
        ).where(
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
        # 特殊流程：學士班新生獎學金與逕博獎學金直接進入 admin 審查
        if application.scholarship_type in ["undergraduate_freshman", "direct_phd"]:
            application.status = ApplicationStatus.UNDER_REVIEW.value
            application.status_name = "審核中"
        else:
            application.status = ApplicationStatus.PENDING_RECOMMENDATION.value
            application.status_name = "待教授推薦"
            # 通知指導教授
            try:
                await self.emailService.send_to_professor(application, db=self.db)
            except Exception as e:
                print(f"[Email Error] {e}")
        application.submitted_at = datetime.utcnow()
        await self.db.commit()
        
        # Return fresh copy with all relationships loaded
        return await self.get_application_by_id(application_id, user)
    
    async def get_applications_for_review(
        self, 
        user: User,
        status: Optional[str] = None,
        scholarship_type: Optional[str] = None
    ) -> List[ApplicationListResponse]:
        """Get applications for review (staff only)"""
        if not (user.has_role(UserRole.ADMIN) or user.has_role(UserRole.COLLEGE) or user.has_role(UserRole.PROFESSOR) or user.has_role(UserRole.SUPER_ADMIN)):
            raise AuthorizationError("Staff access required")
        
        stmt = select(Application).options(
            joinedload(Application.studentProfile),
            joinedload(Application.student)
        )
        
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
        
        # Add student info and computed fields to response
        response_list = []
        for app in applications:
            app_data = ApplicationListResponse.model_validate(app)
            
            # Add student information from User relationship (student)
            if app.student:
                app_data.student_name = app.student.full_name or app.student.chinese_name or app.student.username
                if hasattr(app.student, 'student_no') and app.student.student_no:
                    app_data.student_no = app.student.student_no
            
            # Add student information from Student relationship (studentProfile)
            if app.studentProfile:
                if not app_data.student_no and hasattr(app.studentProfile, 'stdNo'):
                    app_data.student_no = app.studentProfile.stdNo
                if not app_data.student_name and hasattr(app.studentProfile, 'cname'):
                    app_data.student_name = app.studentProfile.cname
            
            # Add scholarship information (these are stored directly in Application)
            app_data.amount = app.amount
            app_data.scholarship_name = app.scholarship_name
            
            # Calculate days waiting
            if app.submitted_at:
                from datetime import datetime, timezone
                # Handle both timezone-aware and timezone-naive datetimes
                now = datetime.now(timezone.utc)
                submitted_time = app.submitted_at
                
                # If submitted_at is timezone-naive, make it timezone-aware (assume UTC)
                if submitted_time.tzinfo is None:
                    submitted_time = submitted_time.replace(tzinfo=timezone.utc)
                
                days_diff = (now - submitted_time).days
                app_data.days_waiting = max(0, days_diff)
            
            # Add Chinese scholarship type name
            app_data = self._add_scholarship_type_zh(app_data)
            
            response_list.append(app_data)
        
        return response_list
    
    async def update_application_status(
        self, 
        application_id: int, 
        user: User, 
        status_update: ApplicationStatusUpdate
    ) -> ApplicationResponse:
        """Update application status (staff only)"""
        if not (user.has_role(UserRole.ADMIN) or user.has_role(UserRole.COLLEGE) or user.has_role(UserRole.PROFESSOR) or user.has_role(UserRole.SUPER_ADMIN)):
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
        
        # Return fresh copy with all relationships loaded
        return await self.get_application_by_id(application_id)
    
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
    
    async def submit_professor_review(self, application_id: int, user: User, review_data: ApplicationReviewCreate) -> ApplicationResponse:
        """Professor submits review and selects awards for an application"""
        stmt = select(Application).where(Application.id == application_id)
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        if not application:
            raise NotFoundError("Application", str(application_id))
        # Only the assigned professor can submit
        if application.professor_id != user.id:
            raise AuthorizationError("You are not the assigned professor for this application")
        # Update selected awards and review status
        application.professor_selected_awards = review_data.selected_awards or []
        application.professor_review_status = "completed"
        # Optionally, store recommendation/comments
        if review_data.recommendation:
            application.review_comments = review_data.recommendation
        await self.db.commit()
        
        # Return fresh copy with all relationships loaded
        return await self.get_application_by_id(application_id)
    
    async def create_professor_review(self, application_id: int, user: User, review_data) -> ApplicationResponse:
        """Create a professor review record and notify college reviewers"""
        from app.models.application import ProfessorReview
        stmt = select(Application).where(Application.id == application_id)
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        if not application:
            raise NotFoundError("Application", str(application_id))
        # Only the assigned professor can submit
        if application.professor_id != user.id:
            raise AuthorizationError("You are not the assigned professor for this application")
        # Create review record
        review = ProfessorReview(
            application_id=application_id,
            professor_id=user.id,
            selected_awards=review_data.selected_awards or [],
            recommendation=review_data.recommendation,
            review_status=review_data.review_status or "completed",
            reviewed_at=datetime.utcnow()
        )
        self.db.add(review)
        await self.db.commit()
        
        # 自動寄信通知學院審查人員
        try:
            await self.emailService.send_to_college_reviewers(application, db=self.db)
        except Exception as e:
            print(f"[Email Error] {e}")
        
        # Return fresh copy with all relationships loaded
        return await self.get_application_by_id(application_id)
    
    async def upload_application_file_minio(
        self, 
        application_id: int, 
        user: User, 
        file, 
        file_type: str
    ) -> Dict[str, Any]:
        """Upload application file using MinIO"""
        # Verify application exists and user has access
        stmt = select(Application).where(Application.id == application_id)
        result = await self.db.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise NotFoundError("Application", str(application_id))
        
        # For students, they can only upload to their own applications
        if user.role == UserRole.STUDENT and application.user_id != user.id:
            raise AuthorizationError("Cannot upload files to other students' applications")
        
        # Upload file to MinIO
        object_name, file_size = await minio_service.upload_file(file, application_id, file_type)
        
        # Import ApplicationFile here to avoid circular imports
        from app.models.application import ApplicationFile
        
        # Save file metadata to database
        file_record = ApplicationFile(
            application_id=application_id,
            filename=file.filename,
            file_type=file_type,
            file_size=file_size,
            object_name=object_name,
            upload_date=datetime.utcnow(),
            content_type=file.content_type or 'application/octet-stream',
            mime_type=file.content_type or 'application/octet-stream'
        )
        
        self.db.add(file_record)
        await self.db.commit()
        await self.db.refresh(file_record)
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "data": {
                "file_id": file_record.id,
                "filename": file_record.filename,
                "file_type": file_record.file_type,
                "file_size": file_record.file_size,
                "upload_date": file_record.upload_date.isoformat()
            }
        }
    
    def _add_scholarship_type_zh(self, app_data: ApplicationListResponse) -> ApplicationListResponse:
        """Add Chinese scholarship type name to application response"""
        scholarship_type_zh = {
            "undergraduate_freshman": "學士班新生獎學金",
            "phd_nstc": "國科會博士生獎學金", 
            "phd_moe": "教育部博士生獎學金",
            "direct_phd": "逕博獎學金"
        }
        app_data.scholarship_type_zh = scholarship_type_zh.get(app_data.scholarship_type, app_data.scholarship_type)
        return app_data
    
 