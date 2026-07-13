from fastapi.testclient import TestClient


def register(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "strong-password"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def first_exercise(client: TestClient, headers: dict[str, str]) -> dict:
    response = client.get("/api/v1/exercises?search=bench", headers=headers)
    assert response.status_code == 200
    return response.json()["items"][0]


def create_active_session(client: TestClient, headers: dict[str, str]) -> tuple[dict, dict]:
    exercise = first_exercise(client, headers)
    template = client.post(
        "/api/v1/workout-templates",
        headers=headers,
        json={"name": "Reliable Push", "exercises": [{"exercise_id": exercise["id"], "position": 0}]},
    )
    assert template.status_code == 201
    session = client.post(
        "/api/v1/workout-sessions",
        headers=headers,
        json={"workout_template_id": template.json()["id"]},
    )
    assert session.status_code == 201
    return session.json(), exercise


def add_set(
    client: TestClient,
    headers: dict[str, str],
    session: dict,
    client_mutation_id: str,
) -> dict:
    response = client.post(
        f"/api/v1/workout-sessions/{session['id']}/exercises/{session['exercises'][0]['id']}/sets",
        headers=headers,
        json={
            "set_type": "working",
            "weight_kg": 61.23,
            "repetitions": 10,
            "rpe": 8,
            "is_completed": True,
            "client_mutation_id": client_mutation_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_duplicate_set_submission_returns_existing_set(client: TestClient, auth_headers: dict[str, str]) -> None:
    session, _ = create_active_session(client, auth_headers)

    first = add_set(client, auth_headers, session, "set-mutation-duplicate")
    retry = add_set(client, auth_headers, session, "set-mutation-duplicate")

    assert retry["id"] == first["id"]
    assert retry["set_number"] == first["set_number"]
    assert retry["client_mutation_id"] == "set-mutation-duplicate"

    fetched = client.get(f"/api/v1/workout-sessions/{session['id']}", headers=auth_headers)
    assert fetched.status_code == 200
    assert len(fetched.json()["exercises"][0]["sets"]) == 1


def test_lost_response_retry_after_completion_recovers_existing_set(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    session, _ = create_active_session(client, auth_headers)
    first = add_set(client, auth_headers, session, "set-mutation-lost-response")

    completed = client.post(f"/api/v1/workout-sessions/{session['id']}/complete", headers=auth_headers)
    assert completed.status_code == 200

    retry = add_set(client, auth_headers, session, "set-mutation-lost-response")
    assert retry["id"] == first["id"]

    new_set_after_completion = client.post(
        f"/api/v1/workout-sessions/{session['id']}/exercises/{session['exercises'][0]['id']}/sets",
        headers=auth_headers,
        json={
            "set_type": "working",
            "weight_kg": 61.23,
            "repetitions": 9,
            "is_completed": True,
            "client_mutation_id": "set-mutation-new-after-complete",
        },
    )
    assert new_set_after_completion.status_code == 409


def test_duplicate_completion_is_idempotent(client: TestClient, auth_headers: dict[str, str]) -> None:
    session, _ = create_active_session(client, auth_headers)
    add_set(client, auth_headers, session, "set-mutation-completion")

    first = client.post(f"/api/v1/workout-sessions/{session['id']}/complete", headers=auth_headers)
    retry = client.post(f"/api/v1/workout-sessions/{session['id']}/complete", headers=auth_headers)

    assert first.status_code == 200
    assert retry.status_code == 200
    assert retry.json()["id"] == session["id"]
    assert retry.json()["status"] == "completed"

    recommendations = client.get("/api/v1/recommendations", headers=auth_headers)
    assert recommendations.status_code == 200
    assert len(recommendations.json()) == 1


def test_idempotent_set_creation_preserves_ownership_isolation(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    owner_headers = register(client, "reliable-owner@example.com")
    session, _ = create_active_session(client, owner_headers)

    blocked = client.post(
        f"/api/v1/workout-sessions/{session['id']}/exercises/{session['exercises'][0]['id']}/sets",
        headers=auth_headers,
        json={
            "set_type": "working",
            "weight_kg": 100,
            "repetitions": 1,
            "is_completed": True,
            "client_mutation_id": "set-mutation-cross-user",
        },
    )
    assert blocked.status_code == 404
