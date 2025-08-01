# Notification Template Management System

This document describes the implementation of the flexible notification template management system for scholarship applications, addressing GitHub Issue #52.

## Overview

The notification template management system allows for independent email templates for each scholarship category with role-based permissions and dynamic variable substitution.

## Features Implemented

### 1. Independent Email Templates
- Each scholarship category can have its own unique email templates
- Support for global templates that apply to all scholarships
- Multiple template types for different notification scenarios

### 2. User Permissions
- **Super Admin**: Can edit all notification templates
- **Admin**: Can edit templates for scholarships they have permission for
- **Other roles**: Read-only access or no access based on permissions

### 3. Dynamic Variables
- Email templates support placeholders that get filled with actual data
- Different notification types have specific available variables
- Variable validation and preview functionality

### 4. Template Types Supported
- **Whitelist**: Notifications for whitelist eligibility
- **Application**: Application status updates
- **Recommendation**: Professor recommendation requests
- **Review**: Review assignment notifications
- **Supplementary Document**: Document requirement notifications
- **Result**: Final application results
- **Roster Creation**: Roster creation notifications

## Database Schema

### Core Tables

#### `notification_templates`
- Primary template storage
- Links to scholarship types (nullable for global templates)
- Bilingual support (Chinese/English)
- Audit trail with created_by/updated_by

#### `notification_template_variables`
- Dynamic variable definitions
- Template type specific variables
- Validation rules and metadata

#### `notification_template_history`
- Change tracking for templates
- Audit log for all modifications

## API Endpoints

### Template Management
- `POST /api/v1/notification-templates/` - Create template
- `GET /api/v1/notification-templates/` - List templates with filtering
- `GET /api/v1/notification-templates/{id}` - Get specific template
- `PUT /api/v1/notification-templates/{id}` - Update template
- `DELETE /api/v1/notification-templates/{id}` - Delete template

### Template Operations
- `POST /api/v1/notification-templates/preview` - Preview template with data
- `POST /api/v1/notification-templates/{id}/duplicate` - Duplicate template
- `POST /api/v1/notification-templates/bulk` - Bulk operations

### Template Discovery
- `GET /api/v1/notification-templates/scholarship/{id}` - Get templates for scholarship
- `GET /api/v1/notification-templates/default/{type}` - Get default template
- `GET /api/v1/notification-templates/variables/{type}` - Get available variables
- `GET /api/v1/notification-templates/{id}/history` - Get change history

## Services Architecture

### NotificationTemplateService
- Core CRUD operations for templates
- Template search and filtering
- Default template resolution
- Bulk operations

### NotificationTemplatePermissionService
- Role-based access control
- Permission checking for create/read/update/delete
- User accessible scholarship types

### NotificationTemplateVariableService
- Template rendering with variable substitution
- Context building for different notification types
- Variable validation and suggestions

### Enhanced NotificationService
- Integration with template system
- Template-based notification creation
- Fallback to basic notifications when templates unavailable

## Frontend Interface

### NotificationTemplateManagement Component
- Full CRUD interface for templates
- Template preview functionality
- Variable insertion helpers
- Bulk operations support
- Search and filtering

### Admin Page Integration
- Accessible at `/admin/notification-templates`
- Role-based access control
- Responsive design with Tailwind CSS

## Variable System

### Available Variables by Template Type

#### Whitelist Notifications
- `{student_name}` - Student name
- `{student_id}` - Student ID
- `{scholarship_name}` - Scholarship name
- `{application_period_start}` - Application start date
- `{application_period_end}` - Application end date
- `{whitelist_deadline}` - Whitelist deadline

#### Application Notifications
- `{student_name}` - Student name
- `{student_id}` - Student ID
- `{application_id}` - Application ID
- `{scholarship_name}` - Scholarship name
- `{submission_date}` - Submission date
- `{application_status}` - Current status

#### Recommendation Notifications
- `{professor_name}` - Professor name
- `{student_name}` - Student name
- `{student_id}` - Student ID
- `{application_id}` - Application ID
- `{scholarship_name}` - Scholarship name
- `{recommendation_deadline}` - Recommendation deadline

#### Review Notifications
- `{reviewer_name}` - Reviewer name
- `{student_name}` - Student name
- `{student_id}` - Student ID
- `{application_id}` - Application ID
- `{scholarship_name}` - Scholarship name
- `{review_deadline}` - Review deadline
- `{review_stage}` - Current review stage

#### Supplementary Document Notifications
- `{student_name}` - Student name
- `{student_id}` - Student ID
- `{application_id}` - Application ID
- `{scholarship_name}` - Scholarship name
- `{required_documents}` - List of required documents
- `{document_deadline}` - Document submission deadline

#### Result Notifications
- `{student_name}` - Student name
- `{student_id}` - Student ID
- `{application_id}` - Application ID
- `{scholarship_name}` - Scholarship name
- `{result}` - Application result
- `{award_amount}` - Award amount
- `{announcement_date}` - Announcement date

#### Roster Creation Notifications
- `{admin_name}` - Admin name
- `{scholarship_name}` - Scholarship name
- `{roster_count}` - Number of recipients
- `{creation_date}` - Roster creation date
- `{academic_year}` - Academic year
- `{semester}` - Semester

## Testing

### Test Coverage
- Service layer unit tests
- API endpoint integration tests
- Permission system tests
- Variable rendering tests
- Template validation tests

### Test Files
- `test_notification_template_service.py` - Service layer tests
- `test_notification_template_variable_service.py` - Variable system tests
- `test_notification_template_endpoints.py` - API endpoint tests

## Usage Examples

### Creating a Template
```python
template_data = NotificationTemplateCreate(
    scholarship_type_id=1,
    template_type="application",
    template_key="status_update_v1",
    name="申請狀態更新",
    subject_template="您的{scholarship_name}申請狀態已更新",
    body_template="親愛的{student_name}，您的申請狀態已更新為：{application_status}",
    is_active=True,
    is_default=True
)
```

### Using Template for Notifications
```python
# Send notification using template
await notification_service.notifyApplicationStatusChangeWithTemplate(
    user_id=student_id,
    application_id=app_id,
    new_status="under_review",
    scholarship_type_id=scholarship_id,
    language="zh"
)
```

### Template Preview
```python
preview_data = NotificationTemplatePreview(
    template_id=1,
    context_data={
        "student_name": "王小明",
        "scholarship_name": "優秀學生獎學金",
        "application_status": "審核中"
    },
    language="zh"
)

preview = await template_service.preview_template(preview_data)
```

## Migration

### Database Migration
Run the Alembic migration to create the required tables:
```bash
alembic upgrade head
```

The migration file `001_create_notification_templates.py` includes:
- Table creation
- Default variable population
- Proper indexes and constraints

### Existing System Integration
The system is designed to work alongside the existing notification system:
- Templates are optional - fallback to basic notifications
- No breaking changes to existing APIs
- Gradual migration path available

## Security Considerations

### Permission Model
- Role-based access control at API level
- Service-level permission checking
- Template ownership and access restrictions

### Input Validation
- Template content validation
- Variable name sanitization
- SQL injection prevention through parameterized queries

### Audit Trail
- Complete change history tracking
- User attribution for all modifications
- Soft delete with history preservation

## Future Enhancements

### Potential Improvements
1. **Template Versioning**: Multiple versions of templates with rollback capability
2. **A/B Testing**: Template performance comparison
3. **Scheduled Templates**: Time-based template activation
4. **Rich Text Editor**: WYSIWYG editor for template creation
5. **Email Analytics**: Open rates and click-through tracking
6. **Template Library**: Shared template repository
7. **Multi-language Support**: Additional language support beyond Chinese/English

### Integration Opportunities
1. **Email Service Enhancement**: Direct integration with email templates
2. **SMS Templates**: Extend system to support SMS notifications
3. **Push Notifications**: Mobile app notification templates
4. **Webhook Templates**: API callback message templates

## Installation & Deployment

### Backend Setup
1. Install dependencies from `requirements.txt`
2. Run database migrations: `alembic upgrade head`
3. Update API routing to include notification-templates endpoints
4. Configure permissions in your authentication system

### Frontend Setup
1. Add the React component to your admin interface
2. Configure routing for `/admin/notification-templates`
3. Ensure proper authentication middleware
4. Update navigation menus

### Production Considerations
- Database indexes for performance
- Template caching for high-volume usage
- Rate limiting on template operations
- Backup strategy for template history

This implementation provides a comprehensive, scalable solution for notification template management that addresses all requirements in GitHub Issue #52 while maintaining backward compatibility and providing room for future enhancements.