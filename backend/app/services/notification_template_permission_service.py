"""
Permission service for notification template management
"""

from typing import List, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.user import User, UserRole
from app.models.scholarship import ScholarshipType
from app.models.notification_template import NotificationTemplate


class NotificationTemplatePermissionService:
    """Service for managing notification template permissions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def can_user_create_template(
        self,
        user_id: int,
        scholarship_type_id: Optional[int] = None
    ) -> bool:
        """
        Check if user can create notification templates
        
        Args:
            user_id: User ID
            scholarship_type_id: Scholarship type ID (None for global templates)
            
        Returns:
            bool: True if user can create templates
        """
        user = await self._get_user(user_id)
        if not user:
            return False

        # Super admin can create all templates
        if user.role == UserRole.SUPER_ADMIN:
            return True

        # Admin can create templates for scholarships they manage
        if user.role == UserRole.ADMIN:
            if scholarship_type_id is None:
                # Allow admins to create global templates
                return True
            
            # Check if admin has permission for this scholarship type
            has_permission = await self._user_has_scholarship_permission(
                user_id, 
                scholarship_type_id
            )
            return has_permission

        # Other roles cannot create templates
        return False

    async def can_user_edit_template(
        self,
        user_id: int,
        template_id: int
    ) -> bool:
        """
        Check if user can edit a specific notification template
        
        Args:
            user_id: User ID
            template_id: Template ID
            
        Returns:
            bool: True if user can edit the template
        """
        user = await self._get_user(user_id)
        if not user:
            return False

        template = await self._get_template(template_id)
        if not template:
            return False

        # Super admin can edit all templates
        if user.role == UserRole.SUPER_ADMIN:
            return True

        # Admin can edit templates for scholarships they manage
        if user.role == UserRole.ADMIN:
            if template.scholarship_type_id is None:
                # Allow admins to edit global templates
                return True
            
            # Check if admin has permission for this scholarship type
            has_permission = await self._user_has_scholarship_permission(
                user_id, 
                template.scholarship_type_id
            )
            return has_permission

        # Other roles cannot edit templates
        return False

    async def can_user_delete_template(
        self,
        user_id: int,
        template_id: int
    ) -> bool:
        """
        Check if user can delete a specific notification template
        
        Args:
            user_id: User ID
            template_id: Template ID
            
        Returns:
            bool: True if user can delete the template
        """
        # Same permissions as editing for now
        return await self.can_user_edit_template(user_id, template_id)

    async def can_user_view_template(
        self,
        user_id: int,
        template_id: int
    ) -> bool:
        """
        Check if user can view a specific notification template
        
        Args:
            user_id: User ID
            template_id: Template ID
            
        Returns:
            bool: True if user can view the template
        """
        user = await self._get_user(user_id)
        if not user:
            return False

        template = await self._get_template(template_id)
        if not template:
            return False

        # Super admin can view all templates
        if user.role == UserRole.SUPER_ADMIN:
            return True

        # Admin and college users can view templates for scholarships they manage
        if user.role in [UserRole.ADMIN, UserRole.COLLEGE]:
            if template.scholarship_type_id is None:
                # Global templates are viewable by all admins/college users
                return True
            
            # Check if user has permission for this scholarship type
            has_permission = await self._user_has_scholarship_permission(
                user_id, 
                template.scholarship_type_id
            )
            return has_permission

        # Other roles cannot view templates
        return False

    async def get_user_accessible_scholarship_types(self, user_id: int) -> List[int]:
        """
        Get list of scholarship type IDs that the user can manage templates for
        
        Args:
            user_id: User ID
            
        Returns:
            List[int]: List of scholarship type IDs
        """
        user = await self._get_user(user_id)
        if not user:
            return []

        # Super admin can access all scholarship types
        if user.role == UserRole.SUPER_ADMIN:
            query = select(ScholarshipType.id).where(ScholarshipType.status == "active")
            result = await self.db.execute(query)
            return [row[0] for row in result.fetchall()]

        # Admin can access scholarship types they have permission for
        if user.role == UserRole.ADMIN:
            # For now, return all scholarship types for admins
            # In a more complex system, this would check specific permissions
            query = select(ScholarshipType.id).where(ScholarshipType.status == "active")
            result = await self.db.execute(query)
            return [row[0] for row in result.fetchall()]

        # College users can access scholarship types in their college/department
        if user.role == UserRole.COLLEGE:
            # This would need to be implemented based on your college/department structure
            # For now, return empty list
            return []

        # Other roles have no access
        return []

    async def filter_templates_by_permission(
        self,
        user_id: int,
        template_ids: List[int]
    ) -> List[int]:
        """
        Filter a list of template IDs to only include those the user can access
        
        Args:
            user_id: User ID
            template_ids: List of template IDs to check
            
        Returns:
            List[int]: Filtered list of template IDs the user can access
        """
        accessible_ids = []
        
        for template_id in template_ids:
            if await self.can_user_view_template(user_id, template_id):
                accessible_ids.append(template_id)
        
        return accessible_ids

    async def get_template_permission_summary(
        self,
        user_id: int,
        template_id: int
    ) -> dict:
        """
        Get a summary of user's permissions for a specific template
        
        Args:
            user_id: User ID
            template_id: Template ID
            
        Returns:
            dict: Permission summary
        """
        return {
            "can_view": await self.can_user_view_template(user_id, template_id),
            "can_edit": await self.can_user_edit_template(user_id, template_id),
            "can_delete": await self.can_user_delete_template(user_id, template_id),
            "template_id": template_id,
            "user_id": user_id
        }

    async def can_user_perform_bulk_operations(self, user_id: int) -> bool:
        """
        Check if user can perform bulk operations on templates
        
        Args:
            user_id: User ID
            
        Returns:
            bool: True if user can perform bulk operations
        """
        user = await self._get_user(user_id)
        if not user:
            return False

        # Only admins and super admins can perform bulk operations
        return user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]

    # Private helper methods

    async def _get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_template(self, template_id: int) -> Optional[NotificationTemplate]:
        """Get template by ID"""
        query = select(NotificationTemplate).where(NotificationTemplate.id == template_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _user_has_scholarship_permission(
        self,
        user_id: int,
        scholarship_type_id: int
    ) -> bool:
        """
        Check if user has permission to manage a specific scholarship type
        
        This is a placeholder implementation. In a real system, you would
        implement proper permission checking based on:
        - User's college/department assignment
        - Explicit scholarship permissions
        - Role-based access control
        
        Args:
            user_id: User ID
            scholarship_type_id: Scholarship type ID
            
        Returns:
            bool: True if user has permission
        """
        user = await self._get_user(user_id)
        if not user:
            return False

        # Super admin has all permissions
        if user.role == UserRole.SUPER_ADMIN:
            return True

        # For now, allow all admins to manage all scholarship types
        # In a real implementation, you would check:
        # 1. User's college/department vs scholarship's college/department
        # 2. Explicit permissions table
        # 3. Other business rules
        if user.role == UserRole.ADMIN:
            return True

        # College users would have permissions based on their college/department
        if user.role == UserRole.COLLEGE:
            # This would need to be implemented based on your system's structure
            # For example, checking if the scholarship belongs to user's college
            return False

        return False


class ScholarshipPermissionMixin:
    """
    Mixin to add scholarship permission checking to services
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.permission_service = NotificationTemplatePermissionService(self.db)

    async def check_template_permission(
        self,
        user_id: int,
        template_id: int,
        action: str = "view"
    ) -> bool:
        """
        Check template permission based on action
        
        Args:
            user_id: User ID
            template_id: Template ID
            action: Action type ("view", "edit", "delete", "create")
            
        Returns:
            bool: True if user has permission
        """
        if action == "view":
            return await self.permission_service.can_user_view_template(user_id, template_id)
        elif action == "edit":
            return await self.permission_service.can_user_edit_template(user_id, template_id)
        elif action == "delete":
            return await self.permission_service.can_user_delete_template(user_id, template_id)
        else:
            return False

    async def get_user_scholarship_permissions(self, user_id: int) -> List[int]:
        """Get scholarship types the user can manage"""
        return await self.permission_service.get_user_accessible_scholarship_types(user_id)