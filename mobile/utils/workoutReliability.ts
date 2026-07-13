import { ApiError, NetworkError } from "@/services/api";
import { PendingSet, SetDraft, emptyDraft } from "@/stores/activeWorkoutStore";
import { ExerciseSet, PreviousPerformanceSet, SetType, WeightUnit } from "@/types/api";
import { displayWeight, inputWeightToKg, kgToLb } from "@/utils/units";

export function friendlyWorkoutError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "You're offline. Your set is saved locally and can be retried.";
  }
  if (error instanceof ApiError) {
    if (error.status === 409) return "The workout state changed. Refresh and try again.";
    if (error.status === 404) return "This workout could not be found.";
    if (error.status >= 500) return "The server had trouble. Try again in a moment.";
  }
  return "Something went wrong. Try again.";
}

export function draftWeightFromKg(weightKg: number, unit: WeightUnit): string {
  const value = unit === "lb" ? kgToLb(weightKg) : weightKg;
  return Number(value.toFixed(1)).toString();
}

export function prefillDraft(
  draft: SetDraft | undefined,
  existingSets: ExerciseSet[],
  previousPerformance: PreviousPerformanceSet[] | undefined,
  unit: WeightUnit
): SetDraft {
  const priorSet = [...existingSets]
    .filter((set) => set.set_type === "working" && set.weight_kg > 0 && set.repetitions > 0)
    .sort((first, second) => second.set_number - first.set_number)[0];
  const previousSet = previousPerformance?.find((set) => set.set_type === "working" && set.weight_kg > 0);
  const source = priorSet ?? previousSet;
  const prefilled = source
    ? {
        weight: draftWeightFromKg(source.weight_kg, unit),
        repetitions: source.repetitions ? String(source.repetitions) : "",
        rpe: source.rpe == null ? "" : String(source.rpe),
        note: "",
        setType: "working" as const,
        unit
      }
    : emptyDraft;
  if (!draft) return prefilled;
  return {
    weight: draft.weight || prefilled.weight,
    repetitions: draft.repetitions || prefilled.repetitions,
    rpe: draft.rpe || prefilled.rpe,
    note: draft.note,
    setType: draft.setType ?? prefilled.setType,
    unit: draft.unit ?? prefilled.unit
  };
}

export function pendingSetToInput(pending: PendingSet, unit: WeightUnit) {
  const inputUnit = pending.unit ?? unit;
  return {
    set_type: pending.setType as SetType,
    weight_kg: Number(inputWeightToKg(pending.weight, inputUnit).toFixed(2)),
    repetitions: Number.parseInt(pending.repetitions, 10) || 0,
    rpe: pending.rpe ? Number.parseFloat(pending.rpe) : null,
    reps_in_reserve: null,
    is_completed: true,
    client_mutation_id: pending.clientMutationId
  };
}

export function isDraftSubmittable(draft: SetDraft): boolean {
  return Number.parseFloat(draft.weight) > 0 && (Number.parseInt(draft.repetitions, 10) || 0) > 0;
}

export function formatRestTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function syncedSetLabel(set: ExerciseSet, unit: WeightUnit): string {
  return `${displayWeight(set.weight_kg, unit)} x ${set.repetitions}`;
}
