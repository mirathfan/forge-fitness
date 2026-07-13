from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class BodyweightEntry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bodyweight_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "measured_date", name="uq_bodyweight_entries_user_date"),
        Index("ix_bodyweight_entries_user_measured_date", "user_id", "measured_date"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    measured_date: Mapped[date] = mapped_column(nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="bodyweight_entries")
