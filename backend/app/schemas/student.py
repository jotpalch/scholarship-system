"""
Student schemas for API requests and responses with normalized database design
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


# === 查詢表相關 Schemas ===

class DegreeBase(BaseModel):
    """學位基礎 schema"""
    name: str = Field(..., description="學位名稱")

class DegreeResponse(DegreeBase):
    """學位回應 schema"""
    id: int
    
    class Config:
        from_attributes = True


class IdentityBase(BaseModel):
    """身份基礎 schema"""
    name: str = Field(..., description="身份名稱")

class IdentityResponse(IdentityBase):
    """身份回應 schema"""
    id: int
    
    class Config:
        from_attributes = True


class StudyingStatusBase(BaseModel):
    """學籍狀態基礎 schema"""
    name: str = Field(..., description="狀態名稱")

class StudyingStatusResponse(StudyingStatusBase):
    """學籍狀態回應 schema"""
    id: int
    
    class Config:
        from_attributes = True


class SchoolIdentityBase(BaseModel):
    """學校身份基礎 schema"""
    name: str = Field(..., description="學校身份名稱")

class SchoolIdentityResponse(SchoolIdentityBase):
    """學校身份回應 schema"""
    id: int
    
    class Config:
        from_attributes = True


class AcademyBase(BaseModel):
    """學院基礎 schema"""
    code: Optional[str] = Field(None, description="學院代碼")
    name: str = Field(..., description="學院名稱")

class AcademyCreate(AcademyBase):
    """學院建立 schema"""
    pass

class AcademyResponse(AcademyBase):
    """學院回應 schema"""
    id: int
    
    class Config:
        from_attributes = True


class DepartmentBase(BaseModel):
    """系所基礎 schema"""
    code: Optional[str] = Field(None, description="系所代碼")
    name: str = Field(..., description="系所名稱")

class DepartmentCreate(DepartmentBase):
    """系所建立 schema"""
    pass

class DepartmentResponse(DepartmentBase):
    """系所回應 schema"""
    id: int
    
    class Config:
        from_attributes = True


class EnrollTypeBase(BaseModel):
    """入學管道基礎 schema"""
    code: Optional[str] = Field(None, description="入學管道代碼")
    name: str = Field(..., description="入學管道名稱")
    degreeId: int = Field(..., description="學位ID")

class EnrollTypeCreate(EnrollTypeBase):
    """入學管道建立 schema"""
    pass

class EnrollTypeResponse(EnrollTypeBase):
    """入學管道回應 schema"""
    id: int
    degree: Optional[DegreeResponse] = None
    
    class Config:
        from_attributes = True


# === 學生資料相關 Schemas ===

class StudentContactBase(BaseModel):
    """學生聯絡資料基礎 schema"""
    cellphone: Optional[str] = Field(None, description="手機號碼")
    email: Optional[str] = Field(None, description="電子郵件")
    zipCode: Optional[str] = Field(None, description="郵遞區號")
    address: Optional[str] = Field(None, description="地址")

class StudentContactCreate(StudentContactBase):
    """學生聯絡資料建立 schema"""
    studentId: int = Field(..., description="學生ID")

class StudentContactUpdate(StudentContactBase):
    """學生聯絡資料更新 schema"""
    pass

class StudentContactResponse(StudentContactBase):
    """學生聯絡資料回應 schema"""
    studentId: int
    
    class Config:
        from_attributes = True


class StudentAcademicRecordBase(BaseModel):
    """學籍資料基礎 schema"""
    degree: Optional[int] = Field(None, description="學位ID")
    studyingStatus: Optional[int] = Field(None, description="學籍狀態ID")
    schoolIdentity: Optional[int] = Field(None, description="學校身份ID")
    termCount: Optional[int] = Field(None, description="修習學期數")
    depId: Optional[int] = Field(None, description="系所ID")
    academyId: Optional[int] = Field(None, description="學院ID")
    enrollTypeId: Optional[int] = Field(None, description="入學管道ID")
    enrollYear: Optional[int] = Field(None, description="入學年度")
    enrollTerm: Optional[int] = Field(None, description="入學學期", ge=1, le=2)
    highestSchoolName: Optional[str] = Field(None, description="最高學歷學校名稱")
    nationality: Optional[int] = Field(None, description="國籍", ge=1, le=2)

class StudentAcademicRecordCreate(StudentAcademicRecordBase):
    """學籍資料建立 schema"""
    studentId: int = Field(..., description="學生ID")

class StudentAcademicRecordUpdate(StudentAcademicRecordBase):
    """學籍資料更新 schema"""
    pass

class StudentAcademicRecordResponse(StudentAcademicRecordBase):
    """學籍資料回應 schema"""
    id: int
    studentId: int
    createdAt: datetime
    
    # 關聯資料
    degreeRef: Optional[DegreeResponse] = None
    studyingStatusRef: Optional[StudyingStatusResponse] = None
    schoolIdentityRef: Optional[SchoolIdentityResponse] = None
    department: Optional[DepartmentResponse] = None
    academy: Optional[AcademyResponse] = None
    enrollType: Optional[EnrollTypeResponse] = None
    
    class Config:
        from_attributes = True


class StudentBase(BaseModel):
    """學生基礎 schema"""
    stdNo: str = Field(..., description="學號")
    stdCode: Optional[str] = Field(None, description="學生代碼")
    pid: Optional[str] = Field(None, description="身分證字號")
    cname: Optional[str] = Field(None, description="中文姓名")
    ename: Optional[str] = Field(None, description="英文姓名")
    sex: Optional[str] = Field(None, description="性別", pattern="^[MF]$")
    birthDate: Optional[date] = Field(None, description="出生日期")

class StudentCreate(StudentBase):
    """學生建立 schema"""
    identityIds: Optional[List[int]] = Field(default=[], description="身份ID列表")

class StudentUpdate(BaseModel):
    """學生更新 schema"""
    stdCode: Optional[str] = None
    pid: Optional[str] = None
    cname: Optional[str] = None
    ename: Optional[str] = None
    sex: Optional[str] = Field(None, pattern="^[MF]$")
    birthDate: Optional[date] = None
    identityIds: Optional[List[int]] = None

class StudentTermRecordResponse(BaseModel):
    """學生學期成績記錄回應 schema"""
    id: int
    studentId: int
    academicYear: str
    semester: str
    studyStatus: str
    averageScore: Optional[str] = None
    gpa: Optional[str] = None
    semesterGpa: Optional[str] = None
    classRankingPercent: Optional[str] = None
    deptRankingPercent: Optional[str] = None
    completedTerms: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime
    
    class Config:
        from_attributes = True

class StudentResponse(StudentBase):
    """學生回應 schema"""
    id: int
    
    # 關聯資料
    identities: List[IdentityResponse] = []
    academicRecords: List[StudentAcademicRecordResponse] = []
    contacts: Optional[StudentContactResponse] = None
    
    class Config:
        from_attributes = True


class StudentDetailResponse(StudentResponse):
    """學生詳細資料回應 schema"""
    termRecords: List[StudentTermRecordResponse] = []
    
    @property
    def displayName(self) -> str:
        """取得顯示名稱"""
        return str(self.cname or self.ename or self.stdNo or "")
    
    @property
    def currentAcademicRecord(self) -> Optional[StudentAcademicRecordResponse]:
        """取得目前學籍資料"""
        if self.academicRecords:
            return max(self.academicRecords, key=lambda x: x.createdAt)
        return None


# === 查詢參數 Schemas ===

class StudentSearchParams(BaseModel):
    """學生查詢參數 schema"""
    stdNo: Optional[str] = None
    cname: Optional[str] = None
    ename: Optional[str] = None
    degreeId: Optional[int] = None
    academyId: Optional[int] = None
    departmentId: Optional[int] = None
    studyingStatusId: Optional[int] = None
    enrollYear: Optional[int] = None
    
    # 分頁參數
    page: int = Field(1, ge=1, description="頁碼")
    size: int = Field(20, ge=1, le=100, description="每頁筆數") 