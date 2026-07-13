from fastapi.testclient import TestClient


def register(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "strong-password"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_entry(
    client: TestClient,
    headers: dict[str, str],
    measured_date: str,
    weight_kg: float,
    note: str | None = None,
) -> dict:
    response = client.post(
        "/api/v1/bodyweight-entries",
        headers=headers,
        json={"measured_date": measured_date, "weight_kg": weight_kg, "note": note},
    )
    assert response.status_code == 201
    return response.json()


def test_bodyweight_create_read_update_and_delete(client: TestClient, auth_headers: dict[str, str]) -> None:
    entry = create_entry(client, auth_headers, "2026-07-01", 82.5, " Morning weigh-in ")

    listed = client.get("/api/v1/bodyweight-entries", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == entry["id"]
    assert listed.json()["items"][0]["note"] == "Morning weigh-in"

    updated = client.put(
        f"/api/v1/bodyweight-entries/{entry['id']}",
        headers=auth_headers,
        json={"measured_date": "2026-07-02", "weight_kg": 82.1, "note": None},
    )
    assert updated.status_code == 200
    assert updated.json()["measured_date"] == "2026-07-02"
    assert updated.json()["weight_kg"] == 82.1
    assert updated.json()["note"] is None

    filtered = client.get(
        "/api/v1/bodyweight-entries?start_date=2026-07-02&end_date=2026-07-02",
        headers=auth_headers,
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1

    deleted = client.delete(f"/api/v1/bodyweight-entries/{entry['id']}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/bodyweight-entries", headers=auth_headers).json()["total"] == 0


def test_bodyweight_duplicate_date_behavior(client: TestClient, auth_headers: dict[str, str]) -> None:
    first = create_entry(client, auth_headers, "2026-07-01", 82.5)

    duplicate_create = client.post(
        "/api/v1/bodyweight-entries",
        headers=auth_headers,
        json={"measured_date": "2026-07-01", "weight_kg": 82.4},
    )
    assert duplicate_create.status_code == 409

    second = create_entry(client, auth_headers, "2026-07-02", 82.3)
    duplicate_update = client.put(
        f"/api/v1/bodyweight-entries/{second['id']}",
        headers=auth_headers,
        json={"measured_date": first["measured_date"]},
    )
    assert duplicate_update.status_code == 409


def test_bodyweight_ownership_isolation(client: TestClient, auth_headers: dict[str, str]) -> None:
    other_headers = register(client, "bodyweight-other@example.com")
    entry = create_entry(client, other_headers, "2026-07-01", 70.0)

    assert client.get("/api/v1/bodyweight-entries", headers=auth_headers).json()["total"] == 0
    blocked_update = client.put(
        f"/api/v1/bodyweight-entries/{entry['id']}",
        headers=auth_headers,
        json={"weight_kg": 90.0},
    )
    assert blocked_update.status_code == 404
    blocked_delete = client.delete(f"/api/v1/bodyweight-entries/{entry['id']}", headers=auth_headers)
    assert blocked_delete.status_code == 404


def test_bodyweight_pounds_to_kilograms_boundary_handling(client: TestClient, auth_headers: dict[str, str]) -> None:
    lb_to_kg = 1 / 2.2046226218

    below_minimum = client.post(
        "/api/v1/bodyweight-entries",
        headers=auth_headers,
        json={"measured_date": "2026-07-01", "weight_kg": round(55.0 * lb_to_kg, 2)},
    )
    assert below_minimum.status_code == 422

    accepted = client.post(
        "/api/v1/bodyweight-entries",
        headers=auth_headers,
        json={"measured_date": "2026-07-02", "weight_kg": round(55.2 * lb_to_kg, 2)},
    )
    assert accepted.status_code == 201
    assert accepted.json()["weight_kg"] == 25.04


def test_bodyweight_trend_calculates_average_and_direction(client: TestClient, auth_headers: dict[str, str]) -> None:
    weights = [80.0, 80.5, 81.0, 81.5, 82.0, 82.5, 83.0, 84.0]
    for day, weight in enumerate(weights, start=1):
        create_entry(client, auth_headers, f"2026-07-{day:02d}", weight)

    response = client.get("/api/v1/bodyweight-entries/trend", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["latest_weight_kg"] == 84.0
    assert body["rolling_average_7d_kg"] == 82.07
    assert body["change_7d_kg"] == 4.0
    assert body["change_30d_kg"] is None
    assert body["direction"] == "gaining"


def test_bodyweight_trend_handles_missing_days(client: TestClient, auth_headers: dict[str, str]) -> None:
    create_entry(client, auth_headers, "2026-07-01", 82.0)
    create_entry(client, auth_headers, "2026-07-05", 81.8)
    create_entry(client, auth_headers, "2026-07-08", 81.5)

    response = client.get("/api/v1/bodyweight-entries/trend", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["latest_weight_kg"] == 81.5
    assert body["rolling_average_7d_kg"] == 81.65
    assert body["change_7d_kg"] == -0.5
    assert body["change_30d_kg"] is None
    assert body["direction"] == "losing"
