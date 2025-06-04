"""
Student model for academic information
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class StudentType(enum.Enum):
    """Student type enum"""
    UNDERGRADUATE = "undergraduate"
    PHD = "phd" 
    DIRECT_PHD = "direct_phd"


class StudyStatus(enum.Enum):
    """Study status enum"""
    ACTIVE = "1"  # 在學
    LEAVE = "2"   # 休學
    GRADUATE = "3" # 畢業
    DROPOUT = "4"  # 退學


class Student(Base):
    """Student academic profile model"""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # 學籍基本資料
    student_no = Column(String(20), unique=True, index=True, nullable=False)  # std_stdno
    student_code = Column(String(20), index=True, nullable=False)  # std_stdcode
    personal_id = Column(String(20))  # std_pid (身分證字號)
    
    # 學位與狀態
    degree_level = Column(String(10))  # std_degree (1=博士, 3=學士)
    study_status = Column(String(10), default="1")  # std_studingstatus
    student_type = Column(String(20))  # derived from degree and enrollment
    
    # 國籍與身分
    nationality_1 = Column(String(10), default="TWN")  # std_nation1
    nationality_2 = Column(String(10))  # std_nation2
    identity_type = Column(String(10))  # std_identity
    
    # 學校與院系資訊
    school_id = Column(String(10))  # std_schoolid
    department_no = Column(String(10))  # std_depno
    department_name = Column(String(100))  # dep_depname
    academy_no = Column(String(10))  # std_academyno
    academy_name = Column(String(100))  # aca_cname
    
    # 入學資訊
    enroll_type = Column(String(10))  # std_enrolltype
    enroll_year = Column(String(10))  # std_enrollyear
    enroll_term = Column(String(10))  # std_enrollterm
    highest_school_name = Column(String(200))  # std_highestschname
    
    # 聯絡資訊
    cell_phone = Column(String(20))  # com_cellphone
    email = Column(String(255))  # com_email
    postal_code = Column(String(10))  # com_commzip
    address = Column(Text)  # com_commadd
    
    # 個人資訊
    gender = Column(String(1))  # std_sex
    bank_account = Column(String(20))  # 銀行帳號
    
    # 修習學期統計
    total_term_count = Column(Integer)  # std_termcount
    
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯
    user = relationship("User", back_populates="student_profile")
    term_records = relationship("StudentTermRecord", back_populates="student")
    applications = relationship("Application", back_populates="student")

    def __repr__(self):
        return f"<Student(id={self.id}, student_no={self.student_no}, user_id={self.user_id})>"
    
    @property
    def display_name(self) -> str:
        """Get student display name"""
        if self.user:
            return str(self.user.display_name)
        return str(self.student_no or "")
    
    def get_student_type(self) -> StudentType:
        """Determine student type based on degree level and enrollment"""
        if self.degree_level == "3":  # 學士
            return StudentType.UNDERGRADUATE
        elif self.degree_level == "1":  # 博士
            if self.enroll_type in ["8", "9", "10", "11"]:  # 逕升博士管道
                return StudentType.DIRECT_PHD
            else:
                return StudentType.PHD
        return StudentType.UNDERGRADUATE


class StudentTermRecord(Base):
    """Student term academic record"""
    __tablename__ = "student_term_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # 學期資訊
    academic_year = Column(String(10), nullable=False)  # trm_year
    semester = Column(String(10), nullable=False)  # trm_term
    study_status = Column(String(10), default="1")  # trm_studystatus
    
    # 成績資訊
    average_score = Column(Numeric(5, 2))  # trm_ascore
    gpa = Column(Numeric(4, 2))  # trm_ascore_gpa
    semester_gpa = Column(Numeric(4, 2))  # trm_stdascore
    
    # 排名資訊
    class_ranking_percent = Column(Numeric(5, 2))  # trm_placingsrate
    dept_ranking_percent = Column(Numeric(5, 2))  # trm_depplacingrate
    
    # 修習統計
    completed_terms = Column(Integer)  # trm_termcount
    
    # 時間戳記
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯
    student = relationship("Student", back_populates="term_records")

    def __repr__(self):
        return f"<StudentTermRecord(student_id={self.student_id}, year={self.academic_year}, term={self.semester})>" 