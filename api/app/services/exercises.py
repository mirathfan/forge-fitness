from uuid import UUID

from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.user import User
from app.repositories.exercises import ExerciseRepository
from app.schemas.exercise import ExerciseCreate
from app.services.errors import NotFoundError


class ExerciseService:
    def __init__(self, db: Session):
        self.db = db
        self.exercises = ExerciseRepository(db)

    def list_visible(
        self,
        user: User,
        search: str | None,
        muscle_group: str | None,
        equipment: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Exercise], int]:
        return self.exercises.list_visible(user.id, search, muscle_group, equipment, limit, offset)

    def get(self, user: User, exercise_id: UUID) -> Exercise:
        exercise = self.exercises.get_visible(exercise_id, user.id)
        if exercise is None:
            raise NotFoundError("Exercise not found")
        return exercise

    def create_custom(self, user: User, payload: ExerciseCreate) -> Exercise:
        exercise = self.exercises.create_custom(user.id, payload.model_dump())
        self.db.commit()
        self.db.refresh(exercise)
        return exercise
