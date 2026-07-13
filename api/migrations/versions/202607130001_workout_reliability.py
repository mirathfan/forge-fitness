"""add workout reliability keys

Revision ID: 202607130001
Revises: 202607120001
Create Date: 2026-07-13 00:00:00
"""
import sqlalchemy as sa
from alembic import op

revision = "202607130001"
down_revision = "202607120001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exercise_sets", sa.Column("client_mutation_id", sa.String(length=80), nullable=True))
    op.create_index("ix_exercise_sets_client_mutation_id", "exercise_sets", ["client_mutation_id"])
    op.create_unique_constraint(
        "uq_exercise_set_client_mutation",
        "exercise_sets",
        ["workout_session_exercise_id", "client_mutation_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_exercise_set_client_mutation", "exercise_sets", type_="unique")
    op.drop_index("ix_exercise_sets_client_mutation_id", table_name="exercise_sets")
    op.drop_column("exercise_sets", "client_mutation_id")
