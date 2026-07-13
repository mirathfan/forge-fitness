import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { CheckSquare, Clock, Copy, Plus, RotateCw, Save, Square, TimerReset } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import {
  PendingSet,
  SetDraft,
  createClientMutationId,
  restTimerRemainingSeconds,
  useActiveWorkoutStore
} from "@/stores/activeWorkoutStore";
import { ExerciseSet, WeightUnit, WorkoutSessionExercise } from "@/types/api";
import { displayWeight, inputWeightToKg } from "@/utils/units";
import {
  formatRestTime,
  friendlyWorkoutError,
  isDraftSubmittable,
  pendingSetToInput,
  prefillDraft,
  syncedSetLabel
} from "@/utils/workoutReliability";

function StatusPill({ label, tone }: { label: string; tone: "synced" | "pending" | "failed" }) {
  const theme = useForgeTheme();
  const color = tone === "synced" ? theme.success : tone === "failed" ? theme.danger : theme.primary;
  return (
    <View style={{ backgroundColor: theme.surfaceMuted, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}>
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

function RestTimerControls({
  sessionId,
  sessionExerciseId,
  seconds = 120
}: {
  sessionId: string;
  sessionExerciseId: string;
  seconds?: number;
}) {
  const restTimer = useActiveWorkoutStore((state) =>
    state.restTimer?.sessionId === sessionId && state.restTimer.sessionExerciseId === sessionExerciseId
      ? state.restTimer
      : null
  );
  const startRestTimer = useActiveWorkoutStore((state) => state.startRestTimer);
  const adjustRestTimer = useActiveWorkoutStore((state) => state.adjustRestTimer);
  const stopRestTimer = useActiveWorkoutStore((state) => state.stopRestTimer);
  const [now, setNow] = useState(Date.now());
  const remaining = restTimerRemainingSeconds(restTimer, now);

  useEffect(() => {
    if (!restTimer || remaining <= 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [remaining, restTimer]);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      <Button
        title={remaining > 0 ? formatRestTime(remaining) : "Rest"}
        icon={remaining > 0 ? Clock : TimerReset}
        variant="secondary"
        onPress={() => {
          setNow(Date.now());
          startRestTimer(sessionId, sessionExerciseId, seconds);
        }}
      />
      <Button title="-15" variant="secondary" disabled={remaining <= 0} onPress={() => adjustRestTimer(-15)} />
      <Button title="+15" variant="secondary" disabled={remaining <= 0} onPress={() => adjustRestTimer(15)} />
      {remaining > 0 ? <Button title="Stop" variant="secondary" onPress={stopRestTimer} /> : null}
    </View>
  );
}

function SetEditor({
  sessionId,
  set,
  unit
}: {
  sessionId: string;
  set: ExerciseSet;
  unit: WeightUnit;
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
        is_completed: completed ?? set.is_completed,
        client_mutation_id: set.client_mutation_id
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
    onError: (error) => Alert.alert("Set not saved", friendlyWorkoutError(error))
  });
  const ToggleIcon = set.is_completed ? CheckSquare : Square;
  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: set.is_completed ? theme.surfaceMuted : "transparent",
          borderRadius: 8,
          flexDirection: "row",
          gap: spacing.sm,
          minHeight: 56,
          paddingHorizontal: spacing.xs
        }}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: set.is_completed }}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate(!set.is_completed)}
        >
          <ToggleIcon color={set.is_completed ? theme.success : theme.muted} size={26} />
        </Pressable>
        <Text style={{ width: 28 }}>{set.set_number}</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setWeight}
          value={weight}
          style={{ color: theme.text, flex: 1, fontSize: 18, minHeight: 48 }}
        />
        <TextInput
          keyboardType="number-pad"
          onChangeText={setReps}
          value={reps}
          style={{ color: theme.text, flex: 1, fontSize: 18, minHeight: 48 }}
        />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setRpe}
          value={rpe}
          style={{ color: theme.text, flex: 1, fontSize: 18, minHeight: 48 }}
        />
        <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => mutation.mutate(undefined)}>
          <Save color={theme.primary} size={24} />
        </Pressable>
      </View>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <StatusPill label="Synced" tone="synced" />
        <Text variant="caption" muted>
          {syncedSetLabel(set, unit)}
        </Text>
      </View>
    </View>
  );
}

function PendingSetRow({
  pending,
  onRetry,
  unit
}: {
  pending: PendingSet;
  onRetry: (pending: PendingSet) => void;
  unit: WeightUnit;
}) {
  const failed = pending.status === "failed";
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 52 }}>
        <Text style={{ width: 28 }}>...</Text>
        <Text style={{ flex: 1 }}>{pending.weight || unit}</Text>
        <Text style={{ flex: 1 }}>{pending.repetitions || "reps"}</Text>
        <Text style={{ flex: 1 }}>{pending.rpe || "RPE"}</Text>
        {failed ? (
          <Pressable accessibilityRole="button" onPress={() => onRetry(pending)}>
            <RotateCw size={22} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <StatusPill label={failed ? "Failed" : "Pending"} tone={failed ? "failed" : "pending"} />
        {pending.errorMessage ? (
          <Text variant="caption" muted>
            {pending.errorMessage}
          </Text>
        ) : null}
      </View>
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
  unit: WeightUnit;
}) {
  const theme = useForgeTheme();
  const key = item.id;
  const draft = useActiveWorkoutStore((state) => state.drafts[key]);
  const pendingSetMap = useActiveWorkoutStore((state) => state.pendingSets);
  const updateDraft = useActiveWorkoutStore((state) => state.updateDraft);
  const queueSet = useActiveWorkoutStore((state) => state.queueSet);
  const markSetPending = useActiveWorkoutStore((state) => state.markSetPending);
  const markSetFailed = useActiveWorkoutStore((state) => state.markSetFailed);
  const markSetSynced = useActiveWorkoutStore((state) => state.markSetSynced);
  const startRestTimer = useActiveWorkoutStore((state) => state.startRestTimer);
  const previous = useQuery({
    queryKey: ["previous-performance", item.exercise_id],
    queryFn: () => api.previousPerformance(item.exercise_id)
  });
  const effectiveDraft = useMemo(
    () => prefillDraft(draft, item.sets, previous.data, unit),
    [draft, item.sets, previous.data, unit]
  );
  const pendingSets = useMemo(
    () => Object.values(pendingSetMap).filter((set) => set.sessionId === sessionId && set.sessionExerciseId === item.id),
    [item.id, pendingSetMap, sessionId]
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const addSet = useMutation({
    mutationFn: (pending: PendingSet) => api.addSet(sessionId, item.id, pendingSetToInput(pending, unit)),
    onMutate: (pending) => {
      markSetPending(pending.clientMutationId);
      setLocalError(null);
    },
    onSuccess: async (_set, pending) => {
      markSetSynced(pending.clientMutationId);
      updateDraft(key, {
        weight: pending.weight,
        repetitions: pending.repetitions,
        rpe: pending.rpe,
        note: pending.note,
        setType: pending.setType,
        unit: pending.unit
      });
      startRestTimer(sessionId, item.id, 120);
      await queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      await queryClient.invalidateQueries({ queryKey: ["previous-performance", item.exercise_id] });
    },
    onError: (error, pending) => {
      const message = friendlyWorkoutError(error);
      markSetFailed(pending.clientMutationId, message);
      setLocalError(message);
    }
  });
  const selectedType = effectiveDraft.setType;
  const hasPendingSubmission = pendingSets.some((set) => set.status === "pending");
  const lastSyncedSet = [...item.sets].sort((first, second) => second.set_number - first.set_number)[0];

  const submitDraft = (draftToSubmit: SetDraft) => {
    if (hasPendingSubmission) return;
    if (!isDraftSubmittable(draftToSubmit)) {
      setLocalError("Enter weight and reps before adding a set.");
      return;
    }
    const pending: PendingSet = {
      ...draftToSubmit,
      clientMutationId: createClientMutationId(),
      sessionId,
      sessionExerciseId: item.id,
      status: "pending",
      errorMessage: null,
      createdAt: Date.now()
    };
    queueSet(pending);
    addSet.mutate(pending);
  };

  const duplicateLastSet = () => {
    if (!lastSyncedSet) {
      submitDraft(effectiveDraft);
      return;
    }
    submitDraft({
      weight: unit === "lb" ? String(Number((lastSyncedSet.weight_kg * 2.2046226218).toFixed(1))) : String(lastSyncedSet.weight_kg),
      repetitions: String(lastSyncedSet.repetitions),
      rpe: lastSyncedSet.rpe == null ? "" : String(lastSyncedSet.rpe),
      note: effectiveDraft.note,
      setType: lastSyncedSet.set_type,
      unit
    });
  };

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
      {pendingSets.map((pending) => (
        <PendingSetRow key={pending.clientMutationId} pending={pending} unit={unit} onRetry={(set) => addSet.mutate(set)} />
      ))}
      <View style={{ borderColor: theme.border, borderTopWidth: 1, gap: spacing.md, paddingTop: spacing.md }}>
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
                  justifyContent: "center",
                  minHeight: 40,
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
            onChangeText={(value) => updateDraft(key, { weight: value, unit })}
            placeholder={unit}
            placeholderTextColor={theme.muted}
            value={effectiveDraft.weight}
            style={{ color: theme.text, flex: 1, fontSize: 20, minHeight: 54 }}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => updateDraft(key, { repetitions: value })}
            placeholder="reps"
            placeholderTextColor={theme.muted}
            value={effectiveDraft.repetitions}
            style={{ color: theme.text, flex: 1, fontSize: 20, minHeight: 54 }}
          />
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={(value) => updateDraft(key, { rpe: value })}
            placeholder="RPE"
            placeholderTextColor={theme.muted}
            value={effectiveDraft.rpe}
            style={{ color: theme.text, flex: 1, fontSize: 20, minHeight: 54 }}
          />
        </View>
        <TextInput
          onChangeText={(value) => updateDraft(key, { note: value })}
          placeholder="Set note"
          placeholderTextColor={theme.muted}
          value={effectiveDraft.note}
          style={{ color: theme.text, fontSize: 16, minHeight: 48 }}
        />
        {localError ? (
          <Text variant="caption" style={{ color: theme.danger }}>
            {localError}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Button
            title={hasPendingSubmission ? "Syncing..." : "Add set"}
            icon={Plus}
            disabled={hasPendingSubmission}
            loading={addSet.isPending}
            onPress={() => submitDraft(effectiveDraft)}
          />
          <Button title="Duplicate" icon={Copy} variant="secondary" disabled={hasPendingSubmission} onPress={duplicateLastSet} />
        </View>
        <RestTimerControls sessionId={sessionId} sessionExerciseId={item.id} seconds={120} />
      </View>
    </Card>
  );
}

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const setSession = useActiveWorkoutStore((state) => state.setSession);
  const clear = useActiveWorkoutStore((state) => state.clear);
  const reconcileSyncedSets = useActiveWorkoutStore((state) => state.reconcileSyncedSets);
  const pendingSetMap = useActiveWorkoutStore((state) => state.pendingSets);
  const session = useQuery({ queryKey: ["session", id], queryFn: () => api.workoutSession(id), enabled: Boolean(id) });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const pendingSets = useMemo(
    () => Object.values(pendingSetMap).filter((set) => set.sessionId === id),
    [id, pendingSetMap]
  );
  const hasPendingSets = pendingSets.some((set) => set.status === "pending");
  const complete = useMutation({
    mutationFn: () => api.completeWorkout(id),
    onSuccess: async (completedSession) => {
      clear();
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      router.replace(`/summary/${completedSession.id}`);
    },
    onError: (error) => Alert.alert("Workout not completed", friendlyWorkoutError(error))
  });
  const abandon = useMutation({
    mutationFn: () => api.abandonWorkout(id),
    onSuccess: async () => {
      clear();
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      router.replace("/(tabs)/workouts");
    },
    onError: (error) => Alert.alert("Workout not abandoned", friendlyWorkoutError(error))
  });

  useEffect(() => {
    if (id) setSession(id);
  }, [id, setSession]);

  useEffect(() => {
    const workout = session.data;
    if (!workout) return;
    const syncedIds = workout.exercises
      .flatMap((exercise) => exercise.sets)
      .map((set) => set.client_mutation_id)
      .filter((clientMutationId): clientMutationId is string => Boolean(clientMutationId));
    reconcileSyncedSets(workout.id, syncedIds);
    if (workout.status === "completed") {
      clear();
      router.replace(`/summary/${workout.id}`);
    }
  }, [clear, reconcileSyncedSets, session.data]);

  const workout = session.data;
  const unit = profile.data?.preferred_weight_unit ?? "kg";
  const connectionError = session.isError ? friendlyWorkoutError(session.error) : null;

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">{workout?.name ?? "Workout"}</Text>
          <Text muted>{workout?.status === "active" ? "Active session" : "Session detail"}</Text>
        </View>
        {connectionError ? (
          <Card>
            <Text variant="heading">Disconnected</Text>
            <Text muted>{connectionError}</Text>
            <Button title="Retry" icon={RotateCw} variant="secondary" onPress={() => session.refetch()} />
          </Card>
        ) : null}
        {session.isLoading ? <Text muted>Loading workout...</Text> : null}
        {workout?.exercises.map((item) => <ExerciseBlock key={item.id} sessionId={workout.id} item={item} unit={unit} />)}
        {pendingSets.some((set) => set.status === "failed") ? (
          <Card>
            <Text variant="heading">Unsynced sets</Text>
            <Text muted>Retry failed sets before completing to keep workout history accurate.</Text>
          </Card>
        ) : null}
        <Button
          title={complete.isPending ? "Completing..." : "Complete workout"}
          disabled={hasPendingSets}
          loading={complete.isPending}
          onPress={() => complete.mutate()}
        />
        <Button
          title="Abandon workout"
          variant="danger"
          loading={abandon.isPending}
          onPress={() =>
            Alert.alert("Abandon workout", "This keeps the session out of completed history and clears local drafts.", [
              { text: "Cancel", style: "cancel" },
              { text: "Abandon", style: "destructive", onPress: () => abandon.mutate() }
            ])
          }
        />
      </View>
    </Screen>
  );
}
