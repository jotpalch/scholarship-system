"""
Tests for notification template variable service
"""

import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, MagicMock

from app.services.notification_template_variable_service import NotificationTemplateVariableService
from app.models.notification_template import (
    NotificationTemplate, 
    NotificationTemplateType, 
    NotificationTemplateVariable
)
from app.models.application import Application
from app.models.student import Student
from app.models.scholarship import ScholarshipType


class TestNotificationTemplateVariableService:
    """Test cases for NotificationTemplateVariableService"""

    @pytest.fixture
    async def db_session(self):
        """Mock database session"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    async def variable_service(self, db_session):
        """Create variable service instance"""
        return NotificationTemplateVariableService(db_session)

    @pytest.fixture
    def sample_template(self):
        """Sample notification template"""
        return NotificationTemplate(
            id=1,
            scholarship_type_id=1,
            template_type=NotificationTemplateType.APPLICATION.value,
            template_key="application_status_v1",
            name="申請狀態更新通知",
            subject_template="您的{scholarship_name}申請狀態已更新",
            body_template="親愛的{student_name}，您的{scholarship_name}申請狀態已更新為：{application_status}",
            is_active=True,
            is_default=True
        )

    @pytest.fixture
    def sample_variables(self):
        """Sample template variables"""
        return [
            NotificationTemplateVariable(
                id=1,
                template_type=NotificationTemplateType.APPLICATION.value,
                variable_name="student_name",
                variable_key="{student_name}",
                display_name="學生姓名",
                data_type="string",
                is_required=True,
                is_active=True
            ),
            NotificationTemplateVariable(
                id=2,
                template_type=NotificationTemplateType.APPLICATION.value,
                variable_name="scholarship_name",
                variable_key="{scholarship_name}",
                display_name="獎學金名稱",
                data_type="string",
                is_required=True,
                is_active=True
            ),
            NotificationTemplateVariable(
                id=3,
                template_type=NotificationTemplateType.APPLICATION.value,
                variable_name="application_status",
                variable_key="{application_status}",
                display_name="申請狀態",
                data_type="string",
                is_required=False,
                is_active=True
            )
        ]

    @pytest.fixture
    def sample_application(self):
        """Sample application"""
        return Application(
            id=1,
            student_id=1,
            scholarship_type_id=1,
            status="under_review",
            submitted_at=datetime(2024, 1, 15)
        )

    @pytest.fixture
    def sample_student(self):
        """Sample student"""
        return Student(
            id=1,
            student_id="110001001",
            full_name="王小明"
        )

    @pytest.fixture
    def sample_scholarship(self):
        """Sample scholarship type"""
        return ScholarshipType(
            id=1,
            code="TEST_SCHOLARSHIP",
            name="測試獎學金",
            amount=50000,
            review_deadline=datetime(2024, 3, 31)
        )

    @pytest.mark.asyncio
    async def test_get_variables_for_template_type(
        self, 
        variable_service, 
        sample_variables, 
        db_session
    ):
        """Test getting variables for a template type"""
        db_session.execute.return_value.scalars.return_value.all.return_value = sample_variables
        
        result = await variable_service.get_variables_for_template_type(
            NotificationTemplateType.APPLICATION.value
        )
        
        assert len(result) == 3
        assert result == sample_variables

    @pytest.mark.asyncio
    async def test_render_template_success(
        self, 
        variable_service, 
        sample_template, 
        sample_variables,
        db_session
    ):
        """Test successful template rendering"""
        # Mock variables retrieval
        variable_service.get_variables_for_template_type = AsyncMock(
            return_value=sample_variables
        )
        
        context_data = {
            "student_name": "王小明",
            "scholarship_name": "測試獎學金",
            "application_status": "審核中"
        }
        
        subject, body, missing_vars, invalid_vars = await variable_service.render_template(
            template=sample_template,
            context_data=context_data,
            language="zh"
        )
        
        assert subject == "您的測試獎學金申請狀態已更新"
        assert "王小明" in body
        assert "測試獎學金" in body
        assert "審核中" in body
        assert len(missing_vars) == 0
        assert len(invalid_vars) == 0

    @pytest.mark.asyncio
    async def test_render_template_missing_variables(
        self, 
        variable_service, 
        sample_template, 
        sample_variables,
        db_session
    ):
        """Test template rendering with missing variables"""
        variable_service.get_variables_for_template_type = AsyncMock(
            return_value=sample_variables
        )
        
        # Missing student_name
        context_data = {
            "scholarship_name": "測試獎學金",
            "application_status": "審核中"
        }
        
        subject, body, missing_vars, invalid_vars = await variable_service.render_template(
            template=sample_template,
            context_data=context_data,
            language="zh"
        )
        
        assert "student_name" in missing_vars
        assert len(invalid_vars) == 0

    @pytest.mark.asyncio
    async def test_render_template_invalid_variables(
        self, 
        variable_service, 
        sample_template, 
        sample_variables,
        db_session
    ):
        """Test template rendering with invalid variables"""
        # Create template with invalid variable
        template_with_invalid_var = NotificationTemplate(
            id=1,
            template_type=NotificationTemplateType.APPLICATION.value,
            subject_template="測試 {invalid_variable}",
            body_template="內容 {invalid_variable}"
        )
        
        variable_service.get_variables_for_template_type = AsyncMock(
            return_value=sample_variables
        )
        
        context_data = {
            "invalid_variable": "測試值"
        }
        
        subject, body, missing_vars, invalid_vars = await variable_service.render_template(
            template=template_with_invalid_var,
            context_data=context_data,
            language="zh"
        )
        
        assert "invalid_variable" in invalid_vars

    @pytest.mark.asyncio
    async def test_build_context_for_application(
        self, 
        variable_service, 
        sample_application,
        sample_student,
        sample_scholarship,
        db_session
    ):
        """Test building context for application"""
        # Mock database queries
        app_result = AsyncMock()
        app_result.scalar_one_or_none.return_value = sample_application
        
        student_result = AsyncMock()
        student_result.scalar_one_or_none.return_value = sample_student
        
        scholarship_result = AsyncMock()
        scholarship_result.scalar_one_or_none.return_value = sample_scholarship
        
        db_session.execute.side_effect = [app_result, student_result, scholarship_result]
        
        context = await variable_service.build_context_for_application(
            application_id=1,
            template_type=NotificationTemplateType.APPLICATION.value
        )
        
        assert context["student_name"] == "王小明"
        assert context["student_id"] == "110001001"
        assert context["scholarship_name"] == "測試獎學金"
        assert context["application_id"] == "1"
        assert context["submission_date"] == "2024/01/15"

    @pytest.mark.asyncio
    async def test_build_context_for_scholarship(
        self, 
        variable_service, 
        sample_scholarship,
        db_session
    ):
        """Test building context for scholarship"""
        # Mock database query
        scholarship_result = AsyncMock()
        scholarship_result.scalar_one_or_none.return_value = sample_scholarship
        
        db_session.execute.return_value = scholarship_result
        
        context = await variable_service.build_context_for_scholarship(
            scholarship_type_id=1,
            template_type=NotificationTemplateType.WHITELIST.value
        )
        
        assert context["scholarship_name"] == "測試獎學金"

    @pytest.mark.asyncio
    async def test_validate_template_variables(
        self, 
        variable_service, 
        sample_template,
        sample_variables,
        db_session
    ):
        """Test template variable validation"""
        variable_service.get_variables_for_template_type = AsyncMock(
            return_value=sample_variables
        )
        
        # Missing required variable
        context_data = {
            "scholarship_name": "測試獎學金",
            "application_status": "審核中"
            # Missing student_name (required)
        }
        
        validation_result = await variable_service.validate_template_variables(
            template=sample_template,
            context_data=context_data
        )
        
        assert validation_result["is_valid"] == False
        assert "student_name" in validation_result["missing_required_variables"]
        assert "student_name" in validation_result["missing_used_variables"]

    @pytest.mark.asyncio
    async def test_validate_template_variables_success(
        self, 
        variable_service, 
        sample_template,
        sample_variables,
        db_session
    ):
        """Test successful template variable validation"""
        variable_service.get_variables_for_template_type = AsyncMock(
            return_value=sample_variables
        )
        
        # All required variables present
        context_data = {
            "student_name": "王小明",
            "scholarship_name": "測試獎學金",
            "application_status": "審核中"
        }
        
        validation_result = await variable_service.validate_template_variables(
            template=sample_template,
            context_data=context_data
        )
        
        assert validation_result["is_valid"] == True
        assert len(validation_result["missing_required_variables"]) == 0

    def test_safe_format(self, variable_service):
        """Test safe formatting of template strings"""
        template = "Hello {name}, your {status} is {unknown_var}"
        context = {
            "name": "John",
            "status": "active"
        }
        
        result = variable_service._safe_format(template, context)
        
        assert result == "Hello John, your active is {unknown_var}"

    @pytest.mark.asyncio
    async def test_get_template_variable_suggestions(
        self, 
        variable_service, 
        sample_variables,
        db_session
    ):
        """Test getting variable suggestions"""
        variable_service.get_variables_for_template_type = AsyncMock(
            return_value=sample_variables
        )
        
        suggestions = await variable_service.get_template_variable_suggestions(
            template_type=NotificationTemplateType.APPLICATION.value,
            partial_name="student"
        )
        
        # Should return variables that contain "student" in name
        assert len(suggestions) == 1
        assert suggestions[0]["variable_name"] == "student_name"

    @pytest.mark.asyncio
    async def test_get_template_variable_suggestions_all(
        self, 
        variable_service, 
        sample_variables,
        db_session
    ):
        """Test getting all variable suggestions"""
        variable_service.get_variables_for_template_type = AsyncMock(
            return_value=sample_variables
        )
        
        suggestions = await variable_service.get_template_variable_suggestions(
            template_type=NotificationTemplateType.APPLICATION.value,
            partial_name=""
        )
        
        # Should return all variables
        assert len(suggestions) == 3

    @pytest.mark.asyncio
    async def test_build_context_application_not_found(
        self, 
        variable_service,
        db_session
    ):
        """Test building context when application not found"""
        # Mock database query returning None
        app_result = AsyncMock()
        app_result.scalar_one_or_none.return_value = None
        
        db_session.execute.return_value = app_result
        
        context = await variable_service.build_context_for_application(
            application_id=999,
            template_type=NotificationTemplateType.APPLICATION.value
        )
        
        assert context == {}

    @pytest.mark.asyncio
    async def test_build_context_scholarship_not_found(
        self, 
        variable_service,
        db_session
    ):
        """Test building context when scholarship not found"""
        # Mock database query returning None
        scholarship_result = AsyncMock()
        scholarship_result.scalar_one_or_none.return_value = None
        
        db_session.execute.return_value = scholarship_result
        
        context = await variable_service.build_context_for_scholarship(
            scholarship_type_id=999,
            template_type=NotificationTemplateType.WHITELIST.value
        )
        
        assert context == {}


if __name__ == "__main__":
    pytest.main([__file__])