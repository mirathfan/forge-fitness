from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ExperienceLevel, FitnessGoal, WeightUnit
from app.schemas.common import Timestamped


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    date_of_birth: date | None = None
    height_cm: float | None = Field(default=None, ge=80, le=260)
    current_weight_kg: float | None = Field(default=None, ge=25, le=350)
    preferred_weight_unit: WeightUnit = WeightUnit.kg
    fitness_goal: FitnessGoal = FitnessGoal.maintain
    experience_level: ExperienceLevel = ExperienceLevel.beginner

    @field_validator("display_name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        return value.strip()


class ProfileRead(Timestamped):
    display_name: str
    date_of_birth: date | None
    height_cm: float | None
    current_weight_kg: float | None
    preferred_weight_unit: WeightUnit
    fitness_goal: FitnessGoal
    experience_level: ExperienceLevel
