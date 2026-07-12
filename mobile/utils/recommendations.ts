import { Recommendation } from "@/types/api";
import { WeightUnit } from "@/types/api";
import { displayWeight } from "@/utils/units";

export function formatRecommendation(recommendation: Recommendation, unit: WeightUnit = "kg"): string {
  if (recommendation.recommendation_type === "increase_weight" && recommendation.recommended_weight_kg) {
    return `${recommendation.exercise.name}: increase to ${displayWeight(recommendation.recommended_weight_kg, unit)}`;
  }
  if (recommendation.recommendation_type === "reduce_weight" && recommendation.recommended_weight_kg) {
    return `${recommendation.exercise.name}: reduce to ${displayWeight(recommendation.recommended_weight_kg, unit)}`;
  }
  if (recommendation.recommendation_type === "plateau") {
    return `${recommendation.exercise.name}: plateau detected`;
  }
  return `${recommendation.exercise.name}: maintain and improve reps`;
}

export function formatRecommendationExplanation(recommendation: Recommendation, unit: WeightUnit = "kg"): string {
  if (unit === "kg") return recommendation.explanation;
  return recommendation.explanation.replace(/(\d+(?:\.\d+)?) kg/g, (_match, value: string) =>
    displayWeight(Number(value), unit)
  );
}
