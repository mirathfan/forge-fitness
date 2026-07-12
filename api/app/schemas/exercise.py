from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel


class ExerciseBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    primary_muscle_group: str = Field(min_length=2, max_length=60)
    secondary_muscle_groups: list[str] = Field(default_factory=list, max_length=8)
    equipment: str = Field(min_length=2, max_length=80)
    movement_pattern: str = Field(min_length=2, max_length=80)
    instructions: str | None = Field(default=None, max_length=2000)

    @field_validator("name", "primary_muscle_group", "equipment", "movement_pattern")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return value.strip()


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseRead(ExerciseBase, ORMModel):
    id: UUID
    is_custom: bool
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime


class ExerciseList(BaseModel):
    items: list[ExerciseRead]
    total: int
    limit: int
    offset: int
