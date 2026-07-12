import { authFormSchema, profileFormSchema } from "@/services/forms";

test("auth validation rejects invalid email and short password", () => {
  const result = authFormSchema.safeParse({ email: "not-email", password: "short" });
  expect(result.success).toBe(false);
});

test("profile validation accepts milestone profile values", () => {
  const result = profileFormSchema.safeParse({
    display_name: "Alex",
    date_of_birth: null,
    height_cm: "180",
    current_weight_kg: "82.5",
    preferred_weight_unit: "kg",
    fitness_goal: "improve_strength",
    experience_level: "intermediate"
  });
  expect(result.success).toBe(true);
});
