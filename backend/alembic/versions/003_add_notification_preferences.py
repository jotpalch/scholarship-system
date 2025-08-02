"""Add notification preferences table

Revision ID: 003
Revises: 002
Create Date: 2025-08-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    """Add notification preferences table"""
    # Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        
        # Email preferences
        sa.Column('email_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_application_updates', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_system_announcements', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_deadline_reminders', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_document_requests', sa.Boolean(), nullable=True, default=True),
        
        # Push notification preferences
        sa.Column('push_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('push_application_updates', sa.Boolean(), nullable=True, default=True),
        sa.Column('push_system_announcements', sa.Boolean(), nullable=True, default=True),
        sa.Column('push_deadline_reminders', sa.Boolean(), nullable=True, default=True),
        sa.Column('push_document_requests', sa.Boolean(), nullable=True, default=True),
        
        # Frequency and timing settings
        sa.Column('digest_frequency', sa.String(length=20), nullable=True, default='daily'),
        sa.Column('quiet_hours_start', sa.String(length=5), nullable=True),
        sa.Column('quiet_hours_end', sa.String(length=5), nullable=True),
        
        # Notification filtering
        sa.Column('notification_types', sa.JSON(), nullable=True),
        sa.Column('priority_threshold', sa.String(length=20), nullable=True, default='normal'),
        
        # Auto-management settings
        sa.Column('auto_mark_read_after_days', sa.Integer(), nullable=True, default=7),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', name='_user_notification_preferences_uc')
    )
    
    # Create indexes
    op.create_index(op.f('ix_notification_preferences_id'), 'notification_preferences', ['id'], unique=False)
    op.create_index(op.f('ix_notification_preferences_user_id'), 'notification_preferences', ['user_id'], unique=True)


def downgrade():
    """Remove notification preferences table"""
    op.drop_index(op.f('ix_notification_preferences_user_id'), table_name='notification_preferences')
    op.drop_index(op.f('ix_notification_preferences_id'), table_name='notification_preferences')
    op.drop_table('notification_preferences')