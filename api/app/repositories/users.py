from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profile import UserProfile
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def create(self, email: str, password_hash: str) -> User:
        user = User(email=email.lower(), password_hash=password_hash)
        self.db.add(user)
        self.db.flush()
        display_name = email.split("@", maxsplit=1)[0]
        self.db.add(UserProfile(user_id=user.id, display_name=display_name))
        self.db.flush()
        return user
