from fastapi.testclient import TestClient


def auth_headers(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "strong-password"})
    assert response.status_code == 201

    login = client.post("/api/v1/auth/login", json={"email": email, "password": "strong-password"})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_complete_push_day_flow_and_user_isolation(client: TestClient) -> None:
    athlete_headers = auth_headers(client, "flow-athlete@example.com")

    me = client.get("/api/v1/auth/me", headers=athlete_headers)
    assert me.status_code == 200
    assert me.json()["email"] == "flow-athlete@example.com"

    profile = client.put(
        "/api/v1/profiles/me",
        headers=athlete_headers,
        json={
            "display_name": "Swagger Flow Athlete",
            "date_of_birth": "1994-03-05",
            "height_cm": 180,
            "current_weight_kg": 82.5,
            "preferred_weight_unit": "lb",
            "fitness_goal": "improve_strength",
            "experience_level": "intermediate",
        },
    )
    assert profile.status_code == 200
    assert profile.json()["preferred_weight_unit"] == "lb"

    exercises = client.get("/api/v1/exercises?limit=10", headers=athlete_headers)
    assert exercises.status_code == 200
    assert exercises.json()["total"] >= 30

    bench_search = client.get(
        "/api/v1/exercises?search=Barbell+Bench+Press&muscle_group=chest&equipment=barbell",
        headers=athlete_headers,
    )
    assert bench_search.status_code == 200
    bench = next(item for item in bench_search.json()["items"] if item["name"] == "Barbell Bench Press")

    template = client.post(
        "/api/v1/workout-templates",
        headers=athlete_headers,
        json={
            "name": "Push Day",
            "description": "Scripted verification push workout",
            "exercises": [
                {
                    "exercise_id": bench["id"],
                    "position": 0,
                    "target_sets": 3,
                    "target_reps_min": 8,
                    "target_reps_max": 10,
                    "target_rpe": 8,
                    "rest_seconds": 120,
                    "notes": "Bench press work sets",
                }
            ],
        },
    )
    assert template.status_code == 201
    template_id = template.json()["id"]

    session = client.post(
        "/api/v1/workout-sessions",
        headers=athlete_headers,
        json={"workout_template_id": template_id},
    )
    assert session.status_code == 201
    session_id = session.json()["id"]
    session_exercise_id = session.json()["exercises"][0]["id"]

    for reps in (10, 9, 8):
        logged = client.post(
            f"/api/v1/workout-sessions/{session_id}/exercises/{session_exercise_id}/sets",
            headers=athlete_headers,
            json={
                "set_type": "working",
                "weight_kg": 61.23,
                "repetitions": reps,
                "rpe": 8,
                "reps_in_reserve": None,
                "is_completed": True,
            },
        )
        assert logged.status_code == 201

    completed = client.post(f"/api/v1/workout-sessions/{session_id}/complete", headers=athlete_headers)
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

    history = client.get("/api/v1/workout-sessions?status=completed", headers=athlete_headers)
    assert history.status_code == 200
    assert history.json()["total"] == 1

    previous = client.get(f"/api/v1/exercises/{bench['id']}/previous-performance", headers=athlete_headers)
    assert previous.status_code == 200
    assert [set_["repetitions"] for set_ in previous.json()] == [10, 9, 8]
    assert {set_["weight_kg"] for set_ in previous.json()} == {61.23}

    recommendations = client.get("/api/v1/recommendations", headers=athlete_headers)
    assert recommendations.status_code == 200
    recommendation = recommendations.json()[0]
    assert recommendation["source_workout_session_id"] == session_id
    assert recommendation["recommendation_type"] == "maintain"
    assert recommendation["recommended_weight_kg"] == 61.23

    other_headers = auth_headers(client, "flow-other@example.com")
    assert client.get(f"/api/v1/workout-templates/{template_id}", headers=other_headers).status_code == 404
    assert client.get(f"/api/v1/workout-sessions/{session_id}", headers=other_headers).status_code == 404
    assert client.get(f"/api/v1/recommendations/{recommendation['id']}", headers=other_headers).status_code == 404
    assert client.get("/api/v1/workout-templates", headers=other_headers).json() == []
    assert client.get("/api/v1/workout-sessions?status=completed", headers=other_headers).json()["total"] == 0
    assert client.get("/api/v1/recommendations", headers=other_headers).json() == []
