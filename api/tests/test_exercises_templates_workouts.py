from fastapi.testclient import TestClient


def register(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "strong-password"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def first_exercise(client: TestClient, headers: dict[str, str], search: str = "bench") -> dict:
    response = client.get(f"/api/v1/exercises?search={search}", headers=headers)
    assert response.status_code == 200
    assert response.json()["total"] >= 1
    return response.json()["items"][0]


def test_exercise_search_and_filter(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/exercises?search=bench&muscle_group=chest&equipment=barbell", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert body["items"][0]["name"] == "Barbell Bench Press"


def test_template_ownership(client: TestClient, auth_headers: dict[str, str]) -> None:
    other_headers = register(client, "other@example.com")
    exercise = first_exercise(client, auth_headers)
    created = client.post(
        "/api/v1/workout-templates",
        headers=auth_headers,
        json={
            "name": "Push Day",
            "description": "Pressing strength",
            "exercises": [
                {
                    "exercise_id": exercise["id"],
                    "position": 0,
                    "target_sets": 3,
                    "target_reps_min": 6,
                    "target_reps_max": 8,
                    "target_rpe": 8,
                    "rest_seconds": 180,
                }
            ],
        },
    )
    assert created.status_code == 201
    template_id = created.json()["id"]

    blocked = client.get(f"/api/v1/workout-templates/{template_id}", headers=other_headers)
    assert blocked.status_code == 404


def test_start_log_complete_workout_and_previous_performance(client: TestClient, auth_headers: dict[str, str]) -> None:
    exercise = first_exercise(client, auth_headers)
    template = client.post(
        "/api/v1/workout-templates",
        headers=auth_headers,
        json={
            "name": "Bench Focus",
            "exercises": [
                {
                    "exercise_id": exercise["id"],
                    "position": 0,
                    "target_sets": 2,
                    "target_reps_min": 8,
                    "target_reps_max": 10,
                    "rest_seconds": 120,
                }
            ],
        },
    )
    assert template.status_code == 201

    session = client.post(
        "/api/v1/workout-sessions",
        headers=auth_headers,
        json={"workout_template_id": template.json()["id"]},
    )
    assert session.status_code == 201
    session_body = session.json()
    session_id = session_body["id"]
    session_exercise_id = session_body["exercises"][0]["id"]

    duplicate_active = client.post(
        "/api/v1/workout-sessions",
        headers=auth_headers,
        json={"workout_template_id": template.json()["id"]},
    )
    assert duplicate_active.status_code == 409

    for reps in (10, 10):
        logged = client.post(
            f"/api/v1/workout-sessions/{session_id}/exercises/{session_exercise_id}/sets",
            headers=auth_headers,
            json={
                "set_type": "working",
                "weight_kg": 80,
                "repetitions": reps,
                "rpe": 8,
                "reps_in_reserve": 2,
                "is_completed": True,
            },
        )
        assert logged.status_code == 201

    completed = client.post(f"/api/v1/workout-sessions/{session_id}/complete", headers=auth_headers)
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

    previous = client.get(f"/api/v1/exercises/{exercise['id']}/previous-performance", headers=auth_headers)
    assert previous.status_code == 200
    assert len(previous.json()) == 2

    history = client.get("/api/v1/workout-sessions?status=completed", headers=auth_headers)
    assert history.status_code == 200
    assert history.json()["total"] == 1

    recommendations = client.get("/api/v1/recommendations", headers=auth_headers)
    assert recommendations.status_code == 200
    assert recommendations.json()[0]["recommendation_type"] == "increase_weight"


def test_unauthorized_set_access_is_blocked(client: TestClient, auth_headers: dict[str, str]) -> None:
    other_headers = register(client, "set-owner@example.com")
    exercise = first_exercise(client, other_headers)
    template = client.post(
        "/api/v1/workout-templates",
        headers=other_headers,
        json={"name": "Private", "exercises": [{"exercise_id": exercise["id"], "position": 0}]},
    )
    session = client.post(
        "/api/v1/workout-sessions",
        headers=other_headers,
        json={"workout_template_id": template.json()["id"]},
    )
    session_id = session.json()["id"]
    session_exercise_id = session.json()["exercises"][0]["id"]
    created_set = client.post(
        f"/api/v1/workout-sessions/{session_id}/exercises/{session_exercise_id}/sets",
        headers=other_headers,
        json={"weight_kg": 40, "repetitions": 8, "is_completed": True},
    )
    assert created_set.status_code == 201

    blocked = client.put(
        f"/api/v1/workout-sessions/{session_id}/sets/{created_set.json()['id']}",
        headers=auth_headers,
        json={"weight_kg": 100, "repetitions": 1, "is_completed": True},
    )
    assert blocked.status_code == 404
