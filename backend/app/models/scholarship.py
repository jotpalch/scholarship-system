"""
Scholarship type and rule models
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class ScholarshipSubType(enum.Enum):
    """Scholarship sub-type enum for variants under the same scholarship category"""
    NSC_PHD = "nsc_phd"
    MOE_PHD = "moe_phd"


class ScholarshipStatus(enum.Enum):
    """Scholarship status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"


class ScholarshipType(Base):
    """Scholarship type configuration model"""
    __tablename__ = "scholarship_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    name_en = Column(String(200))
    description = Column(Text)
    description_en = Column(Text)
    
    # 金額設定
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="TWD")
    
    # 申請條件
    eligible_student_types = Column(JSON)  # ["undergraduate", "phd", "direct_phd"]
    min_gpa = Column(Numeric(4, 2))
    max_ranking_percent = Column(Numeric(5, 2))
    max_completed_terms = Column(Integer)
    required_documents = Column(JSON)  # ["transcript", "research_proposal", ...]
    
    # 分類與子類型
    category_id = Column(Integer, ForeignKey("scholarship_categories.id"), nullable=True)
    sub_type = Column(SAEnum(ScholarshipSubType, name="scholarship_sub_type"), nullable=True)
    
    # 白名單設定
    whitelist_enabled = Column(Boolean, default=False)  # 是否啟用白名單
    whitelist_student_ids = Column(JSON)  # 白名單學生ID列表
    
    # 申請時間
    application_start_date = Column(DateTime(timezone=True))
    application_end_date = Column(DateTime(timezone=True))
    review_deadline = Column(DateTime(timezone=True))
    
    # 狀態與設定
    status = Column(String(20), default=ScholarshipStatus.ACTIVE.value)
    max_applications_per_year = Column(Integer, default=1)
    requires_professor_recommendation = Column(Boolean, default=False)
    requires_research_proposal = Column(Boolean, default=False)
    
    # 審核流程設定
    review_workflow = Column(JSON)  # 定義審核流程步驟
    auto_approval_rules = Column(JSON)  # 自動核准規則
    
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer)
    updated_by = Column(Integer)
    
    # 關聯
    rules = relationship("ScholarshipRule", back_populates="scholarship_type", cascade="all, delete-orphan")
    category = relationship("ScholarshipCategory", back_populates="scholarship_types")

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


class ScholarshipRule(Base):
    """Scholarship eligibility and validation rules"""
    __tablename__ = "scholarship_rules"

    id = Column(Integer, primary_key=True, index=True)
    scholarship_type_id = Column(Integer, ForeignKey("scholarship_types.id"), nullable=False)
    
    # 規則基本資訊
    rule_name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # gpa, ranking, term_count, nationality, etc.
    description = Column(Text)
    
    # 規則條件
    condition_field = Column(String(50))  # 檢查的欄位名稱
    operator = Column(String(20))  # >=, <=, ==, !=, in, not_in
    expected_value = Column(String(500))  # 期望值
    error_message = Column(Text)  # 驗證失敗訊息
    error_message_en = Column(Text)  # 英文錯誤訊息
    
    # 規則設定
    is_required = Column(Boolean, default=True)  # 是否必須滿足
    weight = Column(Numeric(5, 2), default=1.0)  # 權重
    priority = Column(Integer, default=0)  # 優先級
    
    # 狀態
    is_active = Column(Boolean, default=True)
    
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯
    scholarship_type = relationship("ScholarshipType", back_populates="rules")

    def __repr__(self):
        return f"<ScholarshipRule(id={self.id}, rule_name={self.rule_name}, rule_type={self.rule_type})>"
    
    def validate(self, value) -> bool:
        """Validate value against this rule"""
        if not self.is_active:
            return True
            
        try:
            expected = self.expected_value
            
            if self.operator == ">=":
                return float(value) >= float(expected)
            elif self.operator == "<=":
                return float(value) <= float(expected)
            elif self.operator == "==":
                return str(value) == str(expected)
            elif self.operator == "!=":
                return str(value) != str(expected)
            elif self.operator == "in":
                expected_list = expected.split(",") if isinstance(expected, str) else expected
                return str(value) in expected_list
            elif self.operator == "not_in":
                expected_list = expected.split(",") if isinstance(expected, str) else expected
                return str(value) not in expected_list
            else:
                return True
                
        except (ValueError, TypeError):
            return False 


# Duplicate ScholarshipCategory class definition removed. Actual model is defined in app/models/scholarship_category.py 