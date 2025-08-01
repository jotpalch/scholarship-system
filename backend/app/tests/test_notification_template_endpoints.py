"""
Tests for notification template API endpoints
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import json

from app.models.notification_template import NotificationTemplate, NotificationTemplateType
from app.models.user import User, UserRole


class TestNotificationTemplateEndpoints:
    """Test cases for notification template API endpoints"""

    @pytest.fixture
    def sample_template_data(self):
        """Sample template data for requests"""
        return {
            "scholarship_type_id": 1,
            "template_type": "application",
            "template_key": "application_status_v1", 
            "name": "申請狀態更新通知",
            "name_en": "Application Status Update Notification",
            "subject_template": "您的{scholarship_name}申請狀態已更新",
            "subject_template_en": "Your {scholarship_name} application status has been updated",
            "body_template": "親愛的{student_name}，您的{scholarship_name}申請狀態已更新為：{application_status}",
            "body_template_en": "Dear {student_name}, your {scholarship_name} application status has been updated to: {application_status}",
            "cc_emails": ["admin@example.com"],
            "bcc_emails": [],
            "is_active": True,
            "is_default": True,
            "description": "用於通知學生申請狀態變更"
        }

    @pytest.fixture
    def sample_template_response(self):
        """Sample template response data"""
        return {
            "id": 1,
            "scholarship_type_id": 1,
            "template_type": "application",
            "template_key": "application_status_v1",
            "name": "申請狀態更新通知",
            "name_en": "Application Status Update Notification",
            "subject_template": "您的{scholarship_name}申請狀態已更新",
            "subject_template_en": "Your {scholarship_name} application status has been updated",
            "body_template": "親愛的{student_name}，您的{scholarship_name}申請狀態已更新為：{application_status}",
            "body_template_en": "Dear {student_name}, your {scholarship_name} application status has been updated to: {application_status}",
            "cc_emails": ["admin@example.com"],
            "bcc_emails": [],
            "is_active": True,
            "is_default": True,
            "created_at": "2024-01-01T10:00:00Z",
            "updated_at": "2024-01-01T10:00:00Z",
            "created_by": 1,
            "updated_by": 1
        }

    @pytest.fixture
    def admin_user(self):
        """Mock admin user"""
        return User(
            id=1,
            email="admin@example.com",
            role=UserRole.ADMIN,
            is_active=True
        )

    @pytest.fixture
    def student_user(self):
        """Mock student user"""
        return User(
            id=2,
            email="student@example.com",
            role=UserRole.STUDENT,
            is_active=True
        )

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_create_template_success(
        self, 
        mock_get_user,
        mock_service,
        client: TestClient,
        sample_template_data,
        sample_template_response,
        admin_user
    ):
        """Test successful template creation"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_service_instance.create_template.return_value = NotificationTemplate(**sample_template_response)
        mock_service.return_value = mock_service_instance
        
        response = client.post(
            "/api/v1/notification-templates/",
            json=sample_template_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_template_data["name"]
        assert data["template_type"] == sample_template_data["template_type"]

    @patch('app.core.deps.get_current_user')
    def test_create_template_unauthorized(
        self, 
        mock_get_user,
        client: TestClient,
        sample_template_data,
        student_user
    ):
        """Test template creation by unauthorized user"""
        # Mock authentication with student user
        mock_get_user.return_value = student_user
        
        response = client.post(
            "/api/v1/notification-templates/",
            json=sample_template_data
        )
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_list_templates(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        admin_user
    ):
        """Test listing templates"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_service_instance.search_templates.return_value = ([], 0)
        mock_service.return_value = mock_service_instance
        
        response = client.get("/api/v1/notification-templates/")
        
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert "total" in data

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_get_template(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        sample_template_response,
        admin_user
    ):
        """Test getting a specific template"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_template_with_scholarship.return_value = sample_template_response
        mock_service.return_value = mock_service_instance
        
        response = client.get("/api/v1/notification-templates/1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == sample_template_response["name"]

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_get_template_not_found(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        admin_user
    ):
        """Test getting a non-existent template"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_template_with_scholarship.return_value = None
        mock_service.return_value = mock_service_instance
        
        response = client.get("/api/v1/notification-templates/999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_update_template(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        sample_template_response,
        admin_user
    ):
        """Test updating a template"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_template = NotificationTemplate(**sample_template_response)
        mock_service_instance.get_template.return_value = mock_template
        mock_service_instance.can_user_edit_template.return_value = True
        mock_service_instance.update_template.return_value = mock_template
        mock_service.return_value = mock_service_instance
        
        update_data = {"name": "Updated Template Name"}
        
        response = client.put(
            "/api/v1/notification-templates/1",
            json=update_data
        )
        
        assert response.status_code == 200

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_delete_template(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        sample_template_response,
        admin_user
    ):
        """Test deleting a template"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_template = NotificationTemplate(**sample_template_response)
        mock_service_instance.get_template.return_value = mock_template
        mock_service_instance.can_user_edit_template.return_value = True
        mock_service_instance.delete_template.return_value = True
        mock_service.return_value = mock_service_instance
        
        response = client.delete("/api/v1/notification-templates/1")
        
        assert response.status_code == 204

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_preview_template(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        admin_user
    ):
        """Test template preview"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        from app.schemas.notification_template import NotificationTemplatePreviewResponse
        mock_preview_response = NotificationTemplatePreviewResponse(
            subject="預覽主旨",
            body="預覽內容",
            missing_variables=[],
            invalid_variables=[]
        )
        mock_service_instance.preview_template.return_value = mock_preview_response
        mock_service.return_value = mock_service_instance
        
        preview_data = {
            "template_id": 1,
            "context_data": {
                "student_name": "王小明",
                "scholarship_name": "測試獎學金"
            },
            "language": "zh"
        }
        
        response = client.post(
            "/api/v1/notification-templates/preview",
            json=preview_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["subject"] == "預覽主旨"
        assert data["body"] == "預覽內容"

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_duplicate_template(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        sample_template_response,
        admin_user
    ):
        """Test template duplication"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_template = NotificationTemplate(**sample_template_response)
        mock_service_instance.duplicate_template.return_value = mock_template
        mock_service.return_value = mock_service_instance
        
        response = client.post(
            "/api/v1/notification-templates/1/duplicate?new_name=Duplicated Template"
        )
        
        assert response.status_code == 200

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_bulk_operations(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        admin_user
    ):
        """Test bulk operations on templates"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_service_instance.bulk_activate_templates.return_value = 2
        mock_service.return_value = mock_service_instance
        
        bulk_data = {
            "template_ids": [1, 2],
            "operation": "activate"
        }
        
        response = client.post(
            "/api/v1/notification-templates/bulk",
            json=bulk_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "Activated 2 templates" in data["message"]

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_get_templates_for_scholarship(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        admin_user
    ):
        """Test getting templates for a specific scholarship"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_templates_for_scholarship.return_value = []
        mock_service.return_value = mock_service_instance
        
        response = client.get("/api/v1/notification-templates/scholarship/1")
        
        assert response.status_code == 200

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_get_default_template(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        sample_template_response,
        admin_user
    ):
        """Test getting default template"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_template = NotificationTemplate(**sample_template_response)
        mock_service_instance.get_default_template.return_value = mock_template
        mock_service.return_value = mock_service_instance
        
        response = client.get("/api/v1/notification-templates/default/application?scholarship_type_id=1")
        
        assert response.status_code == 200

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_get_template_variables(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        admin_user
    ):
        """Test getting template variables"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_template_variables.return_value = []
        mock_service.return_value = mock_service_instance
        
        response = client.get("/api/v1/notification-templates/variables/application")
        
        assert response.status_code == 200

    @patch('app.services.notification_template_service.NotificationTemplateService')
    @patch('app.core.deps.get_current_user')
    def test_get_template_history(
        self,
        mock_get_user,
        mock_service,
        client: TestClient,
        sample_template_response,
        admin_user
    ):
        """Test getting template history"""
        # Mock authentication
        mock_get_user.return_value = admin_user
        
        # Mock service
        mock_service_instance = AsyncMock()
        mock_template = NotificationTemplate(**sample_template_response)
        mock_service_instance.get_template.return_value = mock_template
        mock_service_instance.get_template_history.return_value = []
        mock_service.return_value = mock_service_instance
        
        response = client.get("/api/v1/notification-templates/1/history")
        
        assert response.status_code == 200

    def test_create_template_validation_error(self, client: TestClient):
        """Test template creation with validation errors"""
        # Missing required fields
        invalid_data = {
            "template_type": "application"
            # Missing required fields like name, template_key, etc.
        }
        
        response = client.post(
            "/api/v1/notification-templates/",
            json=invalid_data
        )
        
        assert response.status_code == 422  # Validation error

    def test_invalid_template_type(self, client: TestClient):
        """Test creating template with invalid template type"""
        invalid_data = {
            "template_type": "invalid_type",
            "template_key": "test",
            "name": "Test Template",
            "subject_template": "Test Subject",
            "body_template": "Test Body"
        }
        
        response = client.post(
            "/api/v1/notification-templates/",
            json=invalid_data
        )
        
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__])