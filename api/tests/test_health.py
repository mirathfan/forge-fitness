from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app import main


def test_health_endpoint_is_liveness_only(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_endpoint_checks_database(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


def test_ready_endpoint_returns_503_when_database_is_unavailable(monkeypatch) -> None:
    class BrokenEngine:
        def connect(self) -> None:
            raise SQLAlchemyError("database unavailable")

    monkeypatch.setattr(main, "engine", BrokenEngine())

    response = TestClient(main.create_app()).get("/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "database unavailable"}
