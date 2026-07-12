import { useActiveWorkoutStore } from "@/stores/activeWorkoutStore";

beforeEach(() => {
  useActiveWorkoutStore.getState().clear();
});

test("persists active workout draft values in store state", () => {
  useActiveWorkoutStore.getState().setSession("session-1");
  useActiveWorkoutStore.getState().updateDraft("exercise-1", { weight: "80", repetitions: "10", rpe: "8" });

  expect(useActiveWorkoutStore.getState().sessionId).toBe("session-1");
  expect(useActiveWorkoutStore.getState().drafts["exercise-1"]).toMatchObject({
    weight: "80",
    repetitions: "10",
    rpe: "8",
    setType: "working"
  });
});
