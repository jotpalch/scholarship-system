"""
Notification template schemas for request/response validation
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator


class NotificationTemplateVariableBase(BaseModel):
    """Base schema for notification template variables"""
    template_type: str = Field(..., description="Template type this variable belongs to")
    variable_name: str = Field(..., description="Variable name")
    variable_key: str = Field(..., description="Variable key used in templates")
    display_name: str = Field(..., description="Display name for admin interface")
    display_name_en: Optional[str] = Field(None, description="English display name")
    description: Optional[str] = Field(None, description="Variable description")
    description_en: Optional[str] = Field(None, description="English description")
    data_type: str = Field(default="string", description="Data type of the variable")
    is_required: bool = Field(default=False, description="Is this variable required")
    default_value: Optional[str] = Field(None, description="Default value")
    is_active: bool = Field(default=True, description="Is variable active")


class NotificationTemplateVariableCreate(NotificationTemplateVariableBase):
    """Schema for creating notification template variables"""
    pass


class NotificationTemplateVariableUpdate(BaseModel):
    """Schema for updating notification template variables"""
    display_name: Optional[str] = None
    display_name_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    data_type: Optional[str] = None
    is_required: Optional[bool] = None
    default_value: Optional[str] = None
    is_active: Optional[bool] = None


class NotificationTemplateVariableResponse(NotificationTemplateVariableBase):
    """Schema for notification template variable responses"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationTemplateBase(BaseModel):
    """Base schema for notification templates"""
    scholarship_type_id: Optional[int] = Field(None, description="Scholarship type ID (null for global templates)")
    template_type: str = Field(..., description="Template type")
    template_key: str = Field(..., description="Template key")
    name: str = Field(..., description="Template display name")
    name_en: Optional[str] = Field(None, description="English template name")
    subject_template: str = Field(..., description="Email subject template")
    subject_template_en: Optional[str] = Field(None, description="English subject template")
    body_template: str = Field(..., description="Email body template")
    body_template_en: Optional[str] = Field(None, description="English body template")
    cc_emails: Optional[List[str]] = Field(None, description="CC email addresses")
    bcc_emails: Optional[List[str]] = Field(None, description="BCC email addresses")
    available_variables: Optional[Dict[str, Any]] = Field(None, description="Available variables for this template")
    description: Optional[str] = Field(None, description="Template description")
    description_en: Optional[str] = Field(None, description="English description")
    is_active: bool = Field(default=True, description="Is template active")
    is_default: bool = Field(default=False, description="Is default template for this type")

    @validator('cc_emails', 'bcc_emails', pre=True)
    def validate_emails(cls, v):
        """Validate email lists"""
        if v is None:
            return v
        if isinstance(v, str):
            # Convert comma-separated string to list
            return [email.strip() for email in v.split(',') if email.strip()]
        return v

    @validator('template_type')
    def validate_template_type(cls, v):
        """Validate template type against allowed values"""
        allowed_types = ['whitelist', 'application', 'recommendation', 'review', 
                        'supplementary_document', 'result', 'roster_creation']
        if v not in allowed_types:
            raise ValueError(f'Template type must be one of: {", ".join(allowed_types)}')
        return v


class NotificationTemplateCreate(NotificationTemplateBase):
    """Schema for creating notification templates"""
    pass


class NotificationTemplateUpdate(BaseModel):
    """Schema for updating notification templates"""
    name: Optional[str] = None
    name_en: Optional[str] = None
    subject_template: Optional[str] = None
    subject_template_en: Optional[str] = None
    body_template: Optional[str] = None
    body_template_en: Optional[str] = None
    cc_emails: Optional[List[str]] = None
    bcc_emails: Optional[List[str]] = None
    available_variables: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

    @validator('cc_emails', 'bcc_emails', pre=True)
    def validate_emails(cls, v):
        """Validate email lists"""
        if v is None:
            return v
        if isinstance(v, str):
            # Convert comma-separated string to list
            return [email.strip() for email in v.split(',') if email.strip()]
        return v


class NotificationTemplateResponse(NotificationTemplateBase):
    """Schema for notification template responses"""
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]

    class Config:
        from_attributes = True


class NotificationTemplateWithScholarship(NotificationTemplateResponse):
    """Schema for notification template with scholarship information"""
    scholarship_name: Optional[str] = None
    scholarship_code: Optional[str] = None


class NotificationTemplateHistoryResponse(BaseModel):
    """Schema for notification template history responses"""
    id: int
    template_id: int
    previous_content: Dict[str, Any]
    change_type: str
    change_summary: Optional[str]
    changed_at: datetime
    changed_by: Optional[int]
    changed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationTemplateBulkOperation(BaseModel):
    """Schema for bulk operations on notification templates"""
    template_ids: List[int] = Field(..., description="List of template IDs")
    operation: str = Field(..., description="Operation to perform")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Operation parameters")

    @validator('operation')
    def validate_operation(cls, v):
        """Validate operation type"""
        allowed_operations = ['activate', 'deactivate', 'delete', 'duplicate']
        if v not in allowed_operations:
            raise ValueError(f'Operation must be one of: {", ".join(allowed_operations)}')
        return v


class NotificationTemplatePreview(BaseModel):
    """Schema for previewing notification templates"""
    template_id: int = Field(..., description="Template ID to preview")
    context_data: Dict[str, Any] = Field(..., description="Context data for variable substitution")
    language: str = Field(default="zh", description="Language for preview (zh/en)")

    @validator('language')
    def validate_language(cls, v):
        """Validate language code"""
        if v not in ['zh', 'en']:
            raise ValueError('Language must be either "zh" or "en"')
        return v


class NotificationTemplatePreviewResponse(BaseModel):
    """Schema for notification template preview responses"""
    subject: str = Field(..., description="Rendered subject")
    body: str = Field(..., description="Rendered body")
    missing_variables: List[str] = Field(default=[], description="Variables that were not provided")
    invalid_variables: List[str] = Field(default=[], description="Variables with invalid values")


class NotificationTemplateSearch(BaseModel):
    """Schema for searching notification templates"""
    scholarship_type_id: Optional[int] = None
    template_type: Optional[str] = None
    search_term: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    created_by: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=100)

    @validator('template_type')
    def validate_template_type(cls, v):
        """Validate template type against allowed values"""
        if v is None:
            return v
        allowed_types = ['whitelist', 'application', 'recommendation', 'review', 
                        'supplementary_document', 'result', 'roster_creation']
        if v not in allowed_types:
            raise ValueError(f'Template type must be one of: {", ".join(allowed_types)}')
        return v


class NotificationTemplateListResponse(BaseModel):
    """Schema for notification template list responses"""
    templates: List[NotificationTemplateWithScholarship]
    total: int
    skip: int
    limit: int