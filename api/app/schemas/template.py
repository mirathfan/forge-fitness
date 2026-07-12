from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMModel, Timestamped
from app.schemas.exercise import ExerciseRead


class TemplateExerciseUpsert(BaseModel):
    exercise_id: UUID
    position: int = Field(ge=0)
    target_sets: int = Field(default=3, ge=1, le=12)
    target_reps_min: int = Field(default=8, ge=1, le=100)
    target_reps_max: int = Field(default=12, ge=1, le=100)
    target_rpe: float | None = Field(default=None, ge=1, le=10)
    rest_seconds: int = Field(default=120, ge=0, le=900)
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_reps(self) -> "TemplateExerciseUpsert":
        if self.target_reps_min > self.target_reps_max:
            raise ValueError("target_reps_min cannot exceed target_reps_max")
        return self


class TemplateExerciseRead(TemplateExerciseUpsert, ORMModel):
    id: UUID
    exercise: ExerciseRead


class WorkoutTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    exercises: list[TemplateExerciseUpsert] = Field(default_factory=list)


class WorkoutTemplateUpdate(WorkoutTemplateCreate):
    pass


class WorkoutTemplateRead(Timestamped):
    name: str
    description: str | None
    exercises: list[TemplateExerciseRead]
