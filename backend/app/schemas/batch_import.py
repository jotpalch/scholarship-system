"""
Batch Import schemas for API requests and responses
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class BatchImportUploadResponse(BaseModel):
    """Response after uploading batch import file"""

    batch_id: int = Field(..., description="批次匯入ID")
    file_name: str = Field(..., description="檔案名稱")
    total_records: int = Field(..., description="總筆數")
    preview_data: List[Dict[str, Any]] = Field(..., description="預覽資料（前10筆）")
    validation_summary: Dict[str, Any] = Field(..., description="驗證摘要")


class BatchImportValidationError(BaseModel):
    """Single validation error"""

    row_number: int = Field(..., description="行號")
    student_id: Optional[str] = Field(None, description="學號")
    field: str = Field(..., description="欄位名稱")
    error_type: str = Field(..., description="錯誤類型")
    message: str = Field(..., description="錯誤訊息")


class BatchImportConfirmRequest(BaseModel):
    """Request to confirm batch import"""

    batch_id: int = Field(..., description="批次匯入ID")
    confirm: bool = Field(..., description="確認匯入")


class BatchImportConfirmResponse(BaseModel):
    """Response after confirming batch import"""

    batch_id: int
    success_count: int = Field(..., description="成功筆數")
    failed_count: int = Field(..., description="失敗筆數")
    errors: List[BatchImportValidationError] = Field(default=[], description="錯誤清單")
    created_application_ids: List[int] = Field(default=[], description="成功建立的申請ID列表")


class BatchImportHistoryItem(BaseModel):
    """Single batch import history item"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    college_code: str
    scholarship_type_id: Optional[int] = None
    academic_year: int
    semester: Optional[str] = None
    file_name: str
    total_records: int
    success_count: int
    failed_count: int
    import_status: str
    created_at: datetime
    importer_name: Optional[str] = None  # From relationship


class BatchImportHistoryResponse(BaseModel):
    """Batch import history response"""

    total: int = Field(..., description="總筆數")
    items: List[BatchImportHistoryItem] = Field(..., description="匯入歷史列表")


class BatchImportDetailResponse(BaseModel):
    """Detailed batch import information"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    college_code: str
    scholarship_type_id: Optional[int] = None
    academic_year: int
    semester: Optional[str] = None
    file_name: str
    file_path: Optional[str] = None
    total_records: int
    success_count: int
    failed_count: int
    error_summary: Optional[Dict[str, Any]] = None
    import_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    importer_name: Optional[str] = None
    created_applications: Optional[List[int]] = Field(default=[], description="建立的申請ID列表")


class ApplicationDataRow(BaseModel):
    """Single row of application data from Excel/CSV"""

    # 必要欄位
    student_id: str = Field(..., description="學號", min_length=1)
    student_name: str = Field(..., description="姓名", min_length=1)
    dept_code: Optional[str] = Field(None, description="科系代碼")

    # 子類型
    sub_types: List[str] = Field(default=[], description="子類型列表")

    # 銀行帳戶資訊
    bank_account: Optional[str] = Field(None, description="銀行帳號")
    account_holder: Optional[str] = Field(None, description="帳戶戶名")
    bank_name: Optional[str] = Field(None, description="銀行名稱")

    # 指導教授資訊
    supervisor_id: Optional[str] = Field(None, description="指導教授工號")
    supervisor_name: Optional[str] = Field(None, description="指導教授姓名")
    supervisor_email: Optional[str] = Field(None, description="指導教授email")

    # 聯絡資訊
    contact_phone: Optional[str] = Field(None, description="聯絡電話")
    contact_address: Optional[str] = Field(None, description="聯絡地址")

    # 成績資訊
    gpa: Optional[float] = Field(None, description="GPA")
    class_ranking: Optional[int] = Field(None, description="班級排名")
    dept_ranking: Optional[int] = Field(None, description="系所排名")

    # 其他動態欄位
    custom_fields: Optional[Dict[str, Any]] = Field(default={}, description="其他自定義欄位")


class BatchImportDataRequest(BaseModel):
    """Request to create batch import with data"""

    scholarship_type: str = Field(..., description="獎學金類型代碼")
    academic_year: int = Field(..., description="學年度", ge=100, le=200)
    semester: Optional[str] = Field(None, description="學期")
    data_rows: List[ApplicationDataRow] = Field(..., description="申請資料列表", min_length=1)
