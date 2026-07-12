from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise


class ExerciseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_visible(self, exercise_id: UUID, user_id: UUID) -> Exercise | None:
        return self.db.scalar(
            select(Exercise).where(
                Exercise.id == exercise_id,
                or_(Exercise.is_custom.is_(False), Exercise.created_by_user_id == user_id),
            )
        )

    def list_visible(
        self,
        user_id: UUID,
        search: str | None,
        muscle_group: str | None,
        equipment: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Exercise], int]:
        conditions = [or_(Exercise.is_custom.is_(False), Exercise.created_by_user_id == user_id)]
        if search:
            like = f"%{search.lower()}%"
            conditions.append(func.lower(Exercise.name).like(like))
        if muscle_group:
            conditions.append(Exercise.primary_muscle_group == muscle_group)
        if equipment:
            conditions.append(Exercise.equipment == equipment)

        total = self.db.scalar(select(func.count()).select_from(Exercise).where(*conditions)) or 0
        items = list(
            self.db.scalars(
                select(Exercise)
                .where(*conditions)
                .order_by(Exercise.primary_muscle_group, Exercise.name)
                .limit(limit)
                .offset(offset)
            )
        )
        return items, total

    def create_custom(self, user_id: UUID, data: dict) -> Exercise:
        exercise = Exercise(**data, is_custom=True, created_by_user_id=user_id)
        self.db.add(exercise)
        self.db.flush()
        return exercise
