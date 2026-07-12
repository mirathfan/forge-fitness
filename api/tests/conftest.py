import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./.test_forge.db"
os.environ["JWT_SECRET_KEY"] = "test-secret"

from app.db.base import *  # noqa: F403,E402
from app.db.seed import seed_exercises  # noqa: E402
from app.db.session import Base, engine  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_exercises()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "athlete@example.com", "password": "strong-password"},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
