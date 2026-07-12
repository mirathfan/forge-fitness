from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.template import WorkoutTemplate, WorkoutTemplateExercise


class TemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: UUID) -> list[WorkoutTemplate]:
        return list(
            self.db.scalars(
                select(WorkoutTemplate)
                .options(selectinload(WorkoutTemplate.exercises).selectinload(WorkoutTemplateExercise.exercise))
                .where(WorkoutTemplate.user_id == user_id)
                .order_by(WorkoutTemplate.created_at.desc())
            )
        )

    def get_for_user(self, template_id: UUID, user_id: UUID) -> WorkoutTemplate | None:
        return self.db.scalar(
            select(WorkoutTemplate)
            .options(
                selectinload(WorkoutTemplate.exercises).selectinload(WorkoutTemplateExercise.exercise),
            )
            .where(WorkoutTemplate.id == template_id, WorkoutTemplate.user_id == user_id)
        )
