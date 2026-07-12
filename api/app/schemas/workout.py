from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import SetType, WorkoutStatus
from app.schemas.common import Timestamped
from app.schemas.exercise import ExerciseRead


class WorkoutSessionCreate(BaseModel):
    workout_template_id: UUID | None = None
    name: str | None = Field(default=None, max_length=120)


class WorkoutSessionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)


class ExerciseSetCreate(BaseModel):
    set_type: SetType = SetType.working
    weight_kg: float = Field(ge=0, le=1000)
    repetitions: int = Field(ge=0, le=500)
    rpe: float | None = Field(default=None, ge=1, le=10)
    reps_in_reserve: int | None = Field(default=None, ge=0, le=10)
    is_completed: bool = False


class ExerciseSetUpdate(ExerciseSetCreate):
    set_number: int | None = Field(default=None, ge=1)


class ExerciseSetRead(Timestamped):
    workout_session_exercise_id: UUID
    set_number: int
    set_type: SetType
    weight_kg: float
    repetitions: int
    rpe: float | None
    reps_in_reserve: int | None
    is_completed: bool
    completed_at: datetime | None


class WorkoutSessionExerciseRead(BaseModel):
    id: UUID
    exercise_id: UUID
    position: int
    notes: str | None
    exercise: ExerciseRead
    sets: list[ExerciseSetRead]

    model_config = {"from_attributes": True}


class WorkoutSessionRead(Timestamped):
    workout_template_id: UUID | None
    name: str
    status: WorkoutStatus
    started_at: datetime
    completed_at: datetime | None
    notes: str | None
    total_duration_seconds: int | None
    exercises: list[WorkoutSessionExerciseRead]


class WorkoutHistoryList(BaseModel):
    items: list[WorkoutSessionRead]
    total: int
    limit: int
    offset: int


class PreviousPerformanceSet(BaseModel):
    session_id: UUID
    completed_at: datetime
    weight_kg: float
    repetitions: int
    rpe: float | None
    set_type: SetType


class ExerciseHistoryEntry(BaseModel):
    session_id: UUID
    workout_name: str
    completed_at: datetime
    sets: list[PreviousPerformanceSet]
