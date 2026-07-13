import { PendingSet, emptyDraft } from "@/stores/activeWorkoutStore";
import { ExerciseSet, PreviousPerformanceSet } from "@/types/api";
import {
  formatRestTime,
  pendingSetToInput,
  prefillDraft
} from "@/utils/workoutReliability";

function set(overrides: Partial<ExerciseSet>): ExerciseSet {
  return {
    id: "set",
    workout_session_exercise_id: "session-exercise",
    set_number: 1,
    set_type: "working",
    weight_kg: 61.23,
    repetitions: 10,
    rpe: 8,
    reps_in_reserve: null,
    is_completed: true,
    client_mutation_id: null,
    completed_at: "2026-07-13T12:00:00Z",
    created_at: "2026-07-13T12:00:00Z",
    updated_at: "2026-07-13T12:00:00Z",
    ...overrides
  };
}

function previous(overrides: Partial<PreviousPerformanceSet>): PreviousPerformanceSet {
  return {
    session_id: "session",
    completed_at: "2026-07-13T12:00:00Z",
    weight_kg: 80,
    repetitions: 8,
    rpe: 7,
    set_type: "working",
    ...overrides
  };
}

test("prefills from prior set before previous performance", () => {
  const draft = prefillDraft(undefined, [set({ weight_kg: 90, repetitions: 5, rpe: 8 })], [previous({})], "kg");

  expect(draft).toMatchObject({ weight: "90", repetitions: "5", rpe: "8", setType: "working", unit: "kg" });
});

test("prefills from previous performance when no prior set exists", () => {
  const draft = prefillDraft(undefined, [], [previous({ weight_kg: 61.23, repetitions: 10, rpe: 8 })], "lb");

  expect(draft).toMatchObject({ weight: "135", repetitions: "10", rpe: "8", setType: "working", unit: "lb" });
});

test("preserves entered draft values instead of overwriting them", () => {
  const draft = prefillDraft({ ...emptyDraft, weight: "100", repetitions: "3", unit: "kg" }, [set({})], [previous({})], "kg");

  expect(draft.weight).toBe("100");
  expect(draft.repetitions).toBe("3");
});

test("keeps prefilled values when only one restored draft field exists", () => {
  const draft = prefillDraft({ ...emptyDraft, repetitions: "6", unit: "kg" }, [set({ weight_kg: 90 })], [], "kg");

  expect(draft.weight).toBe("90");
  expect(draft.repetitions).toBe("6");
});

test("uses restored pending set unit for submission conversion", () => {
  const pending: PendingSet = {
    ...emptyDraft,
    clientMutationId: "set-restored-unit",
    sessionId: "session",
    sessionExerciseId: "session-exercise",
    weight: "135",
    repetitions: "10",
    rpe: "8",
    setType: "working",
    unit: "lb",
    status: "pending",
    errorMessage: null,
    createdAt: 1
  };

  expect(pendingSetToInput(pending, "kg")).toMatchObject({
    weight_kg: 61.23,
    repetitions: 10,
    rpe: 8,
    client_mutation_id: "set-restored-unit"
  });
});

test("formats rest timer display", () => {
  expect(formatRestTime(75)).toBe("1:15");
});
