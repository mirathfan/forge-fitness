from uuid import UUID

from sqlalchemy import JSON, Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Exercise(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "exercises"
    __table_args__ = (
        Index("ix_exercises_muscle_equipment", "primary_muscle_group", "equipment"),
    )

    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    primary_muscle_group: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    secondary_muscle_groups: Mapped[list[str]] = mapped_column(JSON, default=list)
    equipment: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    movement_pattern: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
