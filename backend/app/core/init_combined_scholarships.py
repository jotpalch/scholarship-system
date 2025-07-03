"""
Initialize combined doctoral scholarships
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.scholarship import ScholarshipType, ScholarshipStatus, ScholarshipCategory, ScholarshipSubType
from app.services.scholarship_service import ScholarshipService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_combined_doctoral_scholarship(db: AsyncSession):
    """Create the combined MOST + MOE doctoral scholarship"""
    try:
        # Check if already exists
        from sqlalchemy import select
        stmt = select(ScholarshipType).where(ScholarshipType.code == "doctoral_combined")
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            logger.info("Combined doctoral scholarship already exists")
            return existing
        
        # Create parent scholarship
        now = datetime.now(timezone.utc)
        parent_scholarship = ScholarshipType(
            code="doctoral_combined",
            name="博士生獎學金",
            name_en="Doctoral Scholarship",
            description="國科會與教育部聯合博士生獎學金計畫，旨在支持優秀博士生進行學術研究",
            description_en="Combined MOST and MOE doctoral scholarship program to support outstanding PhD students in academic research",
            category=ScholarshipCategory.DOCTORAL.value,
            sub_type=ScholarshipSubType.GENERAL.value,
            is_combined=True,
            amount=Decimal("0"),  # 總金額由子獎學金決定
            currency="TWD",
            eligible_student_types=["phd", "direct_phd"],
            status=ScholarshipStatus.ACTIVE.value,
            application_start_date=now,
            application_end_date=now + timedelta(days=90),
            requires_professor_recommendation=True,
            requires_research_proposal=True,
            max_applications_per_year=1
        )
        
        db.add(parent_scholarship)
        await db.flush()
        
        # Create MOST sub-scholarship
        most_scholarship = ScholarshipType(
            code="doctoral_most",
            name="國科會博士生獎學金",
            name_en="MOST Doctoral Scholarship",
            description="國科會提供的博士生研究獎學金，支持從事科學研究的博士生",
            description_en="Doctoral research scholarship provided by MOST for PhD students engaged in scientific research",
            category=ScholarshipCategory.DOCTORAL.value,
            sub_type=ScholarshipSubType.MOST.value,
            is_combined=False,
            parent_scholarship_id=parent_scholarship.id,
            amount=Decimal("40000"),
            currency="TWD",
            min_gpa=Decimal("3.7"),
            max_ranking_percent=Decimal("20"),
            required_documents=["transcript", "research_proposal", "recommendation_letter", "research_plan"],
            eligible_student_types=["phd", "direct_phd"],
            status=ScholarshipStatus.ACTIVE.value,
            application_start_date=now,
            application_end_date=now + timedelta(days=90),
            requires_professor_recommendation=True,
            requires_research_proposal=True,
            max_applications_per_year=1,
            whitelist_enabled=False
        )
        
        # Create MOE sub-scholarship
        moe_scholarship = ScholarshipType(
            code="doctoral_moe",
            name="教育部博士生獎學金",
            name_en="MOE Doctoral Scholarship",
            description="教育部提供的博士生學術獎學金，支持各領域優秀博士生",
            description_en="Doctoral academic scholarship provided by MOE for outstanding PhD students in all fields",
            category=ScholarshipCategory.DOCTORAL.value,
            sub_type=ScholarshipSubType.MOE.value,
            is_combined=False,
            parent_scholarship_id=parent_scholarship.id,
            amount=Decimal("35000"),
            currency="TWD",
            min_gpa=Decimal("3.5"),
            max_ranking_percent=Decimal("30"),
            required_documents=["transcript", "research_proposal", "personal_statement"],
            eligible_student_types=["phd", "direct_phd"],
            status=ScholarshipStatus.ACTIVE.value,
            application_start_date=now,
            application_end_date=now + timedelta(days=90),
            requires_professor_recommendation=True,
            requires_research_proposal=True,
            max_applications_per_year=1,
            whitelist_enabled=False
        )
        
        db.add(most_scholarship)
        db.add(moe_scholarship)
        
        await db.commit()
        logger.info("Successfully created combined doctoral scholarship with MOST and MOE sub-types")
        
        return parent_scholarship
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating combined scholarship: {e}")
        raise

async def main():
    """Main function to initialize combined scholarships"""
    async with AsyncSessionLocal() as db:
        try:
            scholarship = await create_combined_doctoral_scholarship(db)
            logger.info(f"Initialization complete. Created scholarship ID: {scholarship.id}")
        except Exception as e:
            logger.error(f"Failed to initialize combined scholarships: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(main())