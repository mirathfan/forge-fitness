import { api, ApiError } from "@/services/api";

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
