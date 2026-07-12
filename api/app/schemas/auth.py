from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import Timestamped


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserRead(Timestamped):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
