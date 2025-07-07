"""
Scholarship type and rule models
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class ScholarshipStatus(enum.Enum):
    """Scholarship status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"


class ScholarshipCategory(enum.Enum):
    """Scholarship category enum"""
    UNDERGRADUATE_FRESHMAN = "undergraduate_freshman"  # 學士班新生獎學金
    PHD = "phd"  # 國科會/教育部博士生獎學金
    DIRECT_PHD = "direct_phd"  # 逕升博士獎學金

class ScholarshipSubType(enum.Enum):
    """Scholarship sub-type enum for combined scholarships"""

    GENERAL = "general"  # 作為無子獎學金類型時的預設值

    # For PhD scholarships
    NSTC = "nstc"  # 國科會 (National Science and Technology Council)
    MOE_1W = "moe_1w"    # 教育部 (Ministry of Education) + 指導教授配合款一萬
    MOE_2W = "moe_2w"  # 教育部 (Ministry of Education) + 指導教授配合款兩萬

class ScholarshipType(Base):
    """
    Scholarship type configuration model
    
    This table stores the configuration for different types of scholarships,
    including eligibility criteria, application periods, and review workflows.
    Each scholarship type can have multiple sub-types and associated rules.
    """
    __tablename__ = "scholarship_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    name_en = Column(String(200))
    description = Column(Text)
    description_en = Column(Text)
    
    # 類別設定
    category = Column(String(50), nullable=False)
    sub_type_list = Column(JSON, default=[ScholarshipSubType.GENERAL.value]) # ["nstc", "moe_1w", "moe_2w"]
    
    # 金額設定
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="TWD")
    
    # 白名單設定
    whitelist_enabled = Column(Boolean, default=False)  # 是否啟用白名單
    whitelist_student_ids = Column(JSON, default=[])  # 白名單學生ID列表
    
    # 申請時間
    application_start_date = Column(DateTime(timezone=True))
    application_end_date = Column(DateTime(timezone=True))
    review_deadline = Column(DateTime(timezone=True))
    
    # 狀態與設定
    status = Column(String(20), default=ScholarshipStatus.ACTIVE.value)
    max_applications_per_year = Column(Integer, default=1)
    requires_professor_recommendation = Column(Boolean, default=False)
    requires_college_review = Column(Boolean, default=False)
        
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))
    
    # 關聯
    rules = relationship("ScholarshipRule", back_populates="scholarship_type", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<ScholarshipType(id={self.id}, code={self.code}, name={self.name})>"
    
    @property
    def is_active(self) -> bool:
        """Check if scholarship type is active"""
        return bool(self.status == ScholarshipStatus.ACTIVE.value)
    
    @property
    def is_application_period(self) -> bool:
        """Check if within application period"""
        now = datetime.now(timezone.utc)
        if not self.application_start_date or not self.application_end_date:
            return False
        return bool(self.application_start_date <= now <= self.application_end_date)
    
    def is_student_in_whitelist(self, student_id: int) -> bool:
        """Check if student is in whitelist"""
        # 如果未啟用白名單，則不限制申請（返回True表示通過檢查）
        if not self.whitelist_enabled:
            return True  # 未啟用白名單時，所有學生都可申請
        
        # 如果啟用白名單但列表為空，則無人可申請
        if not self.whitelist_student_ids:
            return False  # 啟用白名單但列表為空，無人可申請
            
        # 檢查學生是否在白名單中
        return student_id in self.whitelist_student_ids

    def validate_sub_type_list(self) -> bool:
        """Validate sub_type_list against ScholarshipSubType enum"""
        if not self.sub_type_list:
            return True  # 空列表是有效的
        valid_types = [e.value for e in ScholarshipSubType]
        return all(sub_type in valid_types for sub_type in self.sub_type_list)


class ScholarshipRule(Base):
    """
    Scholarship eligibility and validation rules
    
    This table stores the validation rules for scholarship applications.
    Each rule defines a specific condition that must be met for eligibility,
    such as GPA requirements, ranking criteria, or nationality restrictions.
    """
    __tablename__ = "scholarship_rules"

    id = Column(Integer, primary_key=True, index=True)
    scholarship_type_id = Column(Integer, ForeignKey("scholarship_types.id"), nullable=False)
    # 如果獎學金類型沒有子類型，則為 None，此規則為通用規則，適用於所有子類型
    sub_type = Column(String(50), nullable=True, default=None) 
    
    # 規則基本資訊
    rule_name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # gpa, ranking, term_count, nationality, etc.
    tag = Column(String(20)) # 博士生 非陸生 中華民國國籍 等等
    description = Column(Text)
    
    # 規則條件
    condition_field = Column(String(100))  # 檢查的欄位名稱
    operator = Column(String(20))  # >=, <=, ==, !=, in, not_in
    expected_value = Column(String(500))  # 期望值
    message = Column(Text)  # 驗證訊息
    message_en = Column(Text)  # 英文訊息
    
    # 規則設定
    is_hard_rule = Column(Boolean, default=False)  # 是否為硬性規則，硬性規則必須滿足，否則無法申請
    is_warning = Column(Boolean, default=False)  # 是否為警告規則
    priority = Column(Integer, default=0)  # 優先級
    
    # 狀態
    is_active = Column(Boolean, default=True)
    
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯
    scholarship_type = relationship("ScholarshipType", back_populates="rules")

    def __repr__(self):
        return f"<ScholarshipRule(id={self.id}, rule_name={self.rule_name}, rule_type={self.rule_type}, scholarship_type_id={self.scholarship_type_id}, sub_type={self.sub_type})>"
    
    def validate_sub_type(self) -> bool:
        """Validate sub_type against ScholarshipSubType enum and the scholarship_type's sub_type_list"""
        if not self.sub_type:
            return False
        valid_types = [e.value for e in ScholarshipSubType]
        if self.sub_type not in valid_types:
            return False
        if not self.scholarship_type or not self.scholarship_type.sub_type_list:
            return False
        return self.sub_type in self.scholarship_type.sub_type_list