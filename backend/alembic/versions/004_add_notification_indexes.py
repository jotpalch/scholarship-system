"""Add notification performance indexes

Revision ID: 004
Revises: 003
Create Date: 2025-08-02 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    """Add indexes for notification system performance optimization"""
    
    # Composite index for user notifications query (most common query)
    op.create_index(
        'ix_notifications_user_priority_created',
        'notifications',
        ['user_id', 'priority', 'created_at'],
        unique=False
    )
    
    # Composite index for system announcements
    op.create_index(
        'ix_notifications_system_priority_created',
        'notifications',
        ['user_id', 'priority', 'created_at'],
        unique=False,
        postgresql_where=sa.text('user_id IS NULL')
    )
    
    # Index for unread personal notifications
    op.create_index(
        'ix_notifications_user_unread_expires',
        'notifications',
        ['user_id', 'is_read', 'expires_at'],
        unique=False,
        postgresql_where=sa.text('user_id IS NOT NULL')
    )
    
    # Index for notification type filtering
    op.create_index(
        'ix_notifications_type_created',
        'notifications',
        ['notification_type', 'created_at'],
        unique=False
    )
    
    # Index for priority filtering
    op.create_index(
        'ix_notifications_priority_created',
        'notifications',
        ['priority', 'created_at'],
        unique=False
    )
    
    # Index for expiration cleanup
    op.create_index(
        'ix_notifications_expires_at',
        'notifications',
        ['expires_at'],
        unique=False,
        postgresql_where=sa.text('expires_at IS NOT NULL')
    )
    
    # Index for NotificationRead table (for system announcements)
    op.create_index(
        'ix_notification_reads_user_notification',
        'notification_reads',
        ['user_id', 'notification_id'],
        unique=False
    )
    
    # Index for notification preferences lookup
    op.create_index(
        'ix_notification_preferences_user_updated',
        'notification_preferences',
        ['user_id', 'updated_at'],
        unique=False
    )


def downgrade():
    """Remove notification performance indexes"""
    
    # Drop all the indexes we created
    op.drop_index('ix_notification_preferences_user_updated', table_name='notification_preferences')
    op.drop_index('ix_notification_reads_user_notification', table_name='notification_reads')
    op.drop_index('ix_notifications_expires_at', table_name='notifications')
    op.drop_index('ix_notifications_priority_created', table_name='notifications')
    op.drop_index('ix_notifications_type_created', table_name='notifications')
    op.drop_index('ix_notifications_user_unread_expires', table_name='notifications')
    op.drop_index('ix_notifications_system_priority_created', table_name='notifications')
    op.drop_index('ix_notifications_user_priority_created', table_name='notifications')