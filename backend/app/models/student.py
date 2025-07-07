"""
Student models for academic information with normalized database design
"""

from typing import Optional
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, SmallInteger, Text, Table, UniqueConstraint, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


# === 查詢表模型 ===

class Degree(Base):
    """學位表"""
    __tablename__ = "degrees"

    id = Column(SmallInteger, primary_key=True)
    name = Column(String(20), nullable=False)

    # 關聯
    enrollTypes = relationship("EnrollType", back_populates="degree")
    studentAcademicRecords = relationship("StudentAcademicRecord", back_populates="degreeRef", overlaps="enrollType")


class Identity(Base):
    """學生身份表"""
    __tablename__ = "identities"

    id = Column(SmallInteger, primary_key=True)
    name = Column(String(100), nullable=False)

    # 關聯
    studentAcademicRecords = relationship("StudentAcademicRecord", back_populates="identityRef")


class StudyingStatus(Base):
    """學籍狀態表"""
    __tablename__ = "studying_statuses"

    id = Column(SmallInteger, primary_key=True)
    name = Column(String(50))

    # 關聯
    studentAcademicRecords = relationship("StudentAcademicRecord", back_populates="studyingStatusRef")


class SchoolIdentity(Base):
    """學校身份表"""
    __tablename__ = "school_identities"

    id = Column(SmallInteger, primary_key=True)
    name = Column(String(50))

    # 關聯
    studentAcademicRecords = relationship("StudentAcademicRecord", back_populates="schoolIdentityRef")


class Academy(Base):
    """學院表"""
    __tablename__ = "academies"

    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True)
    name = Column(String(100), nullable=False)

    # 關聯
    studentAcademicRecords = relationship("StudentAcademicRecord", back_populates="academy")


class Department(Base):
    """系所表"""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True)
    name = Column(String(100), nullable=False)

    # 關聯
    studentAcademicRecords = relationship("StudentAcademicRecord", back_populates="department")


class EnrollType(Base):
    """入學管道表"""
    __tablename__ = "enroll_types"

    degreeId = Column(SmallInteger, ForeignKey("degrees.id"), primary_key=True)
    code = Column(SmallInteger, primary_key=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=False)

    # 關聯
    degree = relationship("Degree", back_populates="enrollTypes")
    studentAcademicRecords = relationship("StudentAcademicRecord", back_populates="enrollType", overlaps="degreeRef,studentAcademicRecords")

    __table_args__ = (
        UniqueConstraint('degreeId', 'code', name='uq_degree_code'),
        {"sqlite_autoincrement": True}
    )

    def __repr__(self):
        return f"<EnrollType(id={self.id}, name={self.name}, degree={self.degreeId})>"


# === 主要學生資料表 ===

class Student(Base):
    """學生基本資料表"""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)
    stdNo = Column(String(20), unique=True, nullable=False, index=True)  # std_no
    stdCode = Column(String(20))  # std_code
    pid = Column(String(20), unique=True)  # personal ID
    cname = Column(String(50))  # Chinese name
    ename = Column(String(50))  # English name
    sex = Column(String(1))  # M/F
    birthDate = Column(Date)  # birth_date

    # 關聯
    academicRecords = relationship("StudentAcademicRecord", back_populates="student")
    contacts = relationship("StudentContact", back_populates="student", uselist=False)
    termRecords = relationship("StudentTermRecord", back_populates="student")
    applications = relationship("Application", back_populates="studentProfile")

    def __repr__(self):
        return f"<Student(id={self.id}, stdNo={self.stdNo}, cname={self.cname})>"

    @property
    def displayName(self) -> str:
        """Get student display name"""
        return str(self.cname or self.ename or self.stdNo or "")

    @property
    def currentAcademicRecord(self) -> Optional["StudentAcademicRecord"]:
        """Get current academic record"""
        if self.academicRecords:
            return max(self.academicRecords, key=lambda x: x.createdAt)
        return None
    
    def get_student_type(self, academic_record: Optional["StudentAcademicRecord"] = None) -> "StudentType":
        """
        Get student type based on academic record
        
        Note: This method requires academic_record to be passed explicitly
        to avoid lazy loading issues. Use scholarship_service for proper async handling.
        """
        if not academic_record:
            #TODO 用學號判斷學生類型
            # 先回傳學士
            return StudentType.UNDERGRADUATE
        
        if academic_record.degree == 1:
            return StudentType.PHD
        elif academic_record.degree == 2:
            return StudentType.MASTER
        else:
            return StudentType.UNDERGRADUATE


class StudentAcademicRecord(Base):
    """學生學籍資料"""
    __tablename__ = "student_academic_records"

    id = Column(Integer, primary_key=True)
    studentId = Column(Integer, ForeignKey("students.id"))
    degree = Column(SmallInteger, ForeignKey("degrees.id"))
    identity = Column(SmallInteger, ForeignKey("identities.id"))
    studyingStatus = Column(SmallInteger, ForeignKey("studying_statuses.id"))
    schoolIdentity = Column(SmallInteger, ForeignKey("school_identities.id"))
    termCount = Column(SmallInteger)
    depId = Column(Integer, ForeignKey("departments.id"))
    academyId = Column(Integer, ForeignKey("academies.id"))
    enrollTypeCode = Column(SmallInteger)
    enrollYear = Column(SmallInteger)
    enrollTerm = Column(SmallInteger)
    highestSchoolName = Column(String(100))
    nationality = Column(SmallInteger)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 關聯
    student = relationship("Student", back_populates="academicRecords")
    degreeRef = relationship("Degree", overlaps="enrollType,studentAcademicRecords")
    identityRef = relationship("Identity")
    studyingStatusRef = relationship("StudyingStatus")
    schoolIdentityRef = relationship("SchoolIdentity")
    department = relationship("Department")
    academy = relationship("Academy")
    enrollType = relationship(
        "EnrollType",
        foreign_keys=[enrollTypeCode, degree],
        primaryjoin="and_(StudentAcademicRecord.enrollTypeCode == EnrollType.code, StudentAcademicRecord.degree == EnrollType.degreeId)",
        overlaps="degreeRef,studentAcademicRecords"
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ['enrollTypeCode', 'degree'],
            ['enroll_types.code', 'enroll_types.degreeId']
        ),
    )

    def __repr__(self):
        return f"<StudentAcademicRecord(id={self.id}, studentId={self.studentId})>" 


class StudentContact(Base):
    """學生聯絡資料表"""
    __tablename__ = "student_contacts"

    studentId = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    cellphone = Column(String(20))
    email = Column(String(100))
    zipCode = Column(String(10))
    address = Column(Text)

    # 關聯
    student = relationship("Student", back_populates="contacts")

    def __repr__(self):
        return f"<StudentContact(studentId={self.studentId}, email={self.email})>"


# === 學期成績記錄 ===
class StudentTermRecord(Base):
    """Student term academic record"""
    __tablename__ = "student_term_records"

    id = Column(Integer, primary_key=True, index=True)
    studentId = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # 學期資訊
    academicYear = Column(String(10), nullable=False)  # trm_year
    semester = Column(String(10), nullable=False)  # trm_term
    studyStatus = Column(String(10), default="1")  # trm_studystatus
    
    # 學期成績資訊
    averageScore = Column(String(10))  # trm_ascore
    gpa = Column(String(10))  # trm_ascore_gpa
    
    # 學系排名資訊
    classRankingPercent = Column(String(10))  # trm_placingsrate
    deptRankingPercent = Column(String(10))  # trm_depplacingrate
    depId = Column(Integer, ForeignKey("departments.id"))
    academyId = Column(Integer, ForeignKey("academies.id"))

    # 累積成績資訊
    totalAverageScore = Column(String(10))  # trm_ascore_total
    totalGpa = Column(String(10))  # trm_ascore_total_gpa
    
    # 修習統計
    completedTerms = Column(Integer)  # trm_termcount
    
    # 時間戳記
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯
    student = relationship("Student")

    def __repr__(self):
        return f"<StudentTermRecord(studentId={self.studentId}, year={self.academicYear}, term={self.semester})>"


# === Enum 類別定義 ===
class StudentType(enum.Enum):
    """Student type enum"""
    UNDERGRADUATE = "undergraduate"  # 學士
    MASTER = "master"  # 碩士
    PHD = "phd"  # 博士


class StudyStatus(enum.Enum):
    """Study status enum"""
    ACTIVE = "1"     # 在學
    EXTENDED = "2"   # 延畢
    LEAVE = "3"      # 休學
    DROPOUT = "4"    # 退學
    TRANSFER = "5"   # 轉學離校
    DEATH = "9"      # 死亡
    GRADUATE = "10"  # 畢業
    INCOMPLETE = "11" # 修業未畢 