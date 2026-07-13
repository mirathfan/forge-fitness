import { BodyweightEntry, WorkoutSession } from "@/types/api";

export type BodyweightRangeDays = 7 | 30 | 90;

export type BodyweightChartPoint = {
  measuredDate: string;
  weightKg: number;
  rollingAverageKg: number;
};

export type WeeklyTrainingStats = {
  completedWorkouts: number;
  workingSets: number;
  volumeKg: number;
};

export function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromLocalISO(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function formatDate(value: string): string {
  return dateFromLocalISO(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function daysBetween(startDate: string, endDate: string): number {
  const milliseconds = dateFromLocalISO(endDate).getTime() - dateFromLocalISO(startDate).getTime();
  return Math.round(milliseconds / 86_400_000);
}

export function startDateForRange(rangeDays: BodyweightRangeDays, today = new Date()): string {
  const start = new Date(today);
  start.setDate(start.getDate() - (rangeDays - 1));
  return localDateISO(start);
}

export function findBodyweightEntryForDate(entries: BodyweightEntry[], measuredDate: string): BodyweightEntry | null {
  return entries.find((entry) => entry.measured_date === measuredDate) ?? null;
}

export function buildBodyweightChartPoints(
  entries: BodyweightEntry[],
  rangeDays: BodyweightRangeDays,
  today = new Date()
): BodyweightChartPoint[] {
  const startDate = startDateForRange(rangeDays, today);
  const endDate = localDateISO(today);
  const sorted = [...entries]
    .filter((entry) => entry.measured_date >= startDate && entry.measured_date <= endDate)
    .sort((first, second) => first.measured_date.localeCompare(second.measured_date));

  return sorted.map((entry, index) => {
    const window = sorted.slice(Math.max(0, index - 6), index + 1);
    const rollingAverageKg = window.reduce((sum, item) => sum + item.weight_kg, 0) / window.length;
    return {
      measuredDate: entry.measured_date,
      weightKg: entry.weight_kg,
      rollingAverageKg: Number(rollingAverageKg.toFixed(2))
    };
  });
}

export function buildWeeklyTrainingStats(workouts: WorkoutSession[], today = new Date()): WeeklyTrainingStats {
  const startDate = startDateForRange(7, today);
  const endDate = localDateISO(today);
  return workouts.reduce<WeeklyTrainingStats>(
    (stats, workout) => {
      const completedDate = workout.completed_at?.slice(0, 10);
      if (!completedDate || completedDate < startDate || completedDate > endDate) {
        return stats;
      }
      stats.completedWorkouts += 1;
      workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.is_completed && set.set_type === "working" && set.weight_kg > 0 && set.repetitions > 0) {
            stats.workingSets += 1;
            stats.volumeKg += set.weight_kg * set.repetitions;
          }
        });
      });
      return stats;
    },
    { completedWorkouts: 0, workingSets: 0, volumeKg: 0 }
  );
}
