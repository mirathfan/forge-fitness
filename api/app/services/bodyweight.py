from datetime import date, timedelta
from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.bodyweight import BodyweightEntry
from app.models.user import User
from app.repositories.bodyweight import BodyweightRepository
from app.schemas.bodyweight import BodyweightEntryCreate, BodyweightEntryUpdate, BodyweightTrend
from app.services.errors import ConflictError, NotFoundError


class BodyweightService:
    stable_threshold_kg = 0.25

    def __init__(self, db: Session):
        self.db = db
        self.bodyweight = BodyweightRepository(db)

    def create(self, user: User, payload: BodyweightEntryCreate) -> BodyweightEntry:
        if self.bodyweight.get_by_user_date(user.id, payload.measured_date) is not None:
            raise ConflictError("Bodyweight entry already exists for this date")

        entry = BodyweightEntry(
            user_id=user.id,
            measured_date=payload.measured_date,
            weight_kg=payload.weight_kg,
            note=payload.note,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def list_for_user(
        self,
        user: User,
        start_date: date | None,
        end_date: date | None,
        limit: int,
        offset: int,
    ) -> tuple[list[BodyweightEntry], int]:
        return self.bodyweight.list_for_user(user.id, start_date, end_date, limit, offset)

    def update(self, user: User, entry_id: UUID, payload: BodyweightEntryUpdate) -> BodyweightEntry:
        entry = self._get(user, entry_id)
        if payload.measured_date is not None and payload.measured_date != entry.measured_date:
            duplicate = self.bodyweight.get_by_user_date(user.id, payload.measured_date)
            if duplicate is not None and duplicate.id != entry.id:
                raise ConflictError("Bodyweight entry already exists for this date")
            entry.measured_date = payload.measured_date
        if payload.weight_kg is not None:
            entry.weight_kg = payload.weight_kg
        if "note" in payload.model_fields_set:
            entry.note = payload.note
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def delete(self, user: User, entry_id: UUID) -> None:
        entry = self._get(user, entry_id)
        self.db.delete(entry)
        self.db.commit()

    def trend(self, user: User) -> BodyweightTrend:
        entries = self.bodyweight.list_all_for_user(user.id)
        if not entries:
            return BodyweightTrend(
                latest_weight_kg=None,
                rolling_average_7d_kg=None,
                change_7d_kg=None,
                change_30d_kg=None,
                direction="stable",
            )

        latest = entries[-1]
        latest_date = latest.measured_date
        latest_weight = float(latest.weight_kg)
        window_start = latest_date - timedelta(days=6)
        rolling_entries = [entry for entry in entries if window_start <= entry.measured_date <= latest_date]
        rolling_average = sum(float(entry.weight_kg) for entry in rolling_entries) / len(rolling_entries)
        change_7d = self._change_since(entries, latest_date - timedelta(days=7), latest_weight)
        change_30d = self._change_since(entries, latest_date - timedelta(days=30), latest_weight)
        direction = self._direction(change_7d if change_7d is not None else change_30d)
        return BodyweightTrend(
            latest_weight_kg=latest_weight,
            rolling_average_7d_kg=round(rolling_average, 2),
            change_7d_kg=round(change_7d, 2) if change_7d is not None else None,
            change_30d_kg=round(change_30d, 2) if change_30d is not None else None,
            direction=direction,
        )

    def _get(self, user: User, entry_id: UUID) -> BodyweightEntry:
        entry = self.bodyweight.get_for_user(entry_id, user.id)
        if entry is None:
            raise NotFoundError("Bodyweight entry not found")
        return entry

    @staticmethod
    def _change_since(entries: list[BodyweightEntry], target_date: date, latest_weight: float) -> float | None:
        comparison = next((entry for entry in reversed(entries) if entry.measured_date <= target_date), None)
        if comparison is None:
            return None
        return latest_weight - float(comparison.weight_kg)

    def _direction(self, change: float | None) -> Literal["gaining", "losing", "stable"]:
        if change is None or abs(change) <= self.stable_threshold_kg:
            return "stable"
        return "gaining" if change > 0 else "losing"
