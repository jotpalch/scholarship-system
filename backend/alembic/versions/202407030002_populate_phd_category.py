from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "202407030002"
down_revision = "202407030001"
branch_labels = None
depends_on = None


CATEGORY_NAME_ZH = "博士獎學金"
CATEGORY_NAME_EN = "PhD Scholarship"


SUB_TYPE_MAPPING = {
    "phd_nstc": "nsc_phd",
    "phd_moe": "moe_phd",
}


def upgrade():
    """Populate scholarship_categories and migrate existing PhD scholarships"""
    bind = op.get_bind()

    # 1. Insert category if not exists
    result = bind.execute(
        sa.text("SELECT id FROM scholarship_categories WHERE name = :name"),
        {"name": CATEGORY_NAME_ZH},
    )
    row = result.first()
    if row:
        category_id = row[0]
    else:
        res = bind.execute(
            sa.text(
                """
                INSERT INTO scholarship_categories (name, name_en, description, description_en, created_at, updated_at)
                VALUES (:name, :name_en, NULL, NULL, NOW(), NOW())
                RETURNING id
                """
            ),
            {"name": CATEGORY_NAME_ZH, "name_en": CATEGORY_NAME_EN},
        )
        category_id = res.scalar_one()

    # 2. Update scholarship_types rows
    for code, sub_type in SUB_TYPE_MAPPING.items():
        bind.execute(
            sa.text(
                """
                UPDATE scholarship_types
                SET category_id = :category_id, sub_type = :sub_type
                WHERE code = :code
                """
            ),
            {"category_id": category_id, "sub_type": sub_type, "code": code},
        )



def downgrade():
    """Revert data migration changes"""
    bind = op.get_bind()

    # Reset scholarship_types sub_type & category_id
    bind.execute(
        sa.text(
            "UPDATE scholarship_types SET category_id = NULL, sub_type = NULL WHERE code IN :codes"
        ),
        {"codes": tuple(SUB_TYPE_MAPPING.keys())},
    )

    # Delete category row
    bind.execute(
        sa.text("DELETE FROM scholarship_categories WHERE name = :name"),
        {"name": CATEGORY_NAME_ZH},
    )