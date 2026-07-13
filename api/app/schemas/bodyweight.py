from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import Timestamped


class BodyweightEntryCreate(BaseModel):
    measured_date: date
    weight_kg: float = Field(ge=25, le=350)
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def trim_note(self) -> "BodyweightEntryCreate":
        if self.note is not None:
            self.note = self.note.strip() or None
        return self


class BodyweightEntryUpdate(BaseModel):
    measured_date: date | None = None
    weight_kg: float | None = Field(default=None, ge=25, le=350)
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def trim_note(self) -> "BodyweightEntryUpdate":
        if self.note is not None:
            self.note = self.note.strip() or None
        return self


class BodyweightEntryRead(Timestamped):
    measured_date: date
    weight_kg: float
    note: str | None


class BodyweightEntryList(BaseModel):
    items: list[BodyweightEntryRead]
    total: int
    limit: int
    offset: int


class BodyweightTrend(BaseModel):
    latest_weight_kg: float | None
    rolling_average_7d_kg: float | None
    change_7d_kg: float | None
    change_30d_kg: float | None
    direction: Literal["gaining", "losing", "stable"]
