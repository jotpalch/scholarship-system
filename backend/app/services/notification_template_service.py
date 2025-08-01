"""
Notification template service for managing scholarship-specific notification templates
"""

import json
import re
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, update, delete
from sqlalchemy.orm import selectinload, joinedload

from app.models.notification_template import (
    NotificationTemplate, 
    NotificationTemplateType, 
    NotificationTemplateVariable, 
    NotificationTemplateHistory
)
from app.models.scholarship import ScholarshipType
from app.models.user import User, UserRole
from app.schemas.notification_template import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    NotificationTemplateSearch,
    NotificationTemplatePreview,
    NotificationTemplatePreviewResponse
)
from app.core.exceptions import HTTPException
from app.services.notification_template_permission_service import NotificationTemplatePermissionService


class NotificationTemplateService:
    """Service for managing notification templates"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.permission_service = NotificationTemplatePermissionService(db)

    async def create_template(
        self,
        template_data: NotificationTemplateCreate,
        created_by: int
    ) -> NotificationTemplate:
        """
        Create a new notification template
        
        Args:
            template_data: Template creation data
            created_by: User ID creating the template
            
        Returns:
            Created NotificationTemplate instance
        """
        # Check if template with same key already exists for this scholarship type
        existing_query = select(NotificationTemplate).where(
            and_(
                NotificationTemplate.scholarship_type_id == template_data.scholarship_type_id,
                NotificationTemplate.template_type == template_data.template_type,
                NotificationTemplate.template_key == template_data.template_key
            )
        )
        existing_result = await self.db.execute(existing_query)
        existing_template = existing_result.scalar_one_or_none()
        
        if existing_template:
            raise HTTPException(
                status_code=400,
                detail=f"Template with key '{template_data.template_key}' already exists for this scholarship type and template type"
            )

        # If this is set as default, unset other defaults for the same type
        if template_data.is_default:
            await self._unset_default_templates(
                template_data.scholarship_type_id,
                template_data.template_type
            )

        # Create the template
        template = NotificationTemplate(
            **template_data.dict(),
            created_by=created_by,
            updated_by=created_by
        )
        
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        
        # Create history record
        await self._create_history_record(
            template.id,
            "created",
            "Template created",
            created_by,
            template_data.dict()
        )
        
        return template

    async def get_template(self, template_id: int) -> Optional[NotificationTemplate]:
        """Get a template by ID"""
        query = select(NotificationTemplate).where(NotificationTemplate.id == template_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_template_with_scholarship(self, template_id: int) -> Optional[Dict[str, Any]]:
        """Get a template with scholarship information"""
        query = select(NotificationTemplate).options(
            joinedload(NotificationTemplate.scholarship_type)
        ).where(NotificationTemplate.id == template_id)
        
        result = await self.db.execute(query)
        template = result.scalar_one_or_none()
        
        if not template:
            return None
            
        template_dict = {
            **template.__dict__,
            "scholarship_name": template.scholarship_type.name if template.scholarship_type else None,
            "scholarship_code": template.scholarship_type.code if template.scholarship_type else None
        }
        
        return template_dict

    async def update_template(
        self,
        template_id: int,
        template_data: NotificationTemplateUpdate,
        updated_by: int
    ) -> Optional[NotificationTemplate]:
        """Update an existing template"""
        template = await self.get_template(template_id)
        if not template:
            return None

        # Store previous content for history
        previous_content = {
            "name": template.name,
            "name_en": template.name_en,
            "subject_template": template.subject_template,
            "subject_template_en": template.subject_template_en,
            "body_template": template.body_template,
            "body_template_en": template.body_template_en,
            "cc_emails": template.cc_emails,
            "bcc_emails": template.bcc_emails,
            "is_active": template.is_active,
            "is_default": template.is_default
        }

        # If setting as default, unset other defaults
        if template_data.is_default:
            await self._unset_default_templates(
                template.scholarship_type_id,
                template.template_type,
                exclude_id=template_id
            )

        # Update template
        update_data = template_data.dict(exclude_unset=True)
        update_data["updated_by"] = updated_by
        
        for field, value in update_data.items():
            setattr(template, field, value)

        await self.db.commit()
        await self.db.refresh(template)

        # Create history record
        await self._create_history_record(
            template_id,
            "updated",
            "Template updated",
            updated_by,
            previous_content
        )

        return template

    async def delete_template(self, template_id: int, deleted_by: int) -> bool:
        """Delete a template"""
        template = await self.get_template(template_id)
        if not template:
            return False

        # Store content for history before deletion
        previous_content = {
            "name": template.name,
            "scholarship_type_id": template.scholarship_type_id,
            "template_type": template.template_type,
            "template_key": template.template_key,
            "subject_template": template.subject_template,
            "body_template": template.body_template,
            "is_active": template.is_active
        }

        # Create history record before deletion
        await self._create_history_record(
            template_id,
            "deleted",
            "Template deleted",
            deleted_by,
            previous_content
        )

        await self.db.delete(template)
        await self.db.commit()

        return True

    async def search_templates(
        self,
        search_params: NotificationTemplateSearch
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search templates with filters"""
        query = select(NotificationTemplate).options(
            joinedload(NotificationTemplate.scholarship_type)
        )

        # Apply filters
        conditions = []
        
        if search_params.scholarship_type_id is not None:
            conditions.append(NotificationTemplate.scholarship_type_id == search_params.scholarship_type_id)
        
        if search_params.template_type:
            conditions.append(NotificationTemplate.template_type == search_params.template_type)
        
        if search_params.search_term:
            search_term = f"%{search_params.search_term}%"
            conditions.append(
                or_(
                    NotificationTemplate.name.ilike(search_term),
                    NotificationTemplate.name_en.ilike(search_term),
                    NotificationTemplate.description.ilike(search_term),
                    NotificationTemplate.template_key.ilike(search_term)
                )
            )
        
        if search_params.is_active is not None:
            conditions.append(NotificationTemplate.is_active == search_params.is_active)
        
        if search_params.is_default is not None:
            conditions.append(NotificationTemplate.is_default == search_params.is_default)
        
        if search_params.created_by:
            conditions.append(NotificationTemplate.created_by == search_params.created_by)
        
        if search_params.date_from:
            conditions.append(NotificationTemplate.created_at >= search_params.date_from)
        
        if search_params.date_to:
            conditions.append(NotificationTemplate.created_at <= search_params.date_to)

        if conditions:
            query = query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count(NotificationTemplate.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        # Apply pagination and ordering
        query = query.order_by(desc(NotificationTemplate.updated_at))
        query = query.offset(search_params.skip).limit(search_params.limit)

        result = await self.db.execute(query)
        templates = result.scalars().all()

        # Convert to dicts with scholarship info
        template_dicts = []
        for template in templates:
            template_dict = {
                **template.__dict__,
                "scholarship_name": template.scholarship_type.name if template.scholarship_type else None,
                "scholarship_code": template.scholarship_type.code if template.scholarship_type else None
            }
            template_dicts.append(template_dict)

        return template_dicts, total

    async def get_templates_for_scholarship(
        self,
        scholarship_type_id: int,
        template_type: Optional[str] = None,
        active_only: bool = True
    ) -> List[NotificationTemplate]:
        """Get all templates for a specific scholarship type"""
        conditions = [NotificationTemplate.scholarship_type_id == scholarship_type_id]
        
        if template_type:
            conditions.append(NotificationTemplate.template_type == template_type)
        
        if active_only:
            conditions.append(NotificationTemplate.is_active == True)

        query = select(NotificationTemplate).where(and_(*conditions))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_default_template(
        self,
        scholarship_type_id: Optional[int],
        template_type: str
    ) -> Optional[NotificationTemplate]:
        """Get the default template for a scholarship type and template type"""
        query = select(NotificationTemplate).where(
            and_(
                NotificationTemplate.scholarship_type_id == scholarship_type_id,
                NotificationTemplate.template_type == template_type,
                NotificationTemplate.is_default == True,
                NotificationTemplate.is_active == True
            )
        )
        
        result = await self.db.execute(query)
        template = result.scalar_one_or_none()
        
        # If no scholarship-specific default found, try global default
        if not template and scholarship_type_id is not None:
            global_query = select(NotificationTemplate).where(
                and_(
                    NotificationTemplate.scholarship_type_id.is_(None),
                    NotificationTemplate.template_type == template_type,
                    NotificationTemplate.is_default == True,
                    NotificationTemplate.is_active == True
                )
            )
            
            global_result = await self.db.execute(global_query)
            template = global_result.scalar_one_or_none()

        return template

    async def preview_template(
        self,
        preview_data: NotificationTemplatePreview
    ) -> NotificationTemplatePreviewResponse:
        """Preview a template with provided context data"""
        template = await self.get_template(preview_data.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Get the appropriate templates based on language
        if preview_data.language == "en":
            subject_template = template.subject_template_en or template.subject_template
            body_template = template.body_template_en or template.body_template
        else:
            subject_template = template.subject_template
            body_template = template.body_template

        # Get available variables for this template type
        variables = await self.get_template_variables(template.template_type)
        variable_names = [var.variable_name for var in variables]

        # Find all variables in templates
        subject_vars = set(re.findall(r'\{(\w+)\}', subject_template))
        body_vars = set(re.findall(r'\{(\w+)\}', body_template))
        all_template_vars = subject_vars.union(body_vars)

        # Check for missing and invalid variables
        missing_variables = []
        invalid_variables = []

        for var in all_template_vars:
            if var not in preview_data.context_data:
                missing_variables.append(var)
            elif var not in variable_names:
                invalid_variables.append(var)

        # Render templates
        try:
            rendered_subject = subject_template.format(**preview_data.context_data)
        except KeyError:
            rendered_subject = subject_template  # Return original if substitution fails

        try:
            rendered_body = body_template.format(**preview_data.context_data)
        except KeyError:
            rendered_body = body_template  # Return original if substitution fails

        return NotificationTemplatePreviewResponse(
            subject=rendered_subject,
            body=rendered_body,
            missing_variables=missing_variables,
            invalid_variables=invalid_variables
        )

    async def duplicate_template(
        self,
        template_id: int,
        new_name: str,
        new_scholarship_type_id: Optional[int],
        created_by: int
    ) -> Optional[NotificationTemplate]:
        """Duplicate an existing template"""
        original = await self.get_template(template_id)
        if not original:
            return None

        # Create new template data
        template_data = NotificationTemplateCreate(
            scholarship_type_id=new_scholarship_type_id,
            template_type=original.template_type,
            template_key=f"{original.template_key}_copy_{int(datetime.now().timestamp())}",
            name=new_name,
            name_en=f"{original.name_en} (Copy)" if original.name_en else None,
            subject_template=original.subject_template,
            subject_template_en=original.subject_template_en,
            body_template=original.body_template,
            body_template_en=original.body_template_en,
            cc_emails=original.cc_emails,
            bcc_emails=original.bcc_emails,
            available_variables=original.available_variables,
            description=original.description,
            description_en=original.description_en,
            is_active=True,
            is_default=False  # Duplicated templates are never default
        )

        return await self.create_template(template_data, created_by)

    async def get_template_variables(
        self,
        template_type: str,
        active_only: bool = True
    ) -> List[NotificationTemplateVariable]:
        """Get available variables for a template type"""
        conditions = [NotificationTemplateVariable.template_type == template_type]
        
        if active_only:
            conditions.append(NotificationTemplateVariable.is_active == True)

        query = select(NotificationTemplateVariable).where(and_(*conditions))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_template_history(
        self,
        template_id: int,
        limit: int = 20
    ) -> List[NotificationTemplateHistory]:
        """Get history records for a template"""
        query = select(NotificationTemplateHistory).options(
            joinedload(NotificationTemplateHistory.changed_by_user)
        ).where(
            NotificationTemplateHistory.template_id == template_id
        ).order_by(desc(NotificationTemplateHistory.changed_at)).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def bulk_activate_templates(self, template_ids: List[int], user_id: int) -> int:
        """Bulk activate templates"""
        query = update(NotificationTemplate).where(
            NotificationTemplate.id.in_(template_ids)
        ).values(is_active=True, updated_by=user_id)

        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount

    async def bulk_deactivate_templates(self, template_ids: List[int], user_id: int) -> int:
        """Bulk deactivate templates"""
        query = update(NotificationTemplate).where(
            NotificationTemplate.id.in_(template_ids)
        ).values(is_active=False, updated_by=user_id)

        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount

    async def can_user_edit_template(
        self,
        user_id: int,
        template: NotificationTemplate
    ) -> bool:
        """Check if user can edit a specific template"""
        return await self.permission_service.can_user_edit_template(user_id, template.id)

    # Private helper methods

    async def _unset_default_templates(
        self,
        scholarship_type_id: Optional[int],
        template_type: str,
        exclude_id: Optional[int] = None
    ):
        """Remove default flag from other templates of the same type"""
        conditions = [
            NotificationTemplate.scholarship_type_id == scholarship_type_id,
            NotificationTemplate.template_type == template_type,
            NotificationTemplate.is_default == True
        ]
        
        if exclude_id:
            conditions.append(NotificationTemplate.id != exclude_id)

        query = update(NotificationTemplate).where(
            and_(*conditions)
        ).values(is_default=False)

        await self.db.execute(query)

    async def _create_history_record(
        self,
        template_id: int,
        change_type: str,
        change_summary: str,
        changed_by: int,
        previous_content: Dict[str, Any]
    ):
        """Create a history record for template changes"""
        history = NotificationTemplateHistory(
            template_id=template_id,
            previous_content=previous_content,
            change_type=change_type,
            change_summary=change_summary,
            changed_by=changed_by
        )
        
        self.db.add(history)
        # Note: Don't commit here, let the calling method handle it