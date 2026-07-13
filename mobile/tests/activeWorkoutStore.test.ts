import { createClientMutationId, restTimerRemainingSeconds, useActiveWorkoutStore } from "@/stores/activeWorkoutStore";

beforeEach(() => {
  useActiveWorkoutStore.getState().clear();
  jest.useRealTimers();
});

test("persists active workout draft values in store state", () => {
  useActiveWorkoutStore.getState().setSession("session-1");
  useActiveWorkoutStore.getState().updateDraft("exercise-1", {
    weight: "80",
    repetitions: "10",
    rpe: "8",
    note: "Pause reps",
    unit: "kg"
  });

  expect(useActiveWorkoutStore.getState().sessionId).toBe("session-1");
  expect(useActiveWorkoutStore.getState().drafts["exercise-1"]).toMatchObject({
    weight: "80",
    repetitions: "10",
    rpe: "8",
    note: "Pause reps",
    setType: "working",
    unit: "kg"
  });
});

test("tracks pending, failed, and synced set submissions", () => {
  const clientMutationId = createClientMutationId("test-set");
  useActiveWorkoutStore.getState().queueSet({
    clientMutationId,
    sessionId: "session-1",
    sessionExerciseId: "session-exercise-1",
    weight: "135",
    repetitions: "10",
    rpe: "8",
    note: "",
    setType: "working",
    unit: "lb",
    status: "pending",
    errorMessage: null,
    createdAt: 1000
  });

  useActiveWorkoutStore.getState().markSetFailed(clientMutationId, "Offline");
  expect(useActiveWorkoutStore.getState().pendingSets[clientMutationId]).toMatchObject({
    status: "failed",
    errorMessage: "Offline"
  });

  useActiveWorkoutStore.getState().markSetPending(clientMutationId);
  expect(useActiveWorkoutStore.getState().pendingSets[clientMutationId]).toMatchObject({
    status: "pending",
    errorMessage: null
  });

  useActiveWorkoutStore.getState().markSetSynced(clientMutationId);
  expect(useActiveWorkoutStore.getState().pendingSets[clientMutationId]).toBeUndefined();
});

test("reconciles pending sets once backend returns matching client mutation ids", () => {
  useActiveWorkoutStore.getState().setSession("session-1");
  useActiveWorkoutStore.getState().queueSet({
    clientMutationId: "set-offline-retry",
    sessionId: "session-1",
    sessionExerciseId: "session-exercise-1",
    weight: "135",
    repetitions: "10",
    rpe: "8",
    note: "",
    setType: "working",
    unit: "lb",
    status: "failed",
    errorMessage: "Offline",
    createdAt: 1000
  });

  useActiveWorkoutStore.getState().reconcileSyncedSets("session-1", ["set-offline-retry"]);

  expect(useActiveWorkoutStore.getState().pendingSets["set-offline-retry"]).toBeUndefined();
  expect(useActiveWorkoutStore.getState().sessionId).toBe("session-1");
});

test("recovers rest timer remaining time from timestamps", () => {
  jest.useFakeTimers().setSystemTime(1_000);

  useActiveWorkoutStore.getState().startRestTimer("session-1", "exercise-1", 120);
  const timer = useActiveWorkoutStore.getState().restTimer;

  expect(restTimerRemainingSeconds(timer, 31_000)).toBe(90);
  expect(restTimerRemainingSeconds(timer, 150_000)).toBe(0);
});
