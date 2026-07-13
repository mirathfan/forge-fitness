import { api, ApiError, NetworkError } from "@/services/api";

afterEach(() => {
  jest.restoreAllMocks();
});

test("maps API error responses to ApiError", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    status: 422,
    json: async () => ({ detail: "Validation failed" })
  } as Response);

  await expect(api.me()).rejects.toEqual(expect.any(ApiError));
  await expect(api.me()).rejects.toMatchObject({ status: 422, detail: "Validation failed" });
});

test("maps fetch failures to NetworkError", async () => {
  jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network request failed"));

  await expect(api.me()).rejects.toEqual(expect.any(NetworkError));
  await expect(api.me()).rejects.toMatchObject({
    message: "You appear to be offline. Check your connection and try again."
  });
});

test("sends bodyweight requests with typed payloads and filters", async () => {
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ items: [], total: 0, limit: 10, offset: 0 })
  } as Response);

  await api.bodyweightEntries({ start_date: "2026-07-01", end_date: "2026-07-31", limit: 10, offset: 0 });

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8000/api/v1/bodyweight-entries?start_date=2026-07-01&end_date=2026-07-31&limit=10&offset=0",
    expect.any(Object)
  );

  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 201,
    json: async () => ({ id: "entry", measured_date: "2026-07-12", weight_kg: 82.5, note: null })
  } as Response);

  await api.createBodyweightEntry({ measured_date: "2026-07-12", weight_kg: 82.5, note: null });

  expect(fetchMock).toHaveBeenLastCalledWith(
    "http://localhost:8000/api/v1/bodyweight-entries",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ measured_date: "2026-07-12", weight_kg: 82.5, note: null })
    })
  );
});

test("requests exercise analytics endpoints", async () => {
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => []
  } as Response);

  await api.exerciseAnalyticsOptions();

  expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/exercise-analytics", expect.any(Object));

  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      exercise: { id: "bench" },
      estimated_one_rep_max_kg: null,
      best_working_set: null,
      heaviest_working_weight_kg: null,
      total_working_volume_kg: 0,
      trend: []
    })
  } as Response);

  await api.exerciseAnalytics("bench");

  expect(fetchMock).toHaveBeenLastCalledWith(
    "http://localhost:8000/api/v1/exercise-analytics/bench",
    expect.any(Object)
  );
});

test("sends client mutation ids with set creation requests", async () => {
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ id: "set-1", client_mutation_id: "set-client-1" })
  } as Response);

  await api.addSet("session-1", "session-exercise-1", {
    set_type: "working",
    weight_kg: 61.23,
    repetitions: 10,
    rpe: 8,
    reps_in_reserve: null,
    is_completed: true,
    client_mutation_id: "set-client-1"
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8000/api/v1/workout-sessions/session-1/exercises/session-exercise-1/sets",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        set_type: "working",
        weight_kg: 61.23,
        repetitions: 10,
        rpe: 8,
        reps_in_reserve: null,
        is_completed: true,
        client_mutation_id: "set-client-1"
      })
    })
  );
});
