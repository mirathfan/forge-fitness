import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { api } from "@/services/api";
import { ProfileForm, profileFormSchema } from "@/services/forms";
import { queryClient } from "@/services/queryClient";

const goals = [
  ["lose_weight", "Lose weight"],
  ["maintain", "Maintain"],
  ["gain_muscle", "Gain muscle"],
  ["improve_strength", "Strength"]
] as const;

const levels = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"]
] as const;

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  const theme = useForgeTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {options.map(([option, text]) => {
          const selected = option === value;
          return (
            <Pressable
              accessibilityRole="button"
              key={option}
              onPress={() => onChange(option)}
              style={{
                backgroundColor: selected ? theme.primary : theme.surfaceMuted,
                borderRadius: 8,
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm
              }}
            >
              <Text variant="label" style={{ color: selected ? theme.primaryText : theme.text }}>
                {text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileSetupScreen() {
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    values: {
      display_name: profile?.display_name ?? "",
      date_of_birth: profile?.date_of_birth ?? null,
      height_cm: profile?.height_cm ?? null,
      current_weight_kg: profile?.current_weight_kg ?? null,
      preferred_weight_unit: profile?.preferred_weight_unit ?? "kg",
      fitness_goal: profile?.fitness_goal ?? "maintain",
      experience_level: profile?.experience_level ?? "beginner"
    }
  });
  const mutation = useMutation({
    mutationFn: (values: ProfileForm) =>
      api.updateProfile({
        ...values,
        date_of_birth: values.date_of_birth || null,
        height_cm: values.height_cm ?? null,
        current_weight_kg: values.current_weight_kg ?? null
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.replace("/(tabs)/home");
    },
    onError: (error) => Alert.alert("Profile not saved", error instanceof Error ? error.message : "Try again.")
  });

  return (
    <Screen>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xl }}>
        <View>
          <Text variant="title">Profile setup</Text>
          <Text muted>These preferences help Forge display weights and frame progression targets.</Text>
        </View>
        <Card>
          <Controller
            control={form.control}
            name="display_name"
            render={({ field, fieldState }) => (
              <TextField label="Display name" onChangeText={field.onChange} value={field.value} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={form.control}
            name="height_cm"
            render={({ field, fieldState }) => (
              <TextField
                keyboardType="numeric"
                label="Height (cm)"
                onChangeText={field.onChange}
                value={field.value == null ? "" : String(field.value)}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="current_weight_kg"
            render={({ field, fieldState }) => (
              <TextField
                keyboardType="numeric"
                label="Current weight (kg)"
                onChangeText={field.onChange}
                value={field.value == null ? "" : String(field.value)}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="preferred_weight_unit"
            render={({ field }) => (
              <ChoiceRow
                label="Preferred unit"
                value={field.value}
                options={[
                  ["kg", "kg"],
                  ["lb", "lb"]
                ]}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="fitness_goal"
            render={({ field }) => <ChoiceRow label="Fitness goal" value={field.value} options={goals} onChange={field.onChange} />}
          />
          <Controller
            control={form.control}
            name="experience_level"
            render={({ field }) => (
              <ChoiceRow label="Experience level" value={field.value} options={levels} onChange={field.onChange} />
            )}
          />
        </Card>
        <Button
          title="Save profile"
          loading={mutation.isPending}
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
        />
      </View>
    </Screen>
  );
}
