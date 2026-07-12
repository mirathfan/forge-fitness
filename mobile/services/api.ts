import { clearToken, getToken, setToken } from "@/services/tokenStore";
import {
  ExerciseList,
  ExerciseSet,
  ExerciseSetInput,
  PreviousPerformanceSet,
  Profile,
  Recommendation,
  TemplateExerciseInput,
  Token,
  User,
  WorkoutHistoryList,
  WorkoutSession,
  WorkoutTemplate
} from "@/types/api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.auth !== false) {
    const token = await getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (response.status === 401) {
    await clearToken();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, typeof body.detail === "string" ? body.detail : "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  async register(email: string, password: string): Promise<Token> {
    const token = await request<Token>("/auth/register", { method: "POST", body: { email, password }, auth: false });
    await setToken(token.access_token);
    return token;
  },
  async login(email: string, password: string): Promise<Token> {
    const token = await request<Token>("/auth/login", { method: "POST", body: { email, password }, auth: false });
    await setToken(token.access_token);
    return token;
  },
  me: () => request<User>("/auth/me"),
  profile: () => request<Profile>("/profiles/me"),
  updateProfile: (payload: Omit<Profile, "id" | "created_at" | "updated_at">) =>
    request<Profile>("/profiles/me", { method: "PUT", body: payload }),
  exercises: (params: { search?: string; muscle_group?: string; equipment?: string } = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    return request<ExerciseList>(`/exercises?${search.toString()}`);
  },
  templates: () => request<WorkoutTemplate[]>("/workout-templates"),
  template: (templateId: string) => request<WorkoutTemplate>(`/workout-templates/${templateId}`),
  createTemplate: (payload: { name: string; description?: string | null; exercises: TemplateExerciseInput[] }) =>
    request<WorkoutTemplate>("/workout-templates", { method: "POST", body: payload }),
  updateTemplate: (
    templateId: string,
    payload: { name: string; description?: string | null; exercises: TemplateExerciseInput[] }
  ) => request<WorkoutTemplate>(`/workout-templates/${templateId}`, { method: "PUT", body: payload }),
  deleteTemplate: (templateId: string) =>
    request<void>(`/workout-templates/${templateId}`, { method: "DELETE" }),
  startWorkout: (payload: { workout_template_id?: string | null; name?: string | null }) =>
    request<WorkoutSession>("/workout-sessions", { method: "POST", body: payload }),
  workoutSessions: (status?: string) =>
    request<WorkoutHistoryList>(`/workout-sessions${status ? `?status=${status}` : ""}`),
  workoutSession: (sessionId: string) => request<WorkoutSession>(`/workout-sessions/${sessionId}`),
  addSet: (sessionId: string, sessionExerciseId: string, payload: ExerciseSetInput) =>
    request<ExerciseSet>(`/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`, {
      method: "POST",
      body: payload
    }),
  updateSet: (sessionId: string, setId: string, payload: ExerciseSetInput & { set_number?: number }) =>
    request<ExerciseSet>(`/workout-sessions/${sessionId}/sets/${setId}`, { method: "PUT", body: payload }),
  deleteSet: (sessionId: string, setId: string) =>
    request<void>(`/workout-sessions/${sessionId}/sets/${setId}`, { method: "DELETE" }),
  completeWorkout: (sessionId: string) =>
    request<WorkoutSession>(`/workout-sessions/${sessionId}/complete`, { method: "POST" }),
  abandonWorkout: (sessionId: string) =>
    request<WorkoutSession>(`/workout-sessions/${sessionId}/abandon`, { method: "POST" }),
  previousPerformance: (exerciseId: string) =>
    request<PreviousPerformanceSet[]>(`/exercises/${exerciseId}/previous-performance`),
  recommendations: () => request<Recommendation[]>("/recommendations")
};
