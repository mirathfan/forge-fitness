import {
  buildBodyweightChartPoints,
  buildWeeklyTrainingStats,
  findBodyweightEntryForDate,
  startDateForRange
} from "@/utils/progressAnalytics";
import { BodyweightEntry, WorkoutSession } from "@/types/api";

function entry(measuredDate: string, weightKg: number): BodyweightEntry {
  return {
    id: measuredDate,
    measured_date: measuredDate,
    weight_kg: weightKg,
    note: null,
    created_at: `${measuredDate}T12:00:00Z`,
    updated_at: `${measuredDate}T12:00:00Z`
  };
}

function workout(completedAt: string | null, sets: WorkoutSession["exercises"][number]["sets"]): WorkoutSession {
  return {
    id: completedAt ?? "active",
    workout_template_id: null,
    name: "Test workout",
    status: completedAt ? "completed" : "active",
    started_at: "2026-07-01T12:00:00Z",
    completed_at: completedAt,
    notes: null,
    total_duration_seconds: 3600,
    created_at: "2026-07-01T12:00:00Z",
    updated_at: "2026-07-01T12:00:00Z",
    exercises: [
      {
        id: "session-exercise",
        exercise_id: "exercise",
        position: 0,
        notes: null,
        exercise: {
          id: "exercise",
          name: "Barbell Bench Press",
          primary_muscle_group: "chest",
          secondary_muscle_groups: [],
          equipment: "barbell",
          movement_pattern: "horizontal push",
          instructions: null,
          is_custom: false,
          created_by_user_id: null,
          created_at: "2026-07-01T12:00:00Z",
          updated_at: "2026-07-01T12:00:00Z"
        },
        sets
      }
    ]
  };
}

test("builds seven-record rolling averages without inventing missing dates", () => {
  const today = new Date("2026-07-10T12:00:00");
  const points = buildBodyweightChartPoints(
    [
      entry("2026-07-01", 80),
      entry("2026-07-03", 81),
      entry("2026-07-04", 82),
      entry("2026-07-05", 83),
      entry("2026-07-06", 84),
      entry("2026-07-07", 85),
      entry("2026-07-08", 86),
      entry("2026-07-10", 87)
    ],
    30,
    today
  );

  expect(points.map((point) => point.measuredDate)).toEqual([
    "2026-07-01",
    "2026-07-03",
    "2026-07-04",
    "2026-07-05",
    "2026-07-06",
    "2026-07-07",
    "2026-07-08",
    "2026-07-10"
  ]);
  expect(points[0].rollingAverageKg).toBe(80);
  expect(points[6].rollingAverageKg).toBe(83);
  expect(points[7].rollingAverageKg).toBe(84);
});

test("filters bodyweight chart points to the selected range", () => {
  const today = new Date("2026-07-10T12:00:00");
  const points = buildBodyweightChartPoints(
    [entry("2026-06-10", 78), entry("2026-07-04", 80), entry("2026-07-10", 81)],
    7,
    today
  );

  expect(startDateForRange(7, today)).toBe("2026-07-04");
  expect(points.map((point) => point.measuredDate)).toEqual(["2026-07-04", "2026-07-10"]);
});

test("finds an existing bodyweight entry for duplicate-date editing", () => {
  const existing = entry("2026-07-10", 81);
  expect(findBodyweightEntryForDate([existing], "2026-07-10")).toBe(existing);
  expect(findBodyweightEntryForDate([existing], "2026-07-11")).toBeNull();
});

test("weekly training stats include only completed valid working sets", () => {
  const stats = buildWeeklyTrainingStats(
    [
      workout("2026-07-10T18:00:00Z", [
        {
          id: "1",
          workout_session_exercise_id: "session-exercise",
          set_number: 1,
          set_type: "working",
          weight_kg: 100,
          repetitions: 5,
          rpe: 8,
          reps_in_reserve: null,
          is_completed: true,
          completed_at: "2026-07-10T18:00:00Z",
          created_at: "2026-07-10T18:00:00Z",
          updated_at: "2026-07-10T18:00:00Z"
        },
        {
          id: "2",
          workout_session_exercise_id: "session-exercise",
          set_number: 2,
          set_type: "warmup",
          weight_kg: 200,
          repetitions: 1,
          rpe: 8,
          reps_in_reserve: null,
          is_completed: true,
          completed_at: "2026-07-10T18:00:00Z",
          created_at: "2026-07-10T18:00:00Z",
          updated_at: "2026-07-10T18:00:00Z"
        },
        {
          id: "3",
          workout_session_exercise_id: "session-exercise",
          set_number: 3,
          set_type: "working",
          weight_kg: 120,
          repetitions: 3,
          rpe: 8,
          reps_in_reserve: null,
          is_completed: false,
          completed_at: null,
          created_at: "2026-07-10T18:00:00Z",
          updated_at: "2026-07-10T18:00:00Z"
        }
      ]),
      workout("2026-06-30T18:00:00Z", [
        {
          id: "old",
          workout_session_exercise_id: "session-exercise",
          set_number: 1,
          set_type: "working",
          weight_kg: 100,
          repetitions: 5,
          rpe: 8,
          reps_in_reserve: null,
          is_completed: true,
          completed_at: "2026-06-30T18:00:00Z",
          created_at: "2026-06-30T18:00:00Z",
          updated_at: "2026-06-30T18:00:00Z"
        }
      ])
    ],
    new Date("2026-07-10T12:00:00")
  );

  expect(stats).toEqual({ completedWorkouts: 1, workingSets: 1, volumeKg: 500 });
});
