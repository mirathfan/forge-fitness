from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.profile import ProfileRead, ProfileUpdate
from app.services.profiles import ProfileService

router = APIRouter()


@router.get("/me", response_model=ProfileRead)
def get_profile(current_user: CurrentUser, db: DbSession) -> ProfileRead:
    return ProfileRead.model_validate(ProfileService(db).get_me(current_user))


@router.put("/me", response_model=ProfileRead)
def update_profile(payload: ProfileUpdate, current_user: CurrentUser, db: DbSession) -> ProfileRead:
    return ProfileRead.model_validate(ProfileService(db).update_me(current_user, payload))
