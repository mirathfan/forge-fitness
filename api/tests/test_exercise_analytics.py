from fastapi.testclient import TestClient

from app.services.exercise_analytics import estimate_one_rep_max_kg


def register(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "strong-password"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def first_exercise(client: TestClient, headers: dict[str, str], search: str = "bench") -> dict:
    response = client.get(f"/api/v1/exercises?search={search}", headers=headers)
    assert response.status_code == 200
    assert response.json()["total"] >= 1
    return response.json()["items"][0]


def create_template(
    client: TestClient,
    headers: dict[str, str],
    exercise_id: str,
    name: str = "Bench Analytics",
) -> dict:
    response = client.post(
        "/api/v1/workout-templates",
        headers=headers,
        json={"name": name, "exercises": [{"exercise_id": exercise_id, "position": 0}]},
    )
    assert response.status_code == 201
    return response.json()


def start_session(client: TestClient, headers: dict[str, str], template_id: str) -> dict:
    response = client.post(
        "/api/v1/workout-sessions",
        headers=headers,
        json={"workout_template_id": template_id},
    )
    assert response.status_code == 201
    return response.json()


def log_set(
    client: TestClient,
    headers: dict[str, str],
    session: dict,
    weight_kg: float,
    repetitions: int,
    set_type: str = "working",
    is_completed: bool = True,
) -> dict:
    response = client.post(
        f"/api/v1/workout-sessions/{session['id']}/exercises/{session['exercises'][0]['id']}/sets",
        headers=headers,
        json={
            "set_type": set_type,
            "weight_kg": weight_kg,
            "repetitions": repetitions,
            "rpe": 8,
            "is_completed": is_completed,
        },
    )
    assert response.status_code == 201
    return response.json()


def complete_session(client: TestClient, headers: dict[str, str], session_id: str) -> dict:
    response = client.post(f"/api/v1/workout-sessions/{session_id}/complete", headers=headers)
    assert response.status_code == 200
    return response.json()


def test_estimated_one_rep_max_uses_epley_formula_with_rep_limit() -> None:
    assert estimate_one_rep_max_kg(100, 5) == 116.67
    assert estimate_one_rep_max_kg(100, 12) == 140.0
    assert estimate_one_rep_max_kg(100, 13) is None
    assert estimate_one_rep_max_kg(100, 0) is None
    assert estimate_one_rep_max_kg(0, 5) is None


def test_exercise_analytics_empty_history(client: TestClient, auth_headers: dict[str, str]) -> None:
    exercise = first_exercise(client, auth_headers)

    options = client.get("/api/v1/exercise-analytics", headers=auth_headers)
    assert options.status_code == 200
    assert options.json() == []

    analytics = client.get(f"/api/v1/exercise-analytics/{exercise['id']}", headers=auth_headers)
    assert analytics.status_code == 200
    body = analytics.json()
    assert body["exercise"]["id"] == exercise["id"]
    assert body["estimated_one_rep_max_kg"] is None
    assert body["best_working_set"] is None
    assert body["heaviest_working_weight_kg"] is None
    assert body["total_working_volume_kg"] == 0
    assert body["trend"] == []


def test_exercise_analytics_filters_completed_working_sets(client: TestClient, auth_headers: dict[str, str]) -> None:
    exercise = first_exercise(client, auth_headers)
    template = create_template(client, auth_headers, exercise["id"])

    first_session = start_session(client, auth_headers, template["id"])
    log_set(client, auth_headers, first_session, weight_kg=100, repetitions=5)
    log_set(client, auth_headers, first_session, weight_kg=90, repetitions=15)
    log_set(client, auth_headers, first_session, weight_kg=200, repetitions=1, set_type="warmup")
    log_set(client, auth_headers, first_session, weight_kg=120, repetitions=8, set_type="dropset")
    log_set(client, auth_headers, first_session, weight_kg=125, repetitions=8, set_type="failure")
    log_set(client, auth_headers, first_session, weight_kg=130, repetitions=1, is_completed=False)
    log_set(client, auth_headers, first_session, weight_kg=0, repetitions=10)
    complete_session(client, auth_headers, first_session["id"])

    second_session = start_session(client, auth_headers, template["id"])
    log_set(client, auth_headers, second_session, weight_kg=105, repetitions=5)
    complete_session(client, auth_headers, second_session["id"])

    response = client.get(f"/api/v1/exercise-analytics/{exercise['id']}", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["estimated_one_rep_max_kg"] == 122.5
    assert body["best_working_set"]["weight_kg"] == 105
    assert body["best_working_set"]["repetitions"] == 5
    assert body["heaviest_working_weight_kg"] == 105
    assert body["total_working_volume_kg"] == 2375
    assert len(body["trend"]) == 2
    assert body["trend"][0]["best_estimated_one_rep_max_kg"] == 116.67
    assert body["trend"][0]["total_volume_kg"] == 1850
    assert body["trend"][1]["best_estimated_one_rep_max_kg"] == 122.5
    assert body["trend"][1]["total_volume_kg"] == 525

    options = client.get("/api/v1/exercise-analytics", headers=auth_headers)
    assert options.status_code == 200
    assert options.json()[0]["exercise"]["id"] == exercise["id"]
    assert options.json()[0]["completed_sessions"] == 2
    assert options.json()[0]["latest_estimated_one_rep_max_kg"] == 122.5


def test_exercise_analytics_ownership_isolation(client: TestClient, auth_headers: dict[str, str]) -> None:
    other_headers = register(client, "exercise-analytics-other@example.com")
    custom = client.post(
        "/api/v1/exercises",
        headers=auth_headers,
        json={
            "name": "Private Analytics Press",
            "primary_muscle_group": "chest",
            "equipment": "barbell",
            "movement_pattern": "horizontal push",
        },
    )
    assert custom.status_code == 201
    template = create_template(client, auth_headers, custom.json()["id"], name="Private Analytics")
    session = start_session(client, auth_headers, template["id"])
    log_set(client, auth_headers, session, weight_kg=80, repetitions=6)
    complete_session(client, auth_headers, session["id"])

    owner_response = client.get(f"/api/v1/exercise-analytics/{custom.json()['id']}", headers=auth_headers)
    assert owner_response.status_code == 200
    assert owner_response.json()["estimated_one_rep_max_kg"] == 96.0

    other_list = client.get("/api/v1/exercise-analytics", headers=other_headers)
    assert other_list.status_code == 200
    assert other_list.json() == []

    blocked = client.get(f"/api/v1/exercise-analytics/{custom.json()['id']}", headers=other_headers)
    assert blocked.status_code == 404
