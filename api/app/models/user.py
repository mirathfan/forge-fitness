from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.bodyweight import BodyweightEntry
    from app.models.profile import UserProfile


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    profile: Mapped[UserProfile] = relationship(back_populates="user", cascade="all, delete-orphan")
    bodyweight_entries: Mapped[list[BodyweightEntry]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
