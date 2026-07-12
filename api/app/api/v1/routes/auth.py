from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import Token, UserCreate, UserLogin, UserRead
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: DbSession) -> Token:
    _, token = AuthService(db).register(payload)
    return token


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: DbSession) -> Token:
    _, token = AuthService(db).login(payload)
    return token


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)
