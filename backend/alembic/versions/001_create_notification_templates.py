"""Create notification template tables

Revision ID: 001_create_notification_templates
Revises: 
Create Date: 2025-01-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_create_notification_templates'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create notification_templates table
    op.create_table('notification_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scholarship_type_id', sa.Integer(), nullable=True),
        sa.Column('template_type', sa.String(length=50), nullable=False),
        sa.Column('template_key', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('name_en', sa.String(length=200), nullable=True),
        sa.Column('subject_template', sa.String(length=500), nullable=False),
        sa.Column('subject_template_en', sa.String(length=500), nullable=True),
        sa.Column('body_template', sa.Text(), nullable=False),
        sa.Column('body_template_en', sa.Text(), nullable=True),
        sa.Column('cc_emails', sa.JSON(), nullable=True),
        sa.Column('bcc_emails', sa.JSON(), nullable=True),
        sa.Column('available_variables', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['scholarship_type_id'], ['scholarship_types.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('scholarship_type_id', 'template_type', 'template_key', name='_scholarship_template_type_key_uc')
    )
    op.create_index(op.f('ix_notification_templates_id'), 'notification_templates', ['id'], unique=False)

    # Create notification_template_variables table
    op.create_table('notification_template_variables',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_type', sa.String(length=50), nullable=False),
        sa.Column('variable_name', sa.String(length=100), nullable=False),
        sa.Column('variable_key', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('display_name_en', sa.String(length=200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('data_type', sa.String(length=50), nullable=True),
        sa.Column('is_required', sa.Boolean(), nullable=True),
        sa.Column('default_value', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('template_type', 'variable_name', name='_template_type_variable_uc')
    )
    op.create_index(op.f('ix_notification_template_variables_id'), 'notification_template_variables', ['id'], unique=False)

    # Create notification_template_history table
    op.create_table('notification_template_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('previous_content', sa.JSON(), nullable=False),
        sa.Column('change_type', sa.String(length=50), nullable=False),
        sa.Column('change_summary', sa.Text(), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('changed_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['notification_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_template_history_id'), 'notification_template_history', ['id'], unique=False)

    # Insert default template variables for each template type
    template_variables = [
        # Whitelist variables
        ('whitelist', 'student_name', '{student_name}', '學生姓名', 'Student Name', '申請學生的姓名', 'Name of the applying student', 'string', True),
        ('whitelist', 'student_id', '{student_id}', '學號', 'Student ID', '申請學生的學號', 'Student ID number', 'string', True),
        ('whitelist', 'scholarship_name', '{scholarship_name}', '獎學金名稱', 'Scholarship Name', '獎學金的名稱', 'Name of the scholarship', 'string', True),
        ('whitelist', 'application_period_start', '{application_period_start}', '申請開始日期', 'Application Start Date', '申請期間開始日期', 'Application period start date', 'date', False),
        ('whitelist', 'application_period_end', '{application_period_end}', '申請結束日期', 'Application End Date', '申請期間結束日期', 'Application period end date', 'date', False),
        ('whitelist', 'whitelist_deadline', '{whitelist_deadline}', '白名單截止日期', 'Whitelist Deadline', '白名單申請截止日期', 'Whitelist application deadline', 'date', False),
        
        # Application variables
        ('application', 'student_name', '{student_name}', '學生姓名', 'Student Name', '申請學生的姓名', 'Name of the applying student', 'string', True),
        ('application', 'student_id', '{student_id}', '學號', 'Student ID', '申請學生的學號', 'Student ID number', 'string', True),
        ('application', 'application_id', '{application_id}', '申請編號', 'Application ID', '申請案的編號', 'Application case ID', 'string', True),
        ('application', 'scholarship_name', '{scholarship_name}', '獎學金名稱', 'Scholarship Name', '獎學金的名稱', 'Name of the scholarship', 'string', True),
        ('application', 'submission_date', '{submission_date}', '送出日期', 'Submission Date', '申請送出日期', 'Application submission date', 'date', False),
        ('application', 'application_status', '{application_status}', '申請狀態', 'Application Status', '申請案目前狀態', 'Current application status', 'string', False),
        
        # Recommendation variables
        ('recommendation', 'professor_name', '{professor_name}', '教授姓名', 'Professor Name', '推薦教授的姓名', 'Name of the recommending professor', 'string', True),
        ('recommendation', 'student_name', '{student_name}', '學生姓名', 'Student Name', '申請學生的姓名', 'Name of the applying student', 'string', True),
        ('recommendation', 'student_id', '{student_id}', '學號', 'Student ID', '申請學生的學號', 'Student ID number', 'string', True),
        ('recommendation', 'application_id', '{application_id}', '申請編號', 'Application ID', '申請案的編號', 'Application case ID', 'string', True),
        ('recommendation', 'scholarship_name', '{scholarship_name}', '獎學金名稱', 'Scholarship Name', '獎學金的名稱', 'Name of the scholarship', 'string', True),
        ('recommendation', 'recommendation_deadline', '{recommendation_deadline}', '推薦截止日期', 'Recommendation Deadline', '教授推薦截止日期', 'Professor recommendation deadline', 'date', False),
        
        # Review variables
        ('review', 'reviewer_name', '{reviewer_name}', '審核者姓名', 'Reviewer Name', '審核者的姓名', 'Name of the reviewer', 'string', True),
        ('review', 'student_name', '{student_name}', '學生姓名', 'Student Name', '申請學生的姓名', 'Name of the applying student', 'string', True),
        ('review', 'student_id', '{student_id}', '學號', 'Student ID', '申請學生的學號', 'Student ID number', 'string', True),
        ('review', 'application_id', '{application_id}', '申請編號', 'Application ID', '申請案的編號', 'Application case ID', 'string', True),
        ('review', 'scholarship_name', '{scholarship_name}', '獎學金名稱', 'Scholarship Name', '獎學金的名稱', 'Name of the scholarship', 'string', True),
        ('review', 'review_deadline', '{review_deadline}', '審核截止日期', 'Review Deadline', '審核截止日期', 'Review deadline', 'date', False),
        ('review', 'review_stage', '{review_stage}', '審核階段', 'Review Stage', '目前審核階段', 'Current review stage', 'string', False),
        
        # Supplementary document variables
        ('supplementary_document', 'student_name', '{student_name}', '學生姓名', 'Student Name', '申請學生的姓名', 'Name of the applying student', 'string', True),
        ('supplementary_document', 'student_id', '{student_id}', '學號', 'Student ID', '申請學生的學號', 'Student ID number', 'string', True),
        ('supplementary_document', 'application_id', '{application_id}', '申請編號', 'Application ID', '申請案的編號', 'Application case ID', 'string', True),
        ('supplementary_document', 'scholarship_name', '{scholarship_name}', '獎學金名稱', 'Scholarship Name', '獎學金的名稱', 'Name of the scholarship', 'string', True),
        ('supplementary_document', 'required_documents', '{required_documents}', '需補充文件', 'Required Documents', '需要補充的文件清單', 'List of required documents', 'string', True),
        ('supplementary_document', 'document_deadline', '{document_deadline}', '文件截止日期', 'Document Deadline', '文件補充截止日期', 'Document submission deadline', 'date', False),
        
        # Result variables
        ('result', 'student_name', '{student_name}', '學生姓名', 'Student Name', '申請學生的姓名', 'Name of the applying student', 'string', True),
        ('result', 'student_id', '{student_id}', '學號', 'Student ID', '申請學生的學號', 'Student ID number', 'string', True),
        ('result', 'application_id', '{application_id}', '申請編號', 'Application ID', '申請案的編號', 'Application case ID', 'string', True),
        ('result', 'scholarship_name', '{scholarship_name}', '獎學金名稱', 'Scholarship Name', '獎學金的名稱', 'Name of the scholarship', 'string', True),
        ('result', 'result', '{result}', '審核結果', 'Result', '申請審核結果', 'Application review result', 'string', True),
        ('result', 'award_amount', '{award_amount}', '獎學金金額', 'Award Amount', '獲得獎學金金額', 'Scholarship award amount', 'number', False),
        ('result', 'announcement_date', '{announcement_date}', '公告日期', 'Announcement Date', '結果公告日期', 'Result announcement date', 'date', False),
        
        # Roster creation variables
        ('roster_creation', 'admin_name', '{admin_name}', '管理員姓名', 'Admin Name', '建立名單的管理員姓名', 'Name of the admin creating the roster', 'string', True),
        ('roster_creation', 'scholarship_name', '{scholarship_name}', '獎學金名稱', 'Scholarship Name', '獎學金的名稱', 'Name of the scholarship', 'string', True),
        ('roster_creation', 'roster_count', '{roster_count}', '名單人數', 'Roster Count', '名單中的人數', 'Number of people in the roster', 'number', False),
        ('roster_creation', 'creation_date', '{creation_date}', '名單建立日期', 'Creation Date', '名單建立的日期', 'Date when the roster was created', 'date', False),
        ('roster_creation', 'academic_year', '{academic_year}', '學年度', 'Academic Year', '學年度', 'Academic year', 'string', False),
        ('roster_creation', 'semester', '{semester}', '學期', 'Semester', '學期', 'Semester', 'string', False),
    ]
    
    # Insert template variables
    for template_type, var_name, var_key, display_name, display_name_en, desc, desc_en, data_type, is_required in template_variables:
        op.execute(f"""
            INSERT INTO notification_template_variables 
            (template_type, variable_name, variable_key, display_name, display_name_en, description, description_en, data_type, is_required, is_active)
            VALUES ('{template_type}', '{var_name}', '{var_key}', '{display_name}', '{display_name_en}', '{desc}', '{desc_en}', '{data_type}', {is_required}, true)
        """)


def downgrade() -> None:
    op.drop_table('notification_template_history')
    op.drop_table('notification_template_variables')
    op.drop_table('notification_templates')