"""
File proxy endpoints for secure file access
"""

from typing import Optional
import urllib.parse
import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_

from app.db.deps import get_db
from app.core.security import get_current_user, verify_token
from app.models.user import User, UserRole
from app.models.application import ApplicationFile, Application
from app.services.minio_service import minio_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/applications/{application_id}/files/{file_id}")
async def get_file_proxy(
    application_id: int = Path(..., description="Application ID"),
    file_id: int = Path(..., description="File ID"),
    token: Optional[str] = Query(None, description="Access token"),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy endpoint to securely serve files from MinIO
    """
    try:
        # Manual token verification for direct file access
        if not token:
            raise HTTPException(status_code=401, detail="Access token required")
        
        try:
            payload = verify_token(token)
            user_id = int(payload.get("sub"))
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        user_result = await db.get(User, user_id)
        if not user_result or not user_result.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        current_user = user_result
        
        # Verify file exists and user has access
        stmt = select(ApplicationFile).options(
            selectinload(ApplicationFile.application)
        ).join(Application).where(
            and_(
                ApplicationFile.id == file_id,
                Application.id == application_id
            )
        )
        result = await db.execute(stmt)
        file_record = result.scalar_one_or_none()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check access permissions
        application = file_record.application
        
        # Students can only access their own files
        if current_user.role == UserRole.STUDENT and application.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Staff (admin/college) can access any file
        if current_user.role not in [UserRole.STUDENT, UserRole.ADMIN, UserRole.COLLEGE]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get file stream from MinIO
        if not file_record.object_name:
            raise HTTPException(status_code=404, detail="File object not found")
        
        file_stream = minio_service.get_file_stream(file_record.object_name)
        
        # Determine content type
        content_type = file_record.mime_type or file_record.content_type or 'application/octet-stream'
        
        # Create streaming response
        def generate():
            try:
                for chunk in file_stream.stream(1024 * 1024):  # 1MB chunks
                    yield chunk
            finally:
                file_stream.close()
                file_stream.release_conn()
        
        # Handle filename encoding for non-ASCII characters (e.g., Chinese)
        encoded_filename = urllib.parse.quote(file_record.filename, safe='')
        
        headers = {
            'Content-Disposition': f'inline; filename*=UTF-8\'\'{encoded_filename}',
            'Cache-Control': 'private, max-age=3600'  # Cache for 1 hour
        }
        
        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving file {file_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/applications/{application_id}/files/{file_id}/download")
async def download_file_proxy(
    application_id: int = Path(..., description="Application ID"),
    file_id: int = Path(..., description="File ID"),
    token: Optional[str] = Query(None, description="Access token"),
    db: AsyncSession = Depends(get_db)
):
    """
    Force download endpoint for files
    """
    try:
        # Manual token verification for direct file access
        if not token:
            raise HTTPException(status_code=401, detail="Access token required")
        
        try:
            payload = verify_token(token)
            user_id = int(payload.get("sub"))
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        user_result = await db.get(User, user_id)
        if not user_result or not user_result.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        current_user = user_result
        
        # Verify file exists and user has access (same logic as above)
        stmt = select(ApplicationFile).options(
            selectinload(ApplicationFile.application)
        ).join(Application).where(
            and_(
                ApplicationFile.id == file_id,
                Application.id == application_id
            )
        )
        result = await db.execute(stmt)
        file_record = result.scalar_one_or_none()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check access permissions
        application = file_record.application
        if current_user.role == UserRole.STUDENT and application.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get file stream from MinIO
        if not file_record.object_name:
            raise HTTPException(status_code=404, detail="File object not found")
        
        file_stream = minio_service.get_file_stream(file_record.object_name)
        
        # Determine content type
        content_type = file_record.mime_type or file_record.content_type or 'application/octet-stream'
        
        # Create streaming response with download headers
        def generate():
            try:
                for chunk in file_stream.stream(1024 * 1024):  # 1MB chunks
                    yield chunk
            finally:
                file_stream.close()
                file_stream.release_conn()
        
        # Handle filename encoding for non-ASCII characters (e.g., Chinese)
        encoded_filename = urllib.parse.quote(file_record.filename, safe='')
        
        headers = {
            'Content-Disposition': f'attachment; filename*=UTF-8\'\'{encoded_filename}',
            'Cache-Control': 'no-cache'
        }
        
        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") 