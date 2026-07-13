from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.bodyweight import BodyweightEntry


class BodyweightRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_user(self, entry_id: UUID, user_id: UUID) -> BodyweightEntry | None:
        return self.db.scalar(
            select(BodyweightEntry).where(
                BodyweightEntry.id == entry_id,
                BodyweightEntry.user_id == user_id,
            )
        )

    def get_by_user_date(self, user_id: UUID, measured_date: date) -> BodyweightEntry | None:
        return self.db.scalar(
            select(BodyweightEntry).where(
                BodyweightEntry.user_id == user_id,
                BodyweightEntry.measured_date == measured_date,
            )
        )

    def list_for_user(
        self,
        user_id: UUID,
        start_date: date | None,
        end_date: date | None,
        limit: int,
        offset: int,
    ) -> tuple[list[BodyweightEntry], int]:
        conditions = [BodyweightEntry.user_id == user_id]
        if start_date:
            conditions.append(BodyweightEntry.measured_date >= start_date)
        if end_date:
            conditions.append(BodyweightEntry.measured_date <= end_date)

        total = self.db.scalar(select(func.count()).select_from(BodyweightEntry).where(*conditions)) or 0
        items = list(
            self.db.scalars(
                select(BodyweightEntry)
                .where(*conditions)
                .order_by(BodyweightEntry.measured_date.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        return items, total

    def list_all_for_user(self, user_id: UUID) -> list[BodyweightEntry]:
        return list(
            self.db.scalars(
                select(BodyweightEntry)
                .where(BodyweightEntry.user_id == user_id)
                .order_by(BodyweightEntry.measured_date.asc())
            )
        )
