"""add bodyweight entries

Revision ID: 202607120001
Revises: 202607110001
Create Date: 2026-07-12 00:00:00
"""
import sqlalchemy as sa
from alembic import op

revision = "202607120001"
down_revision = "202607110001"
branch_labels = None
depends_on = None


def timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "bodyweight_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("measured_date", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(6, 2), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "measured_date", name="uq_bodyweight_entries_user_date"),
    )
    op.create_index("ix_bodyweight_entries_user_id", "bodyweight_entries", ["user_id"])
    op.create_index(
        "ix_bodyweight_entries_user_measured_date",
        "bodyweight_entries",
        ["user_id", "measured_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_bodyweight_entries_user_measured_date", table_name="bodyweight_entries")
    op.drop_index("ix_bodyweight_entries_user_id", table_name="bodyweight_entries")
    op.drop_table("bodyweight_entries")
