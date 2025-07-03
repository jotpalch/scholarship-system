from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "202407030001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create scholarship_categories table and extend scholarship_types with category_id and sub_type"""
    # 1. Create new enum type for scholarship sub types
    scholarship_sub_type_enum = sa.Enum("nsc_phd", "moe_phd", name="scholarship_sub_type")
    scholarship_sub_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create scholarship_categories table
    op.create_table(
        "scholarship_categories",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("name_en", sa.String(length=200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("name", name="uq_scholarship_categories_name"),
        sa.UniqueConstraint("name_en", name="uq_scholarship_categories_name_en")
    )

    # 3. Add columns to scholarship_types table
    op.add_column("scholarship_types", sa.Column("category_id", sa.Integer(), nullable=True))
    op.add_column(
        "scholarship_types",
        sa.Column("sub_type", sa.Enum("nsc_phd", "moe_phd", name="scholarship_sub_type"), nullable=True)
    )
    op.create_foreign_key(
        "fk_scholarship_types_category_id",
        "scholarship_types",
        "scholarship_categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    """Revert schema changes"""
    op.drop_constraint("fk_scholarship_types_category_id", "scholarship_types", type_="foreignkey")
    op.drop_column("scholarship_types", "sub_type")
    op.drop_column("scholarship_types", "category_id")

    # Drop scholarship_categories table
    op.drop_table("scholarship_categories")

    # Finally, drop enum type
    scholarship_sub_type_enum = sa.Enum("nsc_phd", "moe_phd", name="scholarship_sub_type")
    scholarship_sub_type_enum.drop(op.get_bind(), checkfirst=True)