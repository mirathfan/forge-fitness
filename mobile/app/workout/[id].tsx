import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { CheckSquare, Clock, Plus, Save, Square, TimerReset } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import { useActiveWorkoutStore } from "@/stores/activeWorkoutStore";
import { ExerciseSet, SetType, WorkoutSessionExercise } from "@/types/api";
import { displayWeight, inputWeightToKg } from "@/utils/units";

function Timer({ seconds = 120 }: { seconds?: number }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  return (
    <Button
      title={remaining > 0 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Rest"}
      icon={remaining > 0 ? Clock : TimerReset}
      variant="secondary"
      onPress={() => setRemaining(seconds)}
    />
  );
}

function SetEditor({
  sessionId,
  set,
  unit
}: {
  sessionId: string;
  set: ExerciseSet;
  unit: "kg" | "lb";
}) {
  const theme = useForgeTheme();
  const [weight, setWeight] = useState(String(unit === "lb" ? Math.round(set.weight_kg * 2.2046) : set.weight_kg));
  const [reps, setReps] = useState(String(set.repetitions));
  const [rpe, setRpe] = useState(set.rpe == null ? "" : String(set.rpe));
  const mutation = useMutation({
    mutationFn: (completed?: boolean) =>
      api.updateSet(sessionId, set.id, {
        set_number: set.set_number,
        set_type: set.set_type,
        weight_kg: inputWeightToKg(weight, unit),
        repetitions: Number.parseInt(reps, 10) || 0,
        rpe: rpe ? Number.parseFloat(rpe) : null,
        reps_in_reserve: set.reps_in_reserve,
        is_completed: completed ?? set.is_completed
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
    onError: (error) => Alert.alert("Set not saved", error instanceof Error ? error.message : "Try again.")
  });
  const ToggleIcon = set.is_completed ? CheckSquare : Square;
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 56 }}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: set.is_completed }} onPress={() => mutation.mutate(!set.is_completed)}>
        <ToggleIcon color={set.is_completed ? theme.success : theme.muted} size={26} />
      </Pressable>
      <Text style={{ width: 28 }}>{set.set_number}</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={weight}
        onChangeText={setWeight}
        style={{ color: theme.text, flex: 1, fontSize: 18, minHeight: 48 }}
      />
      <TextInput
        keyboardType="number-pad"
        value={reps}
        onChangeText={setReps}
        style={{ color: theme.text, flex: 1, fontSize: 18, minHeight: 48 }}
      />
      <TextInput
        keyboardType="decimal-pad"
        value={rpe}
        onChangeText={setRpe}
        style={{ color: theme.text, flex: 1, fontSize: 18, minHeight: 48 }}
      />
      <Pressable accessibilityRole="button" onPress={() => mutation.mutate(undefined)}>
        <Save color={theme.primary} size={24} />
      </Pressable>
    </View>
  );
}

function ExerciseBlock({
  sessionId,
  item,
  unit
}: {
  sessionId: string;
  item: WorkoutSessionExercise;
  unit: "kg" | "lb";
}) {
  const theme = useForgeTheme();
  const key = item.id;
  const draft = useActiveWorkoutStore((state) => state.drafts[key]);
  const updateDraft = useActiveWorkoutStore((state) => state.updateDraft);
  const previous = useQuery({
    queryKey: ["previous-performance", item.exercise_id],
    queryFn: () => api.previousPerformance(item.exercise_id)
  });
  const addSet = useMutation({
    mutationFn: () =>
      api.addSet(sessionId, item.id, {
        set_type: (draft?.setType ?? "working") as SetType,
        weight_kg: inputWeightToKg(draft?.weight ?? "0", unit),
        repetitions: Number.parseInt(draft?.repetitions ?? "0", 10) || 0,
        rpe: draft?.rpe ? Number.parseFloat(draft.rpe) : null,
        reps_in_reserve: null,
        is_completed: true
      }),
    onSuccess: async () => {
      updateDraft(key, { repetitions: "", rpe: "" });
      await queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
    onError: (error) => Alert.alert("Set not added", error instanceof Error ? error.message : "Try again.")
  });
  const selectedType = (draft?.setType ?? "working") as SetType;

  return (
    <Card>
      <View>
        <Text variant="heading">{item.exercise.name}</Text>
        <Text muted>{item.exercise.primary_muscle_group}</Text>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="label">Previous performance</Text>
        {previous.data?.length ? (
          <Text muted>
            {previous.data.map((set) => `${displayWeight(set.weight_kg, unit)} x ${set.repetitions}`).join(" · ")}
          </Text>
        ) : (
          <Text muted>No completed working sets yet.</Text>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Text variant="caption" muted style={{ flex: 1 }}>
          Weight
        </Text>
        <Text variant="caption" muted style={{ flex: 1 }}>
          Reps
        </Text>
        <Text variant="caption" muted style={{ flex: 1 }}>
          RPE
        </Text>
      </View>
      {item.sets.map((set) => (
        <SetEditor key={set.id} sessionId={sessionId} set={set} unit={unit} />
      ))}
      <View style={{ borderColor: theme.border, borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.md }}>
        {item.notes ? <Text muted>Notes: {item.notes}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["warmup", "working", "dropset", "failure"] as const).map((setType) => {
            const selected = selectedType === setType;
            return (
              <Pressable
                accessibilityRole="button"
                key={setType}
                onPress={() => updateDraft(key, { setType })}
                style={{
                  backgroundColor: selected ? theme.primary : theme.surfaceMuted,
                  borderRadius: 8,
                  minHeight: 40,
                  justifyContent: "center",
                  paddingHorizontal: spacing.md
                }}
              >
                <Text variant="caption" style={{ color: selected ? theme.primaryText : theme.text }}>
                  {setType}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TextInput
            keyboardType="decimal-pad"
            placeholder={unit}
            placeholderTextColor={theme.muted}
            value={draft?.weight ?? ""}
            onChangeText={(value) => updateDraft(key, { weight: value })}
            style={{ color: theme.text, flex: 1, fontSize: 20, minHeight: 54 }}
          />
          <TextInput
            keyboardType="number-pad"
            placeholder="reps"
            placeholderTextColor={theme.muted}
            value={draft?.repetitions ?? ""}
            onChangeText={(value) => updateDraft(key, { repetitions: value })}
            style={{ color: theme.text, flex: 1, fontSize: 20, minHeight: 54 }}
          />
          <TextInput
            keyboardType="decimal-pad"
            placeholder="RPE"
            placeholderTextColor={theme.muted}
            value={draft?.rpe ?? ""}
            onChangeText={(value) => updateDraft(key, { rpe: value })}
            style={{ color: theme.text, flex: 1, fontSize: 20, minHeight: 54 }}
          />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button title="Add set" icon={Plus} loading={addSet.isPending} onPress={() => addSet.mutate()} />
          <Timer seconds={120} />
        </View>
      </View>
    </Card>
  );
}

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const setSession = useActiveWorkoutStore((state) => state.setSession);
  const clear = useActiveWorkoutStore((state) => state.clear);
  const session = useQuery({ queryKey: ["session", id], queryFn: () => api.workoutSession(id), enabled: Boolean(id) });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const complete = useMutation({
    mutationFn: () => api.completeWorkout(id),
    onSuccess: async () => {
      clear();
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      router.replace(`/summary/${id}`);
    },
    onError: (error) => Alert.alert("Workout not completed", error instanceof Error ? error.message : "Try again.")
  });
  const abandon = useMutation({
    mutationFn: () => api.abandonWorkout(id),
    onSuccess: async () => {
      clear();
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      router.replace("/(tabs)/workouts");
    }
  });

  useEffect(() => {
    if (id) setSession(id);
  }, [id, setSession]);

  const workout = session.data;
  const unit = profile.data?.preferred_weight_unit ?? "kg";

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">{workout?.name ?? "Workout"}</Text>
          <Text muted>{workout?.status === "active" ? "Active session" : "Session detail"}</Text>
        </View>
        {workout?.exercises.map((item) => <ExerciseBlock key={item.id} sessionId={workout.id} item={item} unit={unit} />)}
        <Button title="Complete workout" loading={complete.isPending} onPress={() => complete.mutate()} />
        <Button
          title="Abandon workout"
          variant="danger"
          loading={abandon.isPending}
          onPress={() =>
            Alert.alert("Abandon workout", "This keeps the session out of completed history.", [
              { text: "Cancel", style: "cancel" },
              { text: "Abandon", style: "destructive", onPress: () => abandon.mutate() }
            ])
          }
        />
      </View>
    </Screen>
  );
}
