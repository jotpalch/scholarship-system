"""
API endpoints for notification template management
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.notification_template_service import NotificationTemplateService
from app.schemas.notification_template import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    NotificationTemplateResponse,
    NotificationTemplateWithScholarship,
    NotificationTemplateSearch,
    NotificationTemplateListResponse,
    NotificationTemplatePreview,
    NotificationTemplatePreviewResponse,
    NotificationTemplateBulkOperation,
    NotificationTemplateVariableResponse,
    NotificationTemplateHistoryResponse
)

router = APIRouter()


@router.post("/", response_model=NotificationTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_template(
    template_data: NotificationTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new notification template
    
    - **scholarship_type_id**: ID of scholarship type (null for global templates)
    - **template_type**: Type of template (whitelist, application, etc.)
    - **template_key**: Unique key for this template
    - **name**: Display name of the template
    - **subject_template**: Email subject template with variables
    - **body_template**: Email body template with variables
    """
    service = NotificationTemplateService(db)
    
    # Check if user can create templates
    # For now, only admins and super admins can create templates
    if not current_user.is_admin and not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create notification templates"
        )
    
    template = await service.create_template(template_data, current_user.id)
    return template


@router.get("/", response_model=NotificationTemplateListResponse)
async def list_notification_templates(
    scholarship_type_id: int = Query(None, description="Filter by scholarship type ID"),
    template_type: str = Query(None, description="Filter by template type"),
    search_term: str = Query(None, description="Search in name, description, or key"),
    is_active: bool = Query(None, description="Filter by active status"),
    is_default: bool = Query(None, description="Filter by default status"),
    skip: int = Query(0, ge=0, description="Number of templates to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of templates to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List notification templates with filtering and pagination
    """
    service = NotificationTemplateService(db)
    
    search_params = NotificationTemplateSearch(
        scholarship_type_id=scholarship_type_id,
        template_type=template_type,
        search_term=search_term,
        is_active=is_active,
        is_default=is_default,
        skip=skip,
        limit=limit
    )
    
    templates, total = await service.search_templates(search_params)
    
    return NotificationTemplateListResponse(
        templates=templates,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{template_id}", response_model=NotificationTemplateWithScholarship)
async def get_notification_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific notification template by ID
    """
    service = NotificationTemplateService(db)
    template = await service.get_template_with_scholarship(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    
    return template


@router.put("/{template_id}", response_model=NotificationTemplateResponse)
async def update_notification_template(
    template_id: int,
    template_data: NotificationTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a notification template
    """
    service = NotificationTemplateService(db)
    
    # Get the template to check permissions
    template = await service.get_template(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    
    # Check if user can edit this template
    can_edit = await service.can_user_edit_template(current_user.id, template)
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to edit this notification template"
        )
    
    updated_template = await service.update_template(
        template_id, 
        template_data, 
        current_user.id
    )
    
    return updated_template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a notification template
    """
    service = NotificationTemplateService(db)
    
    # Get the template to check permissions
    template = await service.get_template(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    
    # Check if user can edit this template
    can_edit = await service.can_user_edit_template(current_user.id, template)
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete this notification template"
        )
    
    success = await service.delete_template(template_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )


@router.post("/preview", response_model=NotificationTemplatePreviewResponse)
async def preview_notification_template(
    preview_data: NotificationTemplatePreview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview a notification template with provided context data
    
    This endpoint allows you to see how a template will look when rendered
    with actual variable values.
    """
    service = NotificationTemplateService(db)
    return await service.preview_template(preview_data)


@router.post("/{template_id}/duplicate", response_model=NotificationTemplateResponse)
async def duplicate_notification_template(
    template_id: int,
    new_name: str = Query(..., description="Name for the duplicated template"),
    new_scholarship_type_id: int = Query(None, description="Scholarship type ID for the new template"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Duplicate an existing notification template
    """
    service = NotificationTemplateService(db)
    
    # Check if user can create templates
    if not current_user.is_admin and not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to duplicate notification templates"
        )
    
    duplicated_template = await service.duplicate_template(
        template_id,
        new_name,
        new_scholarship_type_id,
        current_user.id
    )
    
    if not duplicated_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source template not found"
        )
    
    return duplicated_template


@router.post("/bulk", status_code=status.HTTP_200_OK)
async def bulk_operation_notification_templates(
    operation_data: NotificationTemplateBulkOperation,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform bulk operations on notification templates
    
    Supported operations:
    - **activate**: Activate multiple templates
    - **deactivate**: Deactivate multiple templates
    - **delete**: Delete multiple templates
    """
    service = NotificationTemplateService(db)
    
    # Check permissions (only admins can perform bulk operations)
    if not current_user.is_admin and not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for bulk operations"
        )
    
    if operation_data.operation == "activate":
        affected_count = await service.bulk_activate_templates(
            operation_data.template_ids, 
            current_user.id
        )
        return {"message": f"Activated {affected_count} templates"}
    
    elif operation_data.operation == "deactivate":
        affected_count = await service.bulk_deactivate_templates(
            operation_data.template_ids, 
            current_user.id
        )
        return {"message": f"Deactivated {affected_count} templates"}
    
    elif operation_data.operation == "delete":
        deleted_count = 0
        for template_id in operation_data.template_ids:
            success = await service.delete_template(template_id, current_user.id)
            if success:
                deleted_count += 1
        return {"message": f"Deleted {deleted_count} templates"}
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported operation: {operation_data.operation}"
        )


@router.get("/scholarship/{scholarship_type_id}", response_model=List[NotificationTemplateResponse])
async def get_templates_for_scholarship(
    scholarship_type_id: int,
    template_type: str = Query(None, description="Filter by template type"),
    active_only: bool = Query(True, description="Only return active templates"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all templates for a specific scholarship type
    """
    service = NotificationTemplateService(db)
    templates = await service.get_templates_for_scholarship(
        scholarship_type_id,
        template_type,
        active_only
    )
    
    return templates


@router.get("/default/{template_type}", response_model=NotificationTemplateResponse)
async def get_default_template(
    template_type: str,
    scholarship_type_id: int = Query(None, description="Scholarship type ID (null for global)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the default template for a specific template type and scholarship
    """
    service = NotificationTemplateService(db)
    template = await service.get_default_template(scholarship_type_id, template_type)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No default template found for type '{template_type}'"
        )
    
    return template


@router.get("/variables/{template_type}", response_model=List[NotificationTemplateVariableResponse])
async def get_template_variables(
    template_type: str,
    active_only: bool = Query(True, description="Only return active variables"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get available variables for a specific template type
    """
    service = NotificationTemplateService(db)
    variables = await service.get_template_variables(template_type, active_only)
    
    return variables


@router.get("/{template_id}/history", response_model=List[NotificationTemplateHistoryResponse])
async def get_template_history(
    template_id: int,
    limit: int = Query(20, ge=1, le=100, description="Number of history records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get change history for a notification template
    """
    service = NotificationTemplateService(db)
    
    # Check if template exists
    template = await service.get_template(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    
    history = await service.get_template_history(template_id, limit)
    
    # Convert to response format
    history_responses = []
    for record in history:
        response = NotificationTemplateHistoryResponse(
            id=record.id,
            template_id=record.template_id,
            previous_content=record.previous_content,
            change_type=record.change_type,
            change_summary=record.change_summary,
            changed_at=record.changed_at,
            changed_by=record.changed_by,
            changed_by_name=record.changed_by_user.full_name if record.changed_by_user else None
        )
        history_responses.append(response)
    
    return history_responses