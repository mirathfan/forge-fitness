import { Recommendation } from "@/types/api";
import { formatRecommendation, formatRecommendationExplanation } from "@/utils/recommendations";

const baseRecommendation: Recommendation = {
  id: "rec",
  exercise_id: "ex",
  source_workout_session_id: "session",
  recommendation_type: "increase_weight",
  current_weight_kg: 80,
  recommended_weight_kg: 82.5,
  explanation: "Ready to increase.",
  created_at: "2026-07-11T00:00:00Z",
  exercise: {
    id: "ex",
    name: "Barbell Bench Press",
    primary_muscle_group: "chest",
    secondary_muscle_groups: [],
    equipment: "barbell",
    movement_pattern: "horizontal press",
    instructions: null,
    is_custom: false,
    created_by_user_id: null,
    created_at: "2026-07-11T00:00:00Z",
    updated_at: "2026-07-11T00:00:00Z"
  }
};

test("formats increase recommendation with preferred unit", () => {
  expect(formatRecommendation(baseRecommendation, "kg")).toContain("82.5 kg");
  expect(formatRecommendation(baseRecommendation, "lb")).toContain("181.9 lb");
});

test("formats plateau recommendation", () => {
  expect(formatRecommendation({ ...baseRecommendation, recommendation_type: "plateau", recommended_weight_kg: null })).toContain(
    "plateau"
  );
});

test("formats recommendation explanation with preferred unit", () => {
  const explanation = formatRecommendationExplanation(
    {
      ...baseRecommendation,
      recommendation_type: "maintain",
      current_weight_kg: 61.23,
      recommended_weight_kg: null,
      explanation: "Keep 61.23 kg and aim to add reps before increasing by 2.5 kg."
    },
    "lb"
  );

  expect(explanation).toBe("Keep 135.0 lb and aim to add reps before increasing by 5.5 lb.");
});
