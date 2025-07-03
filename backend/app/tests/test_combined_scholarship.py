"""
Test combined scholarship functionality
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.scholarship import ScholarshipType, ScholarshipCategory, ScholarshipSubType
from app.services.scholarship_service import ScholarshipService
from app.schemas.scholarship import CombinedScholarshipCreate
from decimal import Decimal

@pytest.mark.asyncio
class TestCombinedScholarship:
    
    async def test_create_combined_doctoral_scholarship(self, db_session: AsyncSession):
        """Test creating a combined doctoral scholarship"""
        service = ScholarshipService(db_session)
        
        data = CombinedScholarshipCreate(
            name="博士生獎學金",
            name_en="Doctoral Scholarship",
            description="國科會與教育部聯合博士獎學金",
            description_en="Combined MOST and MOE Doctoral Scholarship",
            category=ScholarshipCategory.DOCTORAL,
            sub_scholarships=[
                {
                    "code": "test_most",
                    "name": "測試國科會獎學金",
                    "sub_type": "most",
                    "amount": 40000,
                    "min_gpa": 3.7
                },
                {
                    "code": "test_moe",
                    "name": "測試教育部獎學金",
                    "sub_type": "moe",
                    "amount": 35000,
                    "min_gpa": 3.5
                }
            ]
        )
        
        scholarship = await service.create_combined_doctoral_scholarship(data)
        
        assert scholarship is not None
        assert scholarship.is_combined is True
        assert scholarship.category == ScholarshipCategory.DOCTORAL.value
        
        # Verify sub-scholarships were created
        sub_scholarships = await service.get_scholarship_with_sub_types(scholarship.id)
        assert len(sub_scholarships.sub_scholarships) == 2
        
        most_scholarship = next(s for s in sub_scholarships.sub_scholarships if s.sub_type == "most")
        moe_scholarship = next(s for s in sub_scholarships.sub_scholarships if s.sub_type == "moe")
        
        assert most_scholarship.amount == Decimal("40000")
        assert moe_scholarship.amount == Decimal("35000")
    
    async def test_validate_sub_scholarship_application(self, db_session: AsyncSession):
        """Test validating sub-scholarship belongs to parent"""
        service = ScholarshipService(db_session)
        
        # Create test data first
        data = CombinedScholarshipCreate(
            name="Test Combined",
            name_en="Test Combined",
            description="Test",
            description_en="Test",
            category=ScholarshipCategory.DOCTORAL,
            sub_scholarships=[
                {
                    "code": "test_sub1",
                    "name": "Test Sub 1",
                    "sub_type": "most",
                    "amount": 30000
                }
            ]
        )
        
        parent = await service.create_combined_doctoral_scholarship(data)
        sub_scholarships = await service.get_scholarship_with_sub_types(parent.id)
        sub_id = sub_scholarships.sub_scholarships[0].id
        
        # Test valid relationship
        is_valid = await service.validate_sub_scholarship_application(parent.id, sub_id)
        assert is_valid is True
        
        # Test invalid relationship
        is_valid = await service.validate_sub_scholarship_application(parent.id, 99999)
        assert is_valid is False
    
    async def test_get_eligible_combined_scholarships(self, db_session: AsyncSession, test_student):
        """Test that combined scholarships appear in eligible list"""
        service = ScholarshipService(db_session)
        
        # Create a combined scholarship
        data = CombinedScholarshipCreate(
            name="Eligible Combined",
            name_en="Eligible Combined",
            description="Test",
            description_en="Test",
            category=ScholarshipCategory.DOCTORAL,
            sub_scholarships=[
                {
                    "code": "eligible_sub",
                    "name": "Eligible Sub",
                    "sub_type": "general",
                    "amount": 25000
                }
            ]
        )
        
        await service.create_combined_doctoral_scholarship(data)
        
        # Get eligible scholarships
        eligible = await service.get_eligible_scholarships(test_student)
        
        # Should include the parent scholarship (not sub-scholarships)
        combined_scholarships = [s for s in eligible if s.is_combined]
        assert len(combined_scholarships) > 0
        
        # Verify sub-scholarships are not directly listed
        sub_scholarships = [s for s in eligible if s.parent_scholarship_id is not None]
        assert len(sub_scholarships) == 0