export type WeightUnit = "kg" | "lb";
export type FitnessGoal = "lose_weight" | "maintain" | "gain_muscle" | "improve_strength";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutStatus = "active" | "completed" | "abandoned";
export type SetType = "warmup" | "working" | "dropset" | "failure";
export type RecommendationType = "increase_weight" | "reduce_weight" | "plateau" | "maintain";

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
