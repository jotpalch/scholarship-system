from typing import Dict, Any, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.models.student import Student, StudentAcademicRecord
from app.core.exceptions import NotFoundError
from datetime import datetime

class StudentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student_snapshot(self, student: Union[Student, int]) -> Dict[str, Any]:
        """取得學生資料快照，用於申請時保存"""
        
        # If student_id is provided, fetch the student object
        if isinstance(student, int):
            result = await self.db.execute(
                select(Student)
                .options(
                    joinedload(Student.academicRecords),
                    joinedload(Student.contacts),
                    joinedload(Student.termRecords)
                )
                .where(Student.id == student)
            )
            student = result.scalar_one()
        
        # Get current academic record
        current_record = await student.getCurrentAcademicRecord()
        
        # Build snapshot
        snapshot = {
            "id": student.id,
            "stdNo": student.stdNo,
            "stdCode": student.stdCode,
            "pid": student.pid,
            "cname": student.cname,
            "ename": student.ename,
            "sex": student.sex,
            "birthDate": student.birthDate.isoformat() if student.birthDate else None,
            "contacts": {
                "cellphone": student.contacts.cellphone if student.contacts else None,
                "email": student.contacts.email if student.contacts else None,
                "zipCode": student.contacts.zipCode if student.contacts else None,
                "address": student.contacts.address if student.contacts else None
            },
            "academic": {
                "degree": current_record.degree if current_record else None,
                "identity": current_record.identity if current_record else None,
                "studyingStatus": current_record.studyingStatus if current_record else None,
                "schoolIdentity": current_record.schoolIdentity if current_record else None,
                "termCount": current_record.termCount if current_record else None,
                "depId": current_record.depId if current_record else None,
                "academyId": current_record.academyId if current_record else None,
                "enrollTypeCode": current_record.enrollTypeCode if current_record else None,
                "enrollYear": current_record.enrollYear if current_record else None,
                "enrollTerm": current_record.enrollTerm if current_record else None,
                "highestSchoolName": current_record.highestSchoolName if current_record else None,
                "nationality": current_record.nationality if current_record else None
            }
        }
        
        return snapshot

    async def get_student_by_id(self, student_id: int) -> Optional[Student]:
        """根據 ID 取得學生資料"""
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        return result.scalar_one_or_none()

    async def update_student_academic_info(
        self,
        student_id: int,
        academic_info: Dict[str, Any]
    ) -> Student:
        """更新學生學術資訊"""
        student = await self.get_student_by_id(student_id)
        if not student:
            raise NotFoundError(f"Student {student_id} not found")
            
        # 更新學術資訊
        for field, value in academic_info.items():
            if hasattr(student, field):
                setattr(student, field, value)
                
        await self.db.commit()
        await self.db.refresh(student)
        
        return student 