from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.auth import Token, UserCreate, UserLogin
from app.services.errors import ConflictError, UnauthorizedError


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def register(self, payload: UserCreate) -> tuple[User, Token]:
        if self.users.get_by_email(payload.email):
            raise ConflictError("An account with this email already exists")
        user = self.users.create(payload.email, hash_password(payload.password))
        self.db.commit()
        return user, Token(access_token=create_access_token(user.id), user_id=user.id)

    def login(self, payload: UserLogin) -> tuple[User, Token]:
        user = self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")
        return user, Token(access_token=create_access_token(user.id), user_id=user.id)
