from uuid import UUID

from sqlalchemy.orm import Session

from app.models.template import WorkoutTemplate, WorkoutTemplateExercise
from app.models.user import User
from app.repositories.exercises import ExerciseRepository
from app.repositories.templates import TemplateRepository
from app.schemas.template import WorkoutTemplateCreate, WorkoutTemplateUpdate
from app.services.errors import NotFoundError


class TemplateService:
    def __init__(self, db: Session):
        self.db = db
        self.templates = TemplateRepository(db)
        self.exercises = ExerciseRepository(db)

    def list_for_user(self, user: User) -> list[WorkoutTemplate]:
        return self.templates.list_for_user(user.id)

    def get(self, user: User, template_id: UUID) -> WorkoutTemplate:
        template = self.templates.get_for_user(template_id, user.id)
        if template is None:
            raise NotFoundError("Workout template not found")
        return template

    def create(self, user: User, payload: WorkoutTemplateCreate) -> WorkoutTemplate:
        template = WorkoutTemplate(user_id=user.id, name=payload.name.strip(), description=payload.description)
        self.db.add(template)
        self.db.flush()
        self._replace_exercises(template, payload.exercises, user.id)
        self.db.commit()
        return self.get(user, template.id)

    def update(self, user: User, template_id: UUID, payload: WorkoutTemplateUpdate) -> WorkoutTemplate:
        template = self.get(user, template_id)
        template.name = payload.name.strip()
        template.description = payload.description
        template.exercises.clear()
        self.db.flush()
        self._replace_exercises(template, payload.exercises, user.id)
        self.db.commit()
        return self.get(user, template.id)

    def delete(self, user: User, template_id: UUID) -> None:
        template = self.get(user, template_id)
        self.db.delete(template)
        self.db.commit()

    def _replace_exercises(self, template: WorkoutTemplate, exercise_payloads: list, user_id: UUID) -> None:
        for item in sorted(exercise_payloads, key=lambda exercise: exercise.position):
            exercise = self.exercises.get_visible(item.exercise_id, user_id)
            if exercise is None:
                raise NotFoundError("Exercise not found")
            template.exercises.append(
                WorkoutTemplateExercise(
                    exercise_id=exercise.id,
                    position=item.position,
                    target_sets=item.target_sets,
                    target_reps_min=item.target_reps_min,
                    target_reps_max=item.target_reps_max,
                    target_rpe=item.target_rpe,
                    rest_seconds=item.rest_seconds,
                    notes=item.notes,
                )
            )
