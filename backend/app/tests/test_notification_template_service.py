"""
Tests for notification template service
"""

import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, MagicMock

from app.services.notification_template_service import NotificationTemplateService
from app.services.notification_template_permission_service import NotificationTemplatePermissionService
from app.models.notification_template import (
    NotificationTemplate, 
    NotificationTemplateType, 
    NotificationTemplateVariable,
    NotificationTemplateHistory
)
from app.models.user import User, UserRole
from app.models.scholarship import ScholarshipType
from app.schemas.notification_template import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    NotificationTemplateSearch,
    NotificationTemplatePreview
)


class TestNotificationTemplateService:
    """Test cases for NotificationTemplateService"""

    @pytest.fixture
    async def db_session(self):
        """Mock database session"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    async def template_service(self, db_session):
        """Create template service instance"""
        return NotificationTemplateService(db_session)

    @pytest.fixture
    def sample_template_data(self):
        """Sample template creation data"""
        return NotificationTemplateCreate(
            scholarship_type_id=1,
            template_type=NotificationTemplateType.APPLICATION.value,
            template_key="application_status_v1",
            name="申請狀態更新通知",
            name_en="Application Status Update Notification",
            subject_template="您的{scholarship_name}申請狀態已更新",
            subject_template_en="Your {scholarship_name} application status has been updated",
            body_template="親愛的{student_name}，您的{scholarship_name}申請狀態已更新為：{application_status}",
            body_template_en="Dear {student_name}, your {scholarship_name} application status has been updated to: {application_status}",
            cc_emails=["admin@example.com"],
            bcc_emails=[],
            is_active=True,
            is_default=True,
            description="用於通知學生申請狀態變更"
        )

    @pytest.fixture
    def sample_template(self):
        """Sample notification template"""
        template = NotificationTemplate(
            id=1,
            scholarship_type_id=1,
            template_type=NotificationTemplateType.APPLICATION.value,
            template_key="application_status_v1",
            name="申請狀態更新通知",
            subject_template="您的{scholarship_name}申請狀態已更新",
            body_template="親愛的{student_name}，您的{scholarship_name}申請狀態已更新為：{application_status}",
            is_active=True,
            is_default=True,
            created_by=1,
            updated_by=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        return template

    @pytest.mark.asyncio
    async def test_create_template_success(self, template_service, sample_template_data, db_session):
        """Test successful template creation"""
        # Mock database operations
        db_session.execute.return_value.scalar_one_or_none.return_value = None  # No existing template
        db_session.commit = AsyncMock()
        db_session.refresh = AsyncMock()
        
        # Mock the created template
        created_template = NotificationTemplate(**sample_template_data.dict(), id=1, created_by=1, updated_by=1)
        db_session.add = MagicMock()
        
        result = await template_service.create_template(sample_template_data, user_id=1)
        
        # Verify database operations
        db_session.add.assert_called_once()
        db_session.commit.assert_called_once()
        db_session.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_template_duplicate_key(self, template_service, sample_template_data, db_session):
        """Test template creation with duplicate key"""
        # Mock existing template
        existing_template = NotificationTemplate(id=1, template_key="application_status_v1")
        db_session.execute.return_value.scalar_one_or_none.return_value = existing_template
        
        # Should raise HTTPException
        with pytest.raises(Exception):  # HTTPException from service
            await template_service.create_template(sample_template_data, user_id=1)

    @pytest.mark.asyncio
    async def test_get_template(self, template_service, sample_template, db_session):
        """Test getting a template by ID"""
        db_session.execute.return_value.scalar_one_or_none.return_value = sample_template
        
        result = await template_service.get_template(1)
        
        assert result == sample_template
        db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_template(self, template_service, sample_template, db_session):
        """Test updating a template"""
        # Mock get_template
        db_session.execute.return_value.scalar_one_or_none.return_value = sample_template
        db_session.commit = AsyncMock()
        db_session.refresh = AsyncMock()
        
        update_data = NotificationTemplateUpdate(
            name="Updated Template Name",
            is_active=False
        )
        
        result = await template_service.update_template(1, update_data, user_id=1)
        
        assert result == sample_template
        assert sample_template.name == "Updated Template Name"
        assert sample_template.is_active == False
        db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_template(self, template_service, sample_template, db_session):
        """Test deleting a template"""
        db_session.execute.return_value.scalar_one_or_none.return_value = sample_template
        db_session.delete = AsyncMock()
        db_session.commit = AsyncMock()
        
        result = await template_service.delete_template(1, user_id=1)
        
        assert result == True
        db_session.delete.assert_called_once_with(sample_template)
        db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_templates(self, template_service, db_session):
        """Test searching templates with filters"""
        search_params = NotificationTemplateSearch(
            template_type=NotificationTemplateType.APPLICATION.value,
            search_term="application",
            is_active=True,
            skip=0,
            limit=10
        )
        
        # Mock templates result
        mock_templates = [
            MagicMock(
                id=1, 
                name="Test Template",
                scholarship_type=MagicMock(name="Test Scholarship", code="TEST")
            )
        ]
        
        # Mock database queries
        db_session.execute.return_value.scalars.return_value.all.return_value = mock_templates
        db_session.execute.return_value.scalar.return_value = 1  # Total count
        
        templates, total = await template_service.search_templates(search_params)
        
        assert len(templates) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_default_template(self, template_service, sample_template, db_session):
        """Test getting default template"""
        db_session.execute.return_value.scalar_one_or_none.return_value = sample_template
        
        result = await template_service.get_default_template(
            scholarship_type_id=1,
            template_type=NotificationTemplateType.APPLICATION.value
        )
        
        assert result == sample_template

    @pytest.mark.asyncio
    async def test_preview_template(self, template_service, sample_template, db_session):
        """Test template preview functionality"""
        # Mock template retrieval
        db_session.execute.return_value.scalar_one_or_none.return_value = sample_template
        
        # Mock variables
        mock_variables = [
            MagicMock(variable_name="student_name"),
            MagicMock(variable_name="scholarship_name"),
            MagicMock(variable_name="application_status")
        ]
        template_service.get_template_variables = AsyncMock(return_value=mock_variables)
        
        preview_data = NotificationTemplatePreview(
            template_id=1,
            context_data={
                "student_name": "王小明",
                "scholarship_name": "測試獎學金",
                "application_status": "審核中"
            },
            language="zh"
        )
        
        result = await template_service.preview_template(preview_data)
        
        assert "王小明" in result.subject
        assert "測試獎學金" in result.subject
        assert "審核中" in result.body

    @pytest.mark.asyncio
    async def test_duplicate_template(self, template_service, sample_template, db_session):
        """Test template duplication"""
        # Mock get_template
        db_session.execute.return_value.scalar_one_or_none.return_value = sample_template
        
        # Mock create_template
        template_service.create_template = AsyncMock(return_value=sample_template)
        
        result = await template_service.duplicate_template(
            template_id=1,
            new_name="Duplicated Template",
            new_scholarship_type_id=2,
            created_by=1
        )
        
        assert result == sample_template
        template_service.create_template.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_activate_templates(self, template_service, db_session):
        """Test bulk template activation"""
        db_session.execute.return_value.rowcount = 3
        db_session.commit = AsyncMock()
        
        result = await template_service.bulk_activate_templates([1, 2, 3], user_id=1)
        
        assert result == 3
        db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_deactivate_templates(self, template_service, db_session):
        """Test bulk template deactivation"""
        db_session.execute.return_value.rowcount = 2
        db_session.commit = AsyncMock()
        
        result = await template_service.bulk_deactivate_templates([1, 2], user_id=1)
        
        assert result == 2
        db_session.commit.assert_called_once()


class TestNotificationTemplatePermissionService:
    """Test cases for NotificationTemplatePermissionService"""

    @pytest.fixture
    async def db_session(self):
        """Mock database session"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    async def permission_service(self, db_session):
        """Create permission service instance"""
        return NotificationTemplatePermissionService(db_session)

    @pytest.fixture
    def super_admin_user(self):
        """Mock super admin user"""
        return User(
            id=1,
            email="superadmin@example.com",
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )

    @pytest.fixture
    def admin_user(self):
        """Mock admin user"""
        return User(
            id=2,
            email="admin@example.com",
            role=UserRole.ADMIN,
            is_active=True
        )

    @pytest.fixture
    def student_user(self):
        """Mock student user"""
        return User(
            id=3,
            email="student@example.com",
            role=UserRole.STUDENT,
            is_active=True
        )

    @pytest.mark.asyncio
    async def test_super_admin_can_create_template(
        self, 
        permission_service, 
        super_admin_user, 
        db_session
    ):
        """Test super admin can create templates"""
        db_session.execute.return_value.scalar_one_or_none.return_value = super_admin_user
        
        result = await permission_service.can_user_create_template(
            user_id=1,
            scholarship_type_id=1
        )
        
        assert result == True

    @pytest.mark.asyncio
    async def test_admin_can_create_template(
        self, 
        permission_service, 
        admin_user, 
        db_session
    ):
        """Test admin can create templates"""
        db_session.execute.return_value.scalar_one_or_none.return_value = admin_user
        
        result = await permission_service.can_user_create_template(
            user_id=2,
            scholarship_type_id=1
        )
        
        assert result == True

    @pytest.mark.asyncio
    async def test_student_cannot_create_template(
        self, 
        permission_service, 
        student_user, 
        db_session
    ):
        """Test student cannot create templates"""
        db_session.execute.return_value.scalar_one_or_none.return_value = student_user
        
        result = await permission_service.can_user_create_template(
            user_id=3,
            scholarship_type_id=1
        )
        
        assert result == False

    @pytest.mark.asyncio
    async def test_super_admin_can_edit_any_template(
        self, 
        permission_service, 
        super_admin_user, 
        db_session
    ):
        """Test super admin can edit any template"""
        # Mock user retrieval
        user_result = AsyncMock()
        user_result.scalar_one_or_none.return_value = super_admin_user
        
        # Mock template retrieval
        template_result = AsyncMock()
        template_result.scalar_one_or_none.return_value = NotificationTemplate(
            id=1, scholarship_type_id=1
        )
        
        db_session.execute.side_effect = [user_result, template_result]
        
        result = await permission_service.can_user_edit_template(
            user_id=1,
            template_id=1
        )
        
        assert result == True

    @pytest.mark.asyncio
    async def test_get_user_accessible_scholarship_types_super_admin(
        self,
        permission_service,
        super_admin_user,
        db_session
    ):
        """Test super admin can access all scholarship types"""
        # Mock user retrieval
        user_result = AsyncMock()
        user_result.scalar_one_or_none.return_value = super_admin_user
        
        # Mock scholarship types
        scholarship_result = AsyncMock()
        scholarship_result.fetchall.return_value = [(1,), (2,), (3,)]
        
        db_session.execute.side_effect = [user_result, scholarship_result]
        
        result = await permission_service.get_user_accessible_scholarship_types(1)
        
        assert result == [1, 2, 3]

    @pytest.mark.asyncio
    async def test_filter_templates_by_permission(
        self,
        permission_service,
        db_session
    ):
        """Test filtering templates by user permissions"""
        # Mock permission checks
        permission_service.can_user_view_template = AsyncMock(side_effect=[True, False, True])
        
        result = await permission_service.filter_templates_by_permission(
            user_id=1,
            template_ids=[1, 2, 3]
        )
        
        assert result == [1, 3]

    @pytest.mark.asyncio
    async def test_get_template_permission_summary(
        self,
        permission_service,
        db_session
    ):
        """Test getting permission summary for a template"""
        # Mock permission methods
        permission_service.can_user_view_template = AsyncMock(return_value=True)
        permission_service.can_user_edit_template = AsyncMock(return_value=True)
        permission_service.can_user_delete_template = AsyncMock(return_value=False)
        
        result = await permission_service.get_template_permission_summary(
            user_id=1,
            template_id=1
        )
        
        expected = {
            "can_view": True,
            "can_edit": True, 
            "can_delete": False,
            "template_id": 1,
            "user_id": 1
        }
        
        assert result == expected


if __name__ == "__main__":
    pytest.main([__file__])