from sqlalchemy.orm import Session

from app.models.profile import UserProfile
from app.models.user import User
from app.repositories.profiles import ProfileRepository
from app.schemas.profile import ProfileUpdate
from app.services.errors import NotFoundError


class ProfileService:
    def __init__(self, db: Session):
        self.db = db
        self.profiles = ProfileRepository(db)

    def get_me(self, user: User) -> UserProfile:
        profile = self.profiles.get_by_user_id(user.id)
        if profile is None:
            raise NotFoundError("Profile not found")
        return profile

    def update_me(self, user: User, payload: ProfileUpdate) -> UserProfile:
        profile = self.get_me(user)
        for key, value in payload.model_dump().items():
            setattr(profile, key, value)
        self.db.commit()
        self.db.refresh(profile)
        return profile
