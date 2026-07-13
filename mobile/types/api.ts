export type WeightUnit = "kg" | "lb";
export type FitnessGoal = "lose_weight" | "maintain" | "gain_muscle" | "improve_strength";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutStatus = "active" | "completed" | "abandoned";
export type SetType = "warmup" | "working" | "dropset" | "failure";
export type RecommendationType = "increase_weight" | "reduce_weight" | "plateau" | "maintain";
export type BodyweightDirection = "gaining" | "losing" | "stable";

export type Token = {
  access_token: string;
  token_type: "bearer";
  user_id: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  preferred_weight_unit: WeightUnit;
  fitness_goal: FitnessGoal;
  experience_level: ExperienceLevel;
  created_at: string;
  updated_at: string;
};

export type Exercise = {
  id: string;
  name: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  equipment: string;
  movement_pattern: string;
  instructions: string | null;
  is_custom: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseList = {
  items: Exercise[];
  total: number;
  limit: number;
  offset: number;
};

export type TemplateExerciseInput = {
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_rpe?: number | null;
  rest_seconds: number;
  notes?: string | null;
};

export type TemplateExercise = TemplateExerciseInput & {
  id: string;
  exercise: Exercise;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  description: string | null;
  exercises: TemplateExercise[];
  created_at: string;
  updated_at: string;
};

export type ExerciseSetInput = {
  set_type: SetType;
  weight_kg: number;
  repetitions: number;
  rpe?: number | null;
  reps_in_reserve?: number | null;
  is_completed: boolean;
};

export type ExerciseSet = ExerciseSetInput & {
  id: string;
  workout_session_exercise_id: string;
  set_number: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutSessionExercise = {
  id: string;
  exercise_id: string;
  position: number;
  notes: string | null;
  exercise: Exercise;
  sets: ExerciseSet[];
};

export type WorkoutSession = {
  id: string;
  workout_template_id: string | null;
  name: string;
  status: WorkoutStatus;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  total_duration_seconds: number | null;
  exercises: WorkoutSessionExercise[];
  created_at: string;
  updated_at: string;
};

export type WorkoutHistoryList = {
  items: WorkoutSession[];
  total: number;
  limit: number;
  offset: number;
};

export type PreviousPerformanceSet = {
  session_id: string;
  completed_at: string;
  weight_kg: number;
  repetitions: number;
  rpe: number | null;
  set_type: SetType;
};

export type ExerciseAnalyticsSet = {
  workout_session_id: string;
  workout_name: string;
  completed_at: string;
  weight_kg: number;
  repetitions: number;
  estimated_one_rep_max_kg: number | null;
};

export type ExerciseAnalyticsTrendPoint = {
  workout_session_id: string;
  workout_name: string;
  completed_at: string;
  heaviest_weight_kg: number;
  total_volume_kg: number;
  best_estimated_one_rep_max_kg: number | null;
  best_set: ExerciseAnalyticsSet | null;
};

export type ExerciseAnalyticsOption = {
  exercise: Exercise;
  completed_sessions: number;
  latest_completed_at: string;
  latest_estimated_one_rep_max_kg: number | null;
};

export type ExerciseAnalyticsRead = {
  exercise: Exercise;
  estimated_one_rep_max_kg: number | null;
  best_working_set: ExerciseAnalyticsSet | null;
  heaviest_working_weight_kg: number | null;
  total_working_volume_kg: number;
  trend: ExerciseAnalyticsTrendPoint[];
};

export type Recommendation = {
  id: string;
  exercise_id: string;
  source_workout_session_id: string;
  recommendation_type: RecommendationType;
  current_weight_kg: number;
  recommended_weight_kg: number | null;
  explanation: string;
  created_at: string;
  exercise: Exercise;
};

export type BodyweightEntryInput = {
  measured_date: string;
  weight_kg: number;
  note?: string | null;
};

export type BodyweightEntryUpdate = {
  measured_date?: string;
  weight_kg?: number;
  note?: string | null;
};

export type BodyweightEntry = {
  id: string;
  measured_date: string;
  weight_kg: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type BodyweightEntryList = {
  items: BodyweightEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type BodyweightTrend = {
  latest_weight_kg: number | null;
  rolling_average_7d_kg: number | null;
  change_7d_kg: number | null;
  change_30d_kg: number | null;
  direction: BodyweightDirection;
};
