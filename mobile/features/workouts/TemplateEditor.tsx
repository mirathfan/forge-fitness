import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronDown, ChevronUp, Plus, Save, Search, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import { Exercise, TemplateExerciseInput, WorkoutTemplate } from "@/types/api";

type SelectedExercise = TemplateExerciseInput & {
  exercise: Exercise;
};

type TemplateEditorProps = {
  template?: WorkoutTemplate;
};

function numberFromInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const theme = useForgeTheme();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedExercise[]>(
    () =>
      template?.exercises.map((item) => ({
        exercise_id: item.exercise_id,
        position: item.position,
        target_sets: item.target_sets,
        target_reps_min: item.target_reps_min,
        target_reps_max: item.target_reps_max,
        target_rpe: item.target_rpe,
        rest_seconds: item.rest_seconds,
        notes: item.notes,
        exercise: item.exercise
      })) ?? []
  );
  const exercises = useQuery({
    queryKey: ["exercises", search],
    queryFn: () => api.exercises({ search }),
    enabled: search.length >= 2
  });
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        exercises: selected.map((item, index) => ({
          exercise_id: item.exercise_id,
          position: index,
          target_sets: item.target_sets,
          target_reps_min: item.target_reps_min,
          target_reps_max: item.target_reps_max,
          target_rpe: item.target_rpe,
          rest_seconds: item.rest_seconds,
          notes: item.notes
        }))
      };
      return template ? api.updateTemplate(template.id, payload) : api.createTemplate(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.replace("/(tabs)/workouts");
    },
    onError: (error) => Alert.alert("Template not saved", error instanceof Error ? error.message : "Try again.")
  });

  const available = useMemo(
    () => (exercises.data?.items ?? []).filter((exercise) => !selected.some((item) => item.exercise_id === exercise.id)),
    [exercises.data?.items, selected]
  );

  function addExercise(exercise: Exercise) {
    setSelected((items) => [
      ...items,
      {
        exercise_id: exercise.id,
        exercise,
        position: items.length,
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 12,
        rest_seconds: 120,
        target_rpe: null,
        notes: null
      }
    ]);
    setSearch("");
  }

  function updateExercise(index: number, patch: Partial<SelectedExercise>) {
    setSelected((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((items) => {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <TextField label="Template name" value={name} onChangeText={setName} placeholder="Upper body strength" />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Bench, rows, shoulders"
          multiline
        />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <Search color={theme.muted} size={20} />
          <TextInput
            placeholder="Search exercises"
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
            style={{ color: theme.text, flex: 1, minHeight: 44, fontSize: 16 }}
          />
        </View>
        {available.slice(0, 8).map((exercise) => (
          <Pressable
            accessibilityRole="button"
            key={exercise.id}
            onPress={() => addExercise(exercise)}
            style={{ flexDirection: "row", justifyContent: "space-between", minHeight: 44, alignItems: "center" }}
          >
            <View style={{ flex: 1 }}>
              <Text>{exercise.name}</Text>
              <Text variant="caption" muted>
                {exercise.primary_muscle_group} · {exercise.equipment}
              </Text>
            </View>
            <Plus color={theme.primary} size={22} />
          </Pressable>
        ))}
      </Card>

      <Text variant="heading">Exercises</Text>
      {selected.map((item, index) => (
        <Card key={item.exercise_id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{item.exercise.name}</Text>
              <Text muted>{item.exercise.primary_muscle_group}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable accessibilityRole="button" onPress={() => move(index, -1)}>
                <ChevronUp color={theme.muted} size={24} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => move(index, 1)}>
                <ChevronDown color={theme.muted} size={24} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelected((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 color={theme.danger} size={24} />
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextField
              label="Sets"
              keyboardType="number-pad"
              value={String(item.target_sets)}
              onChangeText={(value) => updateExercise(index, { target_sets: numberFromInput(value, 3) })}
              style={{ minWidth: 72 }}
            />
            <TextField
              label="Min reps"
              keyboardType="number-pad"
              value={String(item.target_reps_min)}
              onChangeText={(value) => updateExercise(index, { target_reps_min: numberFromInput(value, 8) })}
              style={{ minWidth: 90 }}
            />
            <TextField
              label="Max reps"
              keyboardType="number-pad"
              value={String(item.target_reps_max)}
              onChangeText={(value) => updateExercise(index, { target_reps_max: numberFromInput(value, 12) })}
              style={{ minWidth: 90 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextField
              label="Rest sec"
              keyboardType="number-pad"
              value={String(item.rest_seconds)}
              onChangeText={(value) => updateExercise(index, { rest_seconds: numberFromInput(value, 120) })}
              style={{ minWidth: 104 }}
            />
            <TextField
              label="Target RPE"
              keyboardType="decimal-pad"
              value={item.target_rpe == null ? "" : String(item.target_rpe)}
              onChangeText={(value) => updateExercise(index, { target_rpe: value ? Number.parseFloat(value) : null })}
              style={{ minWidth: 112 }}
            />
          </View>
        </Card>
      ))}
      {selected.length === 0 ? (
        <EmptyState icon={Search} title="Search and add exercises" message="Templates save target sets, reps, RPE, and rest time." />
      ) : null}
      <Button title="Save template" icon={Save} loading={save.isPending} disabled={!name || selected.length === 0} onPress={() => save.mutate()} />
    </View>
  );
}
