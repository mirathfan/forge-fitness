from fastapi.testclient import TestClient


def test_register_login_and_me(client: TestClient) -> None:
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "strong-password"},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]

    duplicate = client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "strong-password"},
    )
    assert duplicate.status_code == 409

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "new@example.com", "password": "strong-password"},
    )
    assert login.status_code == 200

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "new@example.com"
    assert "password_hash" not in me.json()


def test_protected_route_requires_token(client: TestClient) -> None:
    response = client.get("/api/v1/profiles/me")
    assert response.status_code == 401


def test_profile_update(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.put(
        "/api/v1/profiles/me",
        headers=auth_headers,
        json={
            "display_name": "A. Lifter",
            "date_of_birth": "1994-03-05",
            "height_cm": 180,
            "current_weight_kg": 82.5,
            "preferred_weight_unit": "lb",
            "fitness_goal": "improve_strength",
            "experience_level": "intermediate",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "A. Lifter"
    assert body["preferred_weight_unit"] == "lb"
