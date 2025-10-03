"""clear_whitelist_data_change_to_nycu_id

白名單系統重構：
- 將白名單從存儲 user_id (數字) 改為存儲 nycu_id (學號字串)
- 清空現有白名單數據（因為格式不兼容，無法轉換）
- 更新註釋說明新的數據格式

白名單新格式：{"general": ["0856001", "0856002"], "nstc": ["0856003"]}

Revision ID: e5ce4830cc3d
Revises: 475a5cc5a601
Create Date: 2025-10-04 04:36:01.293531

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5ce4830cc3d"
down_revision: Union[str, None] = "475a5cc5a601"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    清空所有白名單數據，因為數據格式從 user_id (數字) 改為 nycu_id (學號字串)
    """
    # Clear all whitelist data in scholarship_configurations
    op.execute(
        "UPDATE scholarship_configurations SET whitelist_student_ids = '{}' WHERE whitelist_student_ids IS NOT NULL"
    )

    # Add comment to document the new format
    op.execute(
        """
        COMMENT ON COLUMN scholarship_configurations.whitelist_student_ids IS
        '白名單學號列表，依子獎學金區分。格式: {"general": ["0856001", "0856002"], "nstc": ["0856003"]}'
        """
    )


def downgrade() -> None:
    """
    無法還原，因為原始數據已經清空且格式不兼容
    """
    # Cannot restore old data as it was incompatible
    pass
