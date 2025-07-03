"""
Database initialization script for scholarship system
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date, timezone, timedelta

from app.db.session import async_engine, AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.student import (
    # 查詢表
    Degree, Identity, StudyingStatus, SchoolIdentity, Academy, Department, EnrollType,
    # 學生資料
    Student, StudentAcademicRecord, StudentContact, StudentTermRecord,
    # Enum
    StudentType, StudyStatus
)
from app.core.security import get_password_hash
from app.db.base_class import Base
from app.models.scholarship import ScholarshipType, ScholarshipStatus, ScholarshipCategory, ScholarshipSubType
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.core.config import settings
from app.services.scholarship_service import ScholarshipService
from app.schemas.scholarship import CombinedScholarshipCreate


async def initLookupTables(session: AsyncSession) -> None:
    """Initialize lookup tables with base data"""
    
    print("📚 Initializing lookup tables...")
    
    # === 學位 ===
    degrees_data = [
        {"id": 1, "name": "學士"},
        {"id": 2, "name": "碩士"},
        {"id": 3, "name": "博士"}
    ]
    
    for degree_data in degrees_data:
        result = await session.execute(select(Degree).where(Degree.id == degree_data["id"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            degree = Degree(**degree_data)
            session.add(degree)
    
    # === 學生身份 ===
    identities_data = [
        {"id": 1, "name": "一般生"},
        {"id": 2, "name": "原住民"},
        {"id": 3, "name": "僑生(目前有中華民國國籍生)"},
        {"id": 4, "name": "外籍生(目前有中華民國國籍生)"},
        {"id": 5, "name": "外交子女"},
        {"id": 6, "name": "身心障礙生"},
        {"id": 7, "name": "運動成績優良甄試學生"},
        {"id": 8, "name": "離島"},
        {"id": 9, "name": "退伍軍人"},
        {"id": 10, "name": "一般公費生"},
        {"id": 11, "name": "原住民公費生"},
        {"id": 12, "name": "離島公費生"},
        {"id": 13, "name": "退伍軍人公費生"},
        {"id": 14, "name": "願景計畫生"},
        {"id": 17, "name": "陸生"},
        {"id": 30, "name": "其他"}
    ]
    
    for identity_data in identities_data:
        result = await session.execute(select(Identity).where(Identity.id == identity_data["id"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            identity = Identity(**identity_data)
            session.add(identity)
    
    # === 學籍狀態 ===
    studying_statuses_data = [
        {"id": 1, "name": "在學"},
        {"id": 2, "name": "延畢"},
        {"id": 3, "name": "休學"},
        {"id": 4, "name": "退學"},
        {"id": 5, "name": "轉學離校"},
        {"id": 6, "name": "轉系離校"},
        {"id": 7, "name": "雙主修離校"},
        {"id": 8, "name": "輔系離校"},
        {"id": 9, "name": "死亡"},
        {"id": 10, "name": "畢業"},
        {"id": 11, "name": "修業未畢"}
    ]
    
    for status_data in studying_statuses_data:
        result = await session.execute(select(StudyingStatus).where(StudyingStatus.id == status_data["id"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            status = StudyingStatus(**status_data)
            session.add(status)
    
    # === 學校身份 ===
    school_identities_data = [
        {"id": 1, "name": "正取生"},
        {"id": 2, "name": "備取生"},
        {"id": 3, "name": "境外學生"},
        {"id": 4, "name": "外籍學生"},
        {"id": 5, "name": "在職專班"},
        {"id": 6, "name": "交換學生"},
        {"id": 7, "name": "雙聯學位"},
        {"id": 8, "name": "專業碩士"}
    ]
    
    for school_identity_data in school_identities_data:
        result = await session.execute(select(SchoolIdentity).where(SchoolIdentity.id == school_identity_data["id"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            school_identity = SchoolIdentity(**school_identity_data)
            session.add(school_identity)
    
    # === 學院 ===
    academies_data = [
        {"id": 1, "code": "EE", "name": "電機資訊學院"},
        {"id": 2, "code": "EN", "name": "工程學院"},
        {"id": 3, "code": "SC", "name": "理學院"},
        {"id": 4, "code": "LS", "name": "生科學院"},
        {"id": 5, "code": "HS", "name": "人社學院"},
        {"id": 6, "code": "MG", "name": "管理學院"},
        {"id": 7, "code": "HK", "name": "客家文化學院"},
        {"id": 8, "code": "IP", "name": "國際半導體產業學院"}
    ]
    
    for academy_data in academies_data:
        result = await session.execute(select(Academy).where(Academy.id == academy_data["id"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            academy = Academy(**academy_data)
            session.add(academy)
    
    # === 系所 ===
    departments_data = [
        {"id": 1, "code": "CS", "name": "資訊工程學系"},
        {"id": 2, "code": "ECE", "name": "電機工程學系"},
        {"id": 3, "code": "EE", "name": "電子工程學系"},
        {"id": 4, "code": "COMM", "name": "傳播與科技學系"},
        {"id": 5, "code": "CE", "name": "土木工程學系"},
        {"id": 6, "code": "CHE", "name": "化學工程學系"},
        {"id": 7, "code": "ME", "name": "機械工程學系"},
        {"id": 8, "code": "MSE", "name": "材料科學與工程學系"},
        {"id": 9, "code": "PHYS", "name": "物理學系"},
        {"id": 10, "code": "MATH", "name": "應用數學系"},
        {"id": 11, "code": "CHEM", "name": "應用化學系"},
        {"id": 12, "code": "LS", "name": "生命科學系"},
        {"id": 13, "code": "BIO", "name": "生物科技學系"},
        {"id": 14, "code": "FL", "name": "外國語文學系"},
        {"id": 15, "code": "ECON", "name": "經濟學系"},
        {"id": 16, "code": "MGMT", "name": "管理科學系"}
    ]
    
    for dept_data in departments_data:
        result = await session.execute(select(Department).where(Department.id == dept_data["id"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            department = Department(**dept_data)
            session.add(department)
    
    # === 入學管道 ===
    enroll_types_data = [
        # 博士班入學管道
        {"code": "1", "name": "招生考試一般生", "degreeId": 3},
        {"code": "2", "name": "招生考試在職生(目前有一般生)", "degreeId": 3},
        {"code": "3", "name": "選讀生", "degreeId": 3},
        {"code": "4", "name": "推甄一般生", "degreeId": 3},
        {"code": "5", "name": "推甄在職生(目前有一般生)", "degreeId": 3},
        {"code": "6", "name": "僑生", "degreeId": 3},
        {"code": "7", "name": "外籍生", "degreeId": 3},
        {"code": "8", "name": "大學逕博", "degreeId": 3},
        {"code": "9", "name": "碩士逕博", "degreeId": 3},
        {"code": "10", "name": "跨校學士逕博", "degreeId": 3},
        {"code": "11", "name": "跨校碩士逕博", "degreeId": 3},
        {"code": "12", "name": "雙聯學位", "degreeId": 3},
        {"code": "17", "name": "陸生", "degreeId": 3},
        {"code": "18", "name": "轉校", "degreeId": 3},
        {"code": "26", "name": "專案入學", "degreeId": 3},
        {"code": "29", "name": "TIGP", "degreeId": 3},
        {"code": "30", "name": "其他", "degreeId": 3},
        
        # 碩士班入學管道
        {"code": "M1", "name": "一般考試", "degreeId": 2},
        {"code": "M2", "name": "推薦甄選", "degreeId": 2},
        {"code": "M3", "name": "在職專班", "degreeId": 2},
        {"code": "M4", "name": "僑生", "degreeId": 2},
        {"code": "M5", "name": "外籍生", "degreeId": 2},
        
        # 學士班入學管道
        {"code": "B1", "name": "大學個人申請", "degreeId": 1},
        {"code": "B2", "name": "大學考試分發", "degreeId": 1},
        {"code": "B3", "name": "四技二專甄選", "degreeId": 1},
        {"code": "B4", "name": "運動績優", "degreeId": 1},
        {"code": "B5", "name": "僑生", "degreeId": 1},
        {"code": "B6", "name": "外籍生", "degreeId": 1}
    ]
    
    for enroll_type_data in enroll_types_data:
        result = await session.execute(
            select(EnrollType).where(
                EnrollType.code == enroll_type_data["code"],
                EnrollType.degreeId == enroll_type_data["degreeId"]
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            enroll_type = EnrollType(**enroll_type_data)
            session.add(enroll_type)
    
    await session.commit()
    print("✅ Lookup tables initialized successfully!")


async def createTestUsers(session: AsyncSession) -> list[User]:
    """Create test users"""
    
    print("👥 Creating test users...")
    
    test_users_data = [
        {
            "username": "admin",
            "email": "admin@nycu.edu.tw",
            "password": "admin123",
            "fullName": "系統管理員",
            "chineseName": "系統管理員",
            "englishName": "System Administrator",
            "role": UserRole.ADMIN
        },
        {
            "username": "super_admin",
            "email": "super_admin@nycu.edu.tw",
            "password": "super123",
            "fullName": "超級管理員",
            "chineseName": "超級管理員", 
            "englishName": "Super Administrator",
            "role": UserRole.SUPER_ADMIN
        },
        {
            "username": "professor",
            "email": "professor@nycu.edu.tw",
            "password": "professor123",
            "fullName": "李教授",
            "chineseName": "李教授",
            "englishName": "Professor Li",
            "role": UserRole.PROFESSOR
        },
        {
            "username": "college",
            "email": "college@nycu.edu.tw",
            "password": "college123",
            "fullName": "學院審核員",
            "chineseName": "學院審核員",
            "englishName": "College Reviewer",
            "role": UserRole.COLLEGE
        },
        {
            "username": "stu_under",
            "email": "stu_under@nycu.edu.tw",
            "password": "stuunder123",
            "fullName": "陳小明",
            "chineseName": "陳小明",
            "englishName": "Chen Xiao Ming",
            "role": UserRole.STUDENT
        },
        {
            "username": "stu_phd",
            "email": "stu_phd@nycu.edu.tw",
            "password": "stuphd123",
            "fullName": "王博士",
            "chineseName": "王博士",
            "englishName": "Wang PhD",
            "role": UserRole.STUDENT
        },
        {
            "username": "stu_direct",
            "email": "stu_direct@nycu.edu.tw",
            "password": "studirect123",
            "fullName": "李逕升",
            "chineseName": "李逕升",
            "englishName": "Li Direct",
            "role": UserRole.STUDENT
        },
        {
            "username": "stu_master",
            "email": "stu_master@nycu.edu.tw",
            "password": "stumaster123",
            "fullName": "張碩士",
            "chineseName": "張碩士",
            "englishName": "Zhang Master",
            "role": UserRole.STUDENT
        }
    ]
    
    created_users = []
    
    for user_data in test_users_data:
        # Check if user exists
        result = await session.execute(select(User).where(User.username == user_data["username"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            # Set student_no for student users
            student_no = None
            if user_data["role"] == UserRole.STUDENT:
                if user_data["username"] == "stu_under":
                    student_no = "U1120001"
                elif user_data["username"] == "stu_phd":
                    student_no = "P1120001"
                elif user_data["username"] == "stu_direct":
                    student_no = "D1120001"
                elif user_data["username"] == "stu_master":
                    student_no = "M1120001"
            
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"]),
                full_name=user_data["fullName"],
                chinese_name=user_data["chineseName"],
                english_name=user_data["englishName"],
                role=user_data["role"],
                student_no=student_no,
                is_active=True,
                is_verified=True
            )
            session.add(user)
            created_users.append(user)
    
    await session.commit()
    
    # Refresh to get IDs
    for user in created_users:
        await session.refresh(user)
    
    print(f"✅ Created {len(created_users)} test users")
    return created_users


async def createTestStudents(session: AsyncSession, users: list[User]) -> None:
    """Create test student data with new normalized structure"""
    
    print("🎓 Creating test student data...")
    
    student_users = [user for user in users if user.role == UserRole.STUDENT]
    
    for user in student_users:
        # 建立學生基本資料
        if user.username == "stu_under":
            student = Student(
                stdNo="U1120001",
                stdCode="U1120001",
                pid="A123456789",
                cname=user.chinese_name,
                ename=user.english_name,
                sex="M",
                birthDate=date(2000, 5, 15)
            )
        elif user.username == "stu_phd":
            student = Student(
                stdNo="P1120001",
                stdCode="P1120001",
                pid="B123456789",
                cname=user.chinese_name,
                ename=user.english_name,
                sex="M",
                birthDate=date(1995, 8, 20)
            )
        elif user.username == "stu_direct":
            student = Student(
                stdNo="D1120001",
                stdCode="D1120001",
                pid="C123456789",
                cname=user.chinese_name,
                ename=user.english_name,
                sex="F",
                birthDate=date(1998, 3, 10)
            )
        elif user.username == "stu_master":
            student = Student(
                stdNo="M1120001",
                stdCode="M1120001",
                pid="D123456789",
                cname=user.chinese_name,
                ename=user.english_name,
                sex="F",
                birthDate=date(1997, 12, 5)
            )
        else:
            continue
            
        session.add(student)
        await session.commit()
        await session.refresh(student)
        
        # 建立學籍資料
        if user.username == "stu_under":
            academic_record = StudentAcademicRecord(
                studentId=student.id,
                degree=1,  # 學士
                studyingStatus=1,  # 在學
                schoolIdentity=1,  # 正取生
                termCount=2,
                depId=1,  # 資訊工程學系
                academyId=1,  # 電機資訊學院
                enrollTypeId=1,  # 大學個人申請 (需要先查詢ID)
                enrollYear=112,
                enrollTerm=1,
                highestSchoolName="台北市立建國高級中學",
                nationality=1,  # 中華民國
                createdAt=datetime.now()
            )
        elif user.username == "stu_phd":
            academic_record = StudentAcademicRecord(
                studentId=student.id,
                degree=3,  # 博士
                studyingStatus=1,  # 在學
                schoolIdentity=1,  # 正取生
                termCount=1,
                depId=1,  # 資訊工程學系
                academyId=1,  # 電機資訊學院
                enrollTypeId=1,  # 招生考試一般生 (需要先查詢ID)
                enrollYear=112,
                enrollTerm=1,
                highestSchoolName="國立交通大學",
                nationality=1,  # 中華民國
                createdAt=datetime.now()
            )
        elif user.username == "stu_direct":
            academic_record = StudentAcademicRecord(
                studentId=student.id,
                degree=3,  # 博士
                studyingStatus=1,  # 在學
                schoolIdentity=1,  # 正取生
                termCount=1,
                depId=1,  # 資訊工程學系
                academyId=1,  # 電機資訊學院
                enrollTypeId=8,  # 大學逕博 (需要先查詢ID)
                enrollYear=112,
                enrollTerm=1,
                highestSchoolName="國立陽明交通大學",
                nationality=1,  # 中華民國
                createdAt=datetime.now()
            )
        elif user.username == "stu_master":
            academic_record = StudentAcademicRecord(
                studentId=student.id,
                degree=2,  # 碩士
                studyingStatus=1,  # 在學
                schoolIdentity=1,  # 正取生
                termCount=1,
                depId=1,  # 資訊工程學系
                academyId=1,  # 電機資訊學院
                enrollTypeId=19,  # 一般考試 (需要先查詢ID)
                enrollYear=112,
                enrollTerm=1,
                highestSchoolName="國立台灣大學",
                nationality=1,  # 中華民國
                createdAt=datetime.now()
            )
        
        session.add(academic_record)
        
        # 建立聯絡資料
        contact = StudentContact(
            studentId=student.id,
            cellphone="0912345678",
            email=user.email,
            zipCode="30010",
            address="新竹市東區大學路1001號"
        )
        session.add(contact)
        
        # 建立成績記錄
        if user.username == "stu_under":
            term_record = StudentTermRecord(
                studentId=student.id,
                academicYear="112",
                semester="1",
                studyStatus="1",
                averageScore="85.5",
                gpa="3.5",
                semesterGpa="3.5",
                classRankingPercent="20.0",
                deptRankingPercent="25.0",
                completedTerms=2
            )
        elif user.username == "stu_phd":
            term_record = StudentTermRecord(
                studentId=student.id,
                academicYear="112",
                semester="1",
                studyStatus="1",
                averageScore="88.0",
                gpa="3.6",
                semesterGpa="3.6",
                classRankingPercent="15.0",
                deptRankingPercent="20.0",
                completedTerms=1
            )
        elif user.username == "stu_direct":
            term_record = StudentTermRecord(
                studentId=student.id,
                academicYear="112",
                semester="1",
                studyStatus="1",
                averageScore="90.0",
                gpa="3.8",
                semesterGpa="3.8",
                classRankingPercent="10.0",
                deptRankingPercent="15.0",
                completedTerms=1
            )
        elif user.username == "stu_master":
            term_record = StudentTermRecord(
                studentId=student.id,
                academicYear="112",
                semester="1",
                studyStatus="1",
                averageScore="87.0",
                gpa="3.55",
                semesterGpa="3.55",
                classRankingPercent="18.0",
                deptRankingPercent="22.0",
                completedTerms=1
            )
        
        session.add(term_record)
        await session.commit()
    
    print("✅ Test student data created successfully!")


async def createTestScholarships(session: AsyncSession) -> None:
    """Create test scholarship data with dev-friendly settings, including combined doctoral scholarship"""
    
    print("🎓 Creating test scholarship data...")
    
    # 獲取學生ID用於白名單
    result = await session.execute(select(User).where(User.role == UserRole.STUDENT))
    student_users = result.scalars().all()
    
    # 獲取對應的學生資料
    student_ids = []
    for user in student_users:
        result = await session.execute(select(Student).where(Student.stdNo == user.student_no))
        student = result.scalar_one_or_none()
        if student:
            student_ids.append(student.id)
    
    # 開發模式下設定申請期間（當前時間前後各30天）
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=30)
    end_date = now + timedelta(days=30)
    
    # ==== 基本獎學金 (非合併) ====
    scholarships_data = [
        {
            "code": "undergraduate_freshman",
            "name": "學士班新生獎學金",
            "name_en": "Undergraduate Freshman Scholarship",
            "description": "適用於學士班新生，需符合 GPA ≥ 3.38 或前35%排名",
            "description_en": "For undergraduate freshmen, requires GPA ≥ 3.38 or top 35% ranking",
            "category": ScholarshipCategory.UNDERGRADUATE.value,
            "sub_type": ScholarshipSubType.GENERAL.value,
            "is_combined": False,
            "amount": 50000.00,
            "currency": "TWD",
            "eligible_student_types": ["undergraduate"],
            "min_gpa": 3.38,
            "max_ranking_percent": 35.0,
            "max_completed_terms": 6,
            "required_documents": ["transcript", "bank_account"],
            "whitelist_enabled": not settings.debug,  # 開發模式下關閉白名單
            "whitelist_student_ids": student_ids if not settings.debug else [],
            "application_start_date": start_date,
            "application_end_date": end_date,
            "status": ScholarshipStatus.ACTIVE.value,
            "requires_professor_recommendation": False,
            "requires_research_proposal": False,
        },
        {
            "code": "direct_phd",
            "name": "逕升博士獎學金",
            "name_en": "Direct PhD Scholarship",
            "description": "適用於逕升博士班學生，需完整研究計畫",
            "description_en": "For direct PhD students, requires complete research plan",
            "category": ScholarshipCategory.DOCTORAL.value,
            "sub_type": ScholarshipSubType.GENERAL.value,
            "is_combined": False,
            "amount": 150000.00,
            "currency": "TWD",
            "eligible_student_types": ["direct_phd"],
            "min_gpa": 3.5,
            "max_completed_terms": 2,
            "required_documents": ["transcript", "research_proposal", "budget_plan", "bank_account"],
            "whitelist_enabled": False,
            "whitelist_student_ids": [],
            "application_start_date": start_date,
            "application_end_date": end_date,
            "status": ScholarshipStatus.ACTIVE.value,
            "requires_professor_recommendation": True,
            "requires_research_proposal": True,
        }
    ]
    
    for scholarship_data in scholarships_data:
        # Check if scholarship already exists
        result = await session.execute(
            select(ScholarshipType).where(ScholarshipType.code == scholarship_data["code"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            scholarship = ScholarshipType(**scholarship_data)
            session.add(scholarship)
        else:
            # 更新現有的獎學金資料
            for key, value in scholarship_data.items():
                setattr(existing, key, value)
    
    # ==== 合併博士獎學金 ====
    service = ScholarshipService(session)
    combined_data = CombinedScholarshipCreate(
        name="博士生獎學金",
        name_en="Doctoral Scholarship",
        description="國科會與教育部聯合博士生獎學金",
        description_en="Combined MOST and MOE doctoral scholarship",
        category=ScholarshipCategory.DOCTORAL,
        sub_scholarships=[
            {
                "code": "doctoral_most",
                "name": "國科會博士生獎學金",
                "name_en": "MOST Doctoral Scholarship",
                "description": "國科會博士生研究獎學金",
                "description_en": "MOST PhD scholarship",
                "sub_type": "most",
                "amount": 40000,
                "min_gpa": 3.7,
                "max_ranking_percent": 20,
                "required_documents": ["transcript", "research_proposal", "recommendation_letter"],
                "application_start_date": start_date,
                "application_end_date": end_date
            },
            {
                "code": "doctoral_moe",
                "name": "教育部博士生獎學金",
                "name_en": "MOE Doctoral Scholarship",
                "description": "教育部博士生學術獎學金",
                "description_en": "MOE PhD scholarship",
                "sub_type": "moe",
                "amount": 35000,
                "min_gpa": 3.5,
                "max_ranking_percent": 30,
                "required_documents": ["transcript", "research_proposal"],
                "application_start_date": start_date,
                "application_end_date": end_date
            }
        ]
    )
    
    # 如果尚未建立過，則創建
    result = await session.execute(select(ScholarshipType).where(ScholarshipType.code == "doctoral_combined"))
    existing_parent = result.scalar_one_or_none()
    if not existing_parent:
        await service.create_combined_doctoral_scholarship(combined_data)
    
    await session.commit()
    print("✅ Test scholarship data created successfully!")
    
    if settings.debug:
        print("🔧 DEV MODE: All scholarships are open for application")
        print("🔧 DEV MODE: Whitelist checks are bypassed")


async def createSystemAnnouncements(session: AsyncSession) -> None:
    """Create initial system announcements"""
    
    print("📢 Creating system announcements...")
    
    # 計算公告過期時間（30天後）
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    announcements_data = [
        {
            "user_id": None,  # 系統公告 user_id 為 null
            "title": "獎學金申請系統初始化完成",
            "title_en": "Scholarship Application System Initialization Complete",
            "message": "歡迎使用國立陽明交通大學獎學金申請與簽核作業管理系統！系統已完成初始化，包含測試用戶帳號、獎學金類型等基礎資料。請使用測試帳號登入體驗各項功能。",
            "message_en": "Welcome to NYCU Scholarship Application and Approval Management System! The system has been initialized with test user accounts and scholarship types. Please use the test accounts to explore the features.",
            "notification_type": NotificationType.INFO.value,
            "priority": NotificationPriority.HIGH.value,
            "related_resource_type": "system",
            "related_resource_id": None,
            "action_url": None,
            "is_read": False,
            "is_dismissed": False,
            "send_email": False,
            "email_sent": False,
            "expires_at": expires_at,
            "meta_data": {
                "init_system": True,
                "version": "1.0.0",
                "created_by": "system_init"
            }
        },
        {
            "user_id": None,
            "title": "系統測試帳號說明",
            "title_en": "System Test Accounts Information",
            "message": "系統已建立多個測試帳號供開發測試使用：admin/admin123（管理員）、professor/professor123（教授）、college/college123（學院審核）、stu_under/stuunder123（學士生）、stu_phd/stuphd123（博士生）等。請妥善保管帳號密碼。",
            "message_en": "Test accounts have been created for development: admin/admin123 (Administrator), professor/professor123 (Professor), college/college123 (College Reviewer), stu_under/stuunder123 (Undergraduate), stu_phd/stuphd123 (PhD) etc. Please keep credentials secure.",
            "notification_type": NotificationType.WARNING.value,
            "priority": NotificationPriority.NORMAL.value,
            "related_resource_type": "system",
            "related_resource_id": None,
            "action_url": "/auth/login",
            "is_read": False,
            "is_dismissed": False,
            "send_email": False,
            "email_sent": False,
            "expires_at": expires_at,
            "meta_data": {
                "test_accounts": True,
                "security_notice": True
            }
        },
        {
            "user_id": None,
            "title": "開發模式提醒",
            "title_en": "Development Mode Notice",
            "message": "目前系統運行在開發模式下，所有獎學金申請期間已開放，白名單檢查已停用。正式環境請確保修改相關設定以符合實際需求。",
            "message_en": "The system is currently running in development mode. All scholarship application periods are open and whitelist checks are disabled. Please ensure proper configuration for production environment.",
            "notification_type": NotificationType.WARNING.value,
            "priority": NotificationPriority.HIGH.value,
            "related_resource_type": "system",
            "related_resource_id": None,
            "action_url": None,
            "is_read": False,
            "is_dismissed": False,
            "send_email": False,
            "email_sent": False,
            "expires_at": expires_at,
            "meta_data": {
                "dev_mode": True,
                "config_reminder": True,
                "environment": "development"
            }
        }
    ]
    
    for announcement_data in announcements_data:
        # 檢查是否已存在相同的公告（根據 title 和 meta_data 判斷）
        result = await session.execute(
            select(Notification).where(
                Notification.title == announcement_data["title"],
                Notification.related_resource_type == "system",
                Notification.user_id.is_(None)
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            announcement = Notification(**announcement_data)
            session.add(announcement)
    
    await session.commit()
    print(f"✅ System announcements created successfully!")
    print("📋 System announcements include:")
    print("   - System initialization notice")
    print("   - Test accounts information")
    print("   - Development mode reminder")


async def initDatabase() -> None:
    """Initialize entire database"""
    
    print("🚀 Initializing scholarship system database...")
    
    # Create all tables
    async with async_engine.begin() as conn:
        print("🗄️  Dropping and recreating all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize data
    async with AsyncSessionLocal() as session:
        # Initialize lookup tables
        await initLookupTables(session)
        
        # Create test users
        users = await createTestUsers(session)
        
        # Create test students
        await createTestStudents(session, users)
        
        # Create test scholarships
        await createTestScholarships(session)
        
        # Create system announcements
        await createSystemAnnouncements(session)
    
    print("✅ Database initialization completed successfully!")
    print("\n📋 Test User Accounts:")
    print("- Admin: admin / admin123")
    print("- Super Admin: super_admin / super123")
    print("- Professor: professor / professor123")
    print("- College: college / college123")
    print("- Student (學士): stu_under / stuunder123")
    print("- Student (博士): stu_phd / stuphd123")
    print("- Student (逕升博士): stu_direct / studirect123")
    print("- Student (碩士): stu_master / stumaster123")


if __name__ == "__main__":
    asyncio.run(initDatabase()) 