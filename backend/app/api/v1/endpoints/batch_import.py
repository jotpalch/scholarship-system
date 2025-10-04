"""
Batch Import API endpoints for college staff

Provides endpoints for uploading, validating, and confirming
offline application data imports.
"""

from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.batch_import import BatchImport
from app.models.scholarship import ScholarshipType
from app.models.user import User
from app.schemas.batch_import import (
    BatchImportConfirmRequest,
    BatchImportConfirmResponse,
    BatchImportDetailResponse,
    BatchImportHistoryItem,
    BatchImportHistoryResponse,
    BatchImportUploadResponse,
)
from app.services.batch_import_service import BatchImportService

router = APIRouter()


def require_college_role(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require college role"""
    if current_user.role != "college":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此功能僅限學院角色使用",
        )
    return current_user


@router.post("/upload-data", response_model=BatchImportUploadResponse)
async def upload_batch_import_data(
    file: UploadFile = File(..., description="Excel或CSV檔案"),
    scholarship_type: str = Query(..., description="獎學金類型代碼"),
    academic_year: int = Query(..., description="學年度", ge=100, le=200),
    semester: Optional[str] = Query(None, description="學期"),
    current_user: User = Depends(require_college_role),
    db: AsyncSession = Depends(get_db),
):
    """
    上傳批次匯入資料檔案（Excel/CSV）

    **流程**:
    1. 上傳 Excel/CSV 檔案
    2. 系統解析並驗證資料
    3. 返回預覽資料與驗證摘要
    4. 待確認後執行匯入

    **權限**: 僅限 college 角色
    """
    service = BatchImportService(db)

    # Validate scholarship type
    stmt = select(ScholarshipType).where(ScholarshipType.code == scholarship_type)
    result = await db.execute(stmt)
    scholarship = result.scalar_one_or_none()

    if not scholarship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"獎學金類型 {scholarship_type} 不存在",
        )

    # Get college code from user
    college_code = current_user.college_code
    if not college_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="使用者未設定學院代碼",
        )

    # Read file content
    file_content = await file.read()

    # Parse and validate
    parsed_data, validation_errors = await service.parse_excel_file(
        file_content=file_content,
        scholarship_type_id=scholarship.id,
        academic_year=academic_year,
        semester=semester,
    )

    # Additional validations
    for row_data in parsed_data:
        # Check college permission
        is_valid, error_msg = await service.validate_college_permission(
            student_id=row_data["student_id"],
            college_code=college_code,
            dept_code=row_data.get("dept_code"),
        )
        if not is_valid:
            validation_errors.append(
                {
                    "row_number": parsed_data.index(row_data) + 2,
                    "student_id": row_data["student_id"],
                    "field": "college_code",
                    "error_type": "permission_error",
                    "message": error_msg,
                }
            )

        # Check duplicate
        is_duplicate, error_msg = await service.check_duplicate_application(
            student_id=row_data["student_id"],
            scholarship_type_id=scholarship.id,
            academic_year=academic_year,
            semester=semester,
        )
        if is_duplicate:
            validation_errors.append(
                {
                    "row_number": parsed_data.index(row_data) + 2,
                    "student_id": row_data["student_id"],
                    "field": "duplicate",
                    "error_type": "duplicate_application",
                    "message": error_msg,
                }
            )

    # Create batch import record
    batch_import = await service.create_batch_import_record(
        importer_id=current_user.id,
        college_code=college_code,
        scholarship_type_id=scholarship.id,
        academic_year=academic_year,
        semester=semester,
        file_name=file.filename,
        total_records=len(parsed_data),
    )

    await db.commit()

    # Return preview (first 10 rows) and validation summary
    return BatchImportUploadResponse(
        batch_id=batch_import.id,
        file_name=file.filename,
        total_records=len(parsed_data),
        preview_data=parsed_data[:10],
        validation_summary={
            "total_errors": len(validation_errors),
            "has_errors": len(validation_errors) > 0,
            "errors": validation_errors[:20],  # Limit preview errors
        },
    )


@router.post("/{batch_id}/confirm", response_model=BatchImportConfirmResponse)
async def confirm_batch_import(
    batch_id: int,
    request: BatchImportConfirmRequest,
    current_user: User = Depends(require_college_role),
    db: AsyncSession = Depends(get_db),
):
    """
    確認執行批次匯入

    **流程**:
    1. 驗證批次記錄
    2. 檢查權限（僅能確認自己上傳的批次）
    3. 建立所有申請記錄
    4. 更新批次狀態

    **權限**: 僅限 college 角色，且僅能確認自己上傳的批次
    """
    # Get batch import record
    batch_import = await db.get(BatchImport, batch_id)
    if not batch_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"批次匯入記錄 {batch_id} 不存在",
        )

    # Verify ownership
    if batch_import.importer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="僅能確認自己上傳的批次匯入",
        )

    # Check status
    if batch_import.import_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"此批次狀態為 {batch_import.import_status}，無法再次確認",
        )

    if not request.confirm:
        # Cancel the batch
        batch_import.import_status = "cancelled"
        await db.commit()
        return BatchImportConfirmResponse(
            batch_id=batch_id,
            success_count=0,
            failed_count=0,
            errors=[],
            created_application_ids=[],
        )

    # Re-parse file and create applications
    # (In production, store parsed data in batch_import.error_summary or separate table)
    # For now, return error indicating file needs to be re-uploaded
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="確認匯入功能需配合檔案儲存機制，請重新設計流程",
    )


@router.get("/history", response_model=BatchImportHistoryResponse)
async def get_batch_import_history(
    skip: int = Query(0, ge=0, description="跳過筆數"),
    limit: int = Query(20, ge=1, le=100, description="每頁筆數"),
    current_user: User = Depends(require_college_role),
    db: AsyncSession = Depends(get_db),
):
    """
    查詢批次匯入歷史記錄

    **權限**: 僅限 college 角色，僅能查看自己上傳的記錄
    """
    # Query batch imports for current user
    stmt = (
        select(BatchImport)
        .where(BatchImport.importer_id == current_user.id)
        .order_by(desc(BatchImport.created_at))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    batch_imports = result.scalars().all()

    # Count total
    count_stmt = select(BatchImport).where(BatchImport.importer_id == current_user.id)
    count_result = await db.execute(count_stmt)
    total = len(count_result.scalars().all())

    # Build response
    items = []
    for batch in batch_imports:
        items.append(
            BatchImportHistoryItem(
                id=batch.id,
                college_code=batch.college_code,
                scholarship_type_id=batch.scholarship_type_id,
                academic_year=batch.academic_year,
                semester=batch.semester,
                file_name=batch.file_name,
                total_records=batch.total_records,
                success_count=batch.success_count,
                failed_count=batch.failed_count,
                import_status=batch.import_status,
                created_at=batch.created_at,
                importer_name=batch.importer.name if batch.importer else None,
            )
        )

    return BatchImportHistoryResponse(total=total, items=items)


@router.get("/{batch_id}/details", response_model=BatchImportDetailResponse)
async def get_batch_import_details(
    batch_id: int,
    current_user: User = Depends(require_college_role),
    db: AsyncSession = Depends(get_db),
):
    """
    查詢批次匯入詳細資訊

    **權限**: 僅限 college 角色，僅能查看自己上傳的記錄
    """
    # Get batch import
    batch_import = await db.get(BatchImport, batch_id)
    if not batch_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"批次匯入記錄 {batch_id} 不存在",
        )

    # Verify ownership
    if batch_import.importer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="僅能查看自己上傳的批次匯入記錄",
        )

    # Get created applications
    created_app_ids = [app.id for app in batch_import.applications]

    return BatchImportDetailResponse(
        id=batch_import.id,
        college_code=batch_import.college_code,
        scholarship_type_id=batch_import.scholarship_type_id,
        academic_year=batch_import.academic_year,
        semester=batch_import.semester,
        file_name=batch_import.file_name,
        file_path=batch_import.file_path,
        total_records=batch_import.total_records,
        success_count=batch_import.success_count,
        failed_count=batch_import.failed_count,
        error_summary=batch_import.error_summary,
        import_status=batch_import.import_status,
        created_at=batch_import.created_at,
        updated_at=batch_import.updated_at,
        importer_name=batch_import.importer.name if batch_import.importer else None,
        created_applications=created_app_ids,
    )
