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
