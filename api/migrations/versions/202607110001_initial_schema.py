"""initial schema

Revision ID: 202607110001
Revises:
Create Date: 2026-07-11 00:00:00
"""
import sqlalchemy as sa
from alembic import op

revision = "202607110001"
down_revision = None
branch_labels = None
depends_on = None


weight_unit = sa.Enum("kg", "lb", name="weight_unit")
fitness_goal = sa.Enum("lose_weight", "maintain", "gain_muscle", "improve_strength", name="fitness_goal")
experience_level = sa.Enum("beginner", "intermediate", "advanced", name="experience_level")
workout_status = sa.Enum("active", "completed", "abandoned", name="workout_status")
set_type = sa.Enum("warmup", "working", "dropset", "failure", name="set_type")
recommendation_type = sa.Enum(
    "increase_weight",
    "reduce_weight",
    "plateau",
    "maintain",
    name="recommendation_type",
)


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
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        *timestamp_columns(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("height_cm", sa.Numeric(5, 2), nullable=True),
        sa.Column("current_weight_kg", sa.Numeric(6, 2), nullable=True),
        sa.Column("preferred_weight_unit", weight_unit, nullable=False),
        sa.Column("fitness_goal", fitness_goal, nullable=False),
        sa.Column("experience_level", experience_level, nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"])

    op.create_table(
        "exercises",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("primary_muscle_group", sa.String(length=60), nullable=False),
        sa.Column("secondary_muscle_groups", sa.JSON(), nullable=False),
        sa.Column("equipment", sa.String(length=80), nullable=False),
        sa.Column("movement_pattern", sa.String(length=80), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("is_custom", sa.Boolean(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exercises_name", "exercises", ["name"])
    op.create_index("ix_exercises_primary_muscle_group", "exercises", ["primary_muscle_group"])
    op.create_index("ix_exercises_equipment", "exercises", ["equipment"])
    op.create_index("ix_exercises_movement_pattern", "exercises", ["movement_pattern"])
    op.create_index("ix_exercises_is_custom", "exercises", ["is_custom"])
    op.create_index("ix_exercises_created_by_user_id", "exercises", ["created_by_user_id"])
    op.create_index("ix_exercises_muscle_equipment", "exercises", ["primary_muscle_group", "equipment"])

    op.create_table(
        "workout_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workout_templates_user_id", "workout_templates", ["user_id"])
    op.create_index("ix_templates_user_created", "workout_templates", ["user_id", "created_at"])

    op.create_table(
        "workout_template_exercises",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workout_template_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("target_sets", sa.Integer(), nullable=False),
        sa.Column("target_reps_min", sa.Integer(), nullable=False),
        sa.Column("target_reps_max", sa.Integer(), nullable=False),
        sa.Column("target_rpe", sa.Numeric(3, 1), nullable=True),
        sa.Column("rest_seconds", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["workout_template_id"], ["workout_templates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workout_template_id", "position", name="uq_template_exercise_position"),
    )
    op.create_index("ix_workout_template_exercises_exercise_id", "workout_template_exercises", ["exercise_id"])
    op.create_index(
        "ix_workout_template_exercises_workout_template_id",
        "workout_template_exercises",
        ["workout_template_id"],
    )

    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("workout_template_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("status", workout_status, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("total_duration_seconds", sa.Integer(), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workout_template_id"], ["workout_templates.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workout_sessions_user_id", "workout_sessions", ["user_id"])
    op.create_index("ix_workout_sessions_workout_template_id", "workout_sessions", ["workout_template_id"])
    op.create_index("ix_workout_sessions_status", "workout_sessions", ["status"])
    op.create_index("ix_sessions_user_status_started", "workout_sessions", ["user_id", "status", "started_at"])
    op.create_index(
        "uq_active_session_per_user",
        "workout_sessions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "workout_session_exercises",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workout_session_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["workout_session_id"], ["workout_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workout_session_id", "position", name="uq_session_exercise_position"),
    )
    op.create_index("ix_workout_session_exercises_exercise_id", "workout_session_exercises", ["exercise_id"])
    op.create_index(
        "ix_session_exercises_session_exercise",
        "workout_session_exercises",
        ["workout_session_id", "exercise_id"],
    )

    op.create_table(
        "exercise_sets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workout_session_exercise_id", sa.Uuid(), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("set_type", set_type, nullable=False),
        sa.Column("weight_kg", sa.Numeric(7, 2), nullable=False),
        sa.Column("repetitions", sa.Integer(), nullable=False),
        sa.Column("rpe", sa.Numeric(3, 1), nullable=True),
        sa.Column("reps_in_reserve", sa.Integer(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["workout_session_exercise_id"], ["workout_session_exercises.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workout_session_exercise_id", "set_number", name="uq_exercise_set_number"),
    )
    op.create_index("ix_exercise_sets_workout_session_exercise_id", "exercise_sets", ["workout_session_exercise_id"])
    op.create_index(
        "ix_sets_session_exercise_completed",
        "exercise_sets",
        ["workout_session_exercise_id", "is_completed"],
    )

    op.create_table(
        "progression_recommendations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("source_workout_session_id", sa.Uuid(), nullable=False),
        sa.Column("recommendation_type", recommendation_type, nullable=False),
        sa.Column("current_weight_kg", sa.Numeric(7, 2), nullable=False),
        sa.Column("recommended_weight_kg", sa.Numeric(7, 2), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_workout_session_id"], ["workout_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_progression_recommendations_user_id", "progression_recommendations", ["user_id"])
    op.create_index("ix_progression_recommendations_exercise_id", "progression_recommendations", ["exercise_id"])
    op.create_index(
        "ix_progression_recommendations_source_workout_session_id",
        "progression_recommendations",
        ["source_workout_session_id"],
    )
    op.create_index("ix_recommendations_user_created", "progression_recommendations", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_table("progression_recommendations")
    op.drop_table("exercise_sets")
    op.drop_table("workout_session_exercises")
    op.drop_index("uq_active_session_per_user", table_name="workout_sessions")
    op.drop_table("workout_sessions")
    op.drop_table("workout_template_exercises")
    op.drop_table("workout_templates")
    op.drop_table("exercises")
    op.drop_table("user_profiles")
    op.drop_table("users")
    recommendation_type.drop(op.get_bind(), checkfirst=True)
    set_type.drop(op.get_bind(), checkfirst=True)
    workout_status.drop(op.get_bind(), checkfirst=True)
    experience_level.drop(op.get_bind(), checkfirst=True)
    fitness_goal.drop(op.get_bind(), checkfirst=True)
    weight_unit.drop(op.get_bind(), checkfirst=True)
