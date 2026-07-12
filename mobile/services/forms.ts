import { z } from "zod";

export const authFormSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const profileFormSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  date_of_birth: z.string().optional().nullable(),
  height_cm: z.coerce.number().min(80).max(260).optional().nullable(),
  current_weight_kg: z.coerce.number().min(25).max(350).optional().nullable(),
  preferred_weight_unit: z.enum(["kg", "lb"]),
  fitness_goal: z.enum(["lose_weight", "maintain", "gain_muscle", "improve_strength"]),
  experience_level: z.enum(["beginner", "intermediate", "advanced"])
});

export const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required").max(120),
  description: z.string().max(1000).optional().nullable()
});

export type AuthForm = z.infer<typeof authFormSchema>;
export type ProfileForm = z.infer<typeof profileFormSchema>;
