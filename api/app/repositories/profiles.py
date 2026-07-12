from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profile import UserProfile


class ProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: UUID) -> UserProfile | None:
        return self.db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
