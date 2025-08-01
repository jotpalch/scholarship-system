"""
Service for managing notification template variables and rendering templates
"""

import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.notification_template import (
    NotificationTemplateVariable,
    NotificationTemplate,
    NotificationTemplateType
)
from app.models.application import Application
from app.models.student import Student
from app.models.user import User
from app.models.scholarship import ScholarshipType


class NotificationTemplateVariableService:
    """Service for managing template variables and rendering"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_variables_for_template_type(
        self,
        template_type: str,
        active_only: bool = True
    ) -> List[NotificationTemplateVariable]:
        """Get all available variables for a template type"""
        conditions = [NotificationTemplateVariable.template_type == template_type]
        
        if active_only:
            conditions.append(NotificationTemplateVariable.is_active == True)

        query = select(NotificationTemplateVariable).where(and_(*conditions))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def render_template(
        self,
        template: NotificationTemplate,
        context_data: Dict[str, Any],
        language: str = "zh"
    ) -> Tuple[str, str, List[str], List[str]]:
        """
        Render a template with context data
        
        Args:
            template: NotificationTemplate instance
            context_data: Dictionary with variable values
            language: Language code ("zh" or "en")
            
        Returns:
            Tuple of (subject, body, missing_variables, invalid_variables)
        """
        # Get appropriate templates based on language
        if language == "en":
            subject_template = template.subject_template_en or template.subject_template
            body_template = template.body_template_en or template.body_template
        else:
            subject_template = template.subject_template
            body_template = template.body_template

        # Get valid variables for this template type
        variables = await self.get_variables_for_template_type(template.template_type)
        valid_variable_names = {var.variable_name for var in variables}

        # Find all variables in templates
        subject_vars = set(re.findall(r'\{(\w+)\}', subject_template))
        body_vars = set(re.findall(r'\{(\w+)\}', body_template))
        all_template_vars = subject_vars.union(body_vars)

        # Check for missing and invalid variables
        missing_variables = []
        invalid_variables = []

        for var in all_template_vars:
            if var not in context_data:
                missing_variables.append(var)
            elif var not in valid_variable_names:
                invalid_variables.append(var)

        # Create safe context data (only include valid variables)
        safe_context = {}
        for key, value in context_data.items():
            if key in valid_variable_names:
                safe_context[key] = value

        # Render templates with error handling
        try:
            # First pass - render with provided context
            rendered_subject = subject_template.format(**safe_context)
        except KeyError:
            # If some variables are missing, render what we can
            rendered_subject = self._safe_format(subject_template, safe_context)

        try:
            rendered_body = body_template.format(**safe_context)
        except KeyError:
            rendered_body = self._safe_format(body_template, safe_context)

        return rendered_subject, rendered_body, missing_variables, invalid_variables

    async def build_context_for_application(
        self,
        application_id: int,
        template_type: str,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build context data for an application-related notification
        
        Args:
            application_id: Application ID
            template_type: Type of template (determines which variables to include)
            additional_context: Additional context variables
            
        Returns:
            Dictionary with context data for template rendering
        """
        # Get application with related data
        application_query = select(Application).where(Application.id == application_id)
        application_result = await self.db.execute(application_query)
        application = application_result.scalar_one_or_none()
        
        if not application:
            return additional_context or {}

        # Get student information
        student_query = select(Student).where(Student.id == application.student_id)
        student_result = await self.db.execute(student_query)
        student = student_result.scalar_one_or_none()

        # Get scholarship information
        scholarship_query = select(ScholarshipType).where(
            ScholarshipType.id == application.scholarship_type_id
        )
        scholarship_result = await self.db.execute(scholarship_query)
        scholarship = scholarship_result.scalar_one_or_none()

        # Build base context
        context = {
            "application_id": str(application.id),
            "student_name": student.full_name if student else "Unknown Student",
            "student_id": student.student_id if student else "Unknown",
            "scholarship_name": scholarship.name if scholarship else "Unknown Scholarship",
            "submission_date": application.submitted_at.strftime('%Y/%m/%d') if application.submitted_at else "",
            "application_status": application.status.value if application.status else "",
        }

        # Add template-type specific context
        if template_type == NotificationTemplateType.RECOMMENDATION.value:
            # Get professor information if available
            # This would need to be implemented based on your application model
            context.update({
                "professor_name": "Professor Name",  # Replace with actual professor lookup
                "recommendation_deadline": scholarship.review_deadline.strftime('%Y/%m/%d') if scholarship and scholarship.review_deadline else ""
            })

        elif template_type == NotificationTemplateType.REVIEW.value:
            context.update({
                "reviewer_name": "Reviewer Name",  # Replace with actual reviewer lookup
                "review_deadline": scholarship.review_deadline.strftime('%Y/%m/%d') if scholarship and scholarship.review_deadline else "",
                "review_stage": "Initial Review"  # Replace with actual stage
            })

        elif template_type == NotificationTemplateType.SUPPLEMENTARY_DOCUMENT.value:
            context.update({
                "required_documents": "成績單, 推薦信",  # Replace with actual required documents
                "document_deadline": (datetime.now().strftime('%Y/%m/%d'))  # Replace with actual deadline
            })

        elif template_type == NotificationTemplateType.RESULT.value:
            context.update({
                "result": "核准" if application.status == "approved" else "未核准",
                "award_amount": f"NT${scholarship.amount:,.0f}" if scholarship else "N/A",
                "announcement_date": datetime.now().strftime('%Y/%m/%d')
            })

        # Add any additional context
        if additional_context:
            context.update(additional_context)

        return context

    async def build_context_for_scholarship(
        self,
        scholarship_type_id: int,
        template_type: str,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build context data for scholarship-related notifications
        
        Args:
            scholarship_type_id: Scholarship type ID
            template_type: Type of template
            additional_context: Additional context variables
            
        Returns:
            Dictionary with context data
        """
        # Get scholarship information
        scholarship_query = select(ScholarshipType).where(ScholarshipType.id == scholarship_type_id)
        scholarship_result = await self.db.execute(scholarship_query)
        scholarship = scholarship_result.scalar_one_or_none()

        if not scholarship:
            return additional_context or {}

        # Build base context
        context = {
            "scholarship_name": scholarship.name,
            "application_period_start": scholarship.application_start_date.strftime('%Y/%m/%d') if scholarship.application_start_date else "",
            "application_period_end": scholarship.application_end_date.strftime('%Y/%m/%d') if scholarship.application_end_date else "",
        }

        # Add template-type specific context
        if template_type == NotificationTemplateType.WHITELIST.value:
            context.update({
                "whitelist_deadline": scholarship.application_end_date.strftime('%Y/%m/%d') if scholarship.application_end_date else ""
            })

        elif template_type == NotificationTemplateType.ROSTER_CREATION.value:
            context.update({
                "roster_count": 0,  # Replace with actual count
                "creation_date": datetime.now().strftime('%Y/%m/%d'),
                "academic_year": "113",  # Replace with actual academic year
                "semester": "1"  # Replace with actual semester
            })

        # Add any additional context
        if additional_context:
            context.update(additional_context)

        return context

    async def validate_template_variables(
        self,
        template: NotificationTemplate,
        context_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate that all required variables are present in context data
        
        Args:
            template: NotificationTemplate instance
            context_data: Context data to validate
            
        Returns:
            Dictionary with validation results
        """
        # Get required variables for this template type
        variables = await self.get_variables_for_template_type(template.template_type)
        required_variables = [var.variable_name for var in variables if var.is_required]

        # Find all variables used in template
        subject_template = template.subject_template
        body_template = template.body_template
        
        subject_vars = set(re.findall(r'\{(\w+)\}', subject_template))
        body_vars = set(re.findall(r'\{(\w+)\}', body_template))
        used_variables = subject_vars.union(body_vars)

        # Check validation
        missing_required = []
        missing_used = []
        
        for var in required_variables:
            if var not in context_data:
                missing_required.append(var)
        
        for var in used_variables:
            if var not in context_data:
                missing_used.append(var)

        return {
            "is_valid": len(missing_required) == 0,
            "missing_required_variables": missing_required,
            "missing_used_variables": missing_used,
            "required_variables": required_variables,
            "used_variables": list(used_variables)
        }

    def _safe_format(self, template: str, context: Dict[str, Any]) -> str:
        """
        Safely format a template string, leaving unmatched variables as-is
        
        Args:
            template: Template string
            context: Context variables
            
        Returns:
            Formatted string with unmatched variables left as placeholders
        """
        # Replace variables that exist in context
        for key, value in context.items():
            placeholder = f"{{{key}}}"
            if placeholder in template:
                template = template.replace(placeholder, str(value))
        
        return template

    async def get_template_variable_suggestions(
        self,
        template_type: str,
        partial_name: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Get variable suggestions for template editing
        
        Args:
            template_type: Template type to get suggestions for
            partial_name: Partial variable name for filtering
            
        Returns:
            List of variable suggestions with metadata
        """
        variables = await self.get_variables_for_template_type(template_type)
        
        suggestions = []
        for var in variables:
            if not partial_name or partial_name.lower() in var.variable_name.lower():
                suggestions.append({
                    "variable_name": var.variable_name,
                    "variable_key": var.variable_key,
                    "display_name": var.display_name,
                    "display_name_en": var.display_name_en,
                    "description": var.description,
                    "data_type": var.data_type,
                    "is_required": var.is_required,
                    "default_value": var.default_value
                })
        
        return suggestions