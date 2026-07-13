import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Pencil, Plus, Save, Scale, Trash2 } from "lucide-react-native";
import { Alert, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import { BodyweightEntry } from "@/types/api";
import { displayVolume, displayWeight, displayWeightDelta, inputWeightToKg, kgToLb } from "@/utils/units";

function totalVolume(workout: { exercises: { sets: { set_type: string; weight_kg: number; repetitions: number; is_completed: boolean }[] }[] }) {
  return workout.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets
        .filter((set) => set.is_completed && set.set_type === "working")
        .reduce((setSum, set) => setSum + set.weight_kg * set.repetitions, 0),
    0
  );
}

function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function isDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toApiWeight(value: string, unit: "kg" | "lb"): number {
  const weight = inputWeightToKg(value, unit);
  return Number(weight.toFixed(2));
}

type EditState = {
  id: string;
  measuredDate: string;
  weight: string;
  note: string;
};

export default function ProgressScreen() {
  const theme = useForgeTheme();
  const history = useQuery({ queryKey: ["sessions", "completed"], queryFn: () => api.workoutSessions("completed") });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const bodyweights = useQuery({ queryKey: ["bodyweight-entries"], queryFn: () => api.bodyweightEntries({ limit: 30 }) });
  const trend = useQuery({ queryKey: ["bodyweight-trend"], queryFn: api.bodyweightTrend });
  const [entryDate, setEntryDate] = useState(localDateISO());
  const [entryWeight, setEntryWeight] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const workouts = history.data?.items ?? [];
  const entries = bodyweights.data?.items ?? [];
  const unit = profile.data?.preferred_weight_unit ?? "kg";
  const volume = workouts.reduce((sum, workout) => sum + totalVolume(workout), 0);
  const workingSets = workouts.reduce(
    (sum, workout) =>
      sum +
      workout.exercises.reduce(
        (exerciseSum, exercise) =>
          exerciseSum + exercise.sets.filter((set) => set.is_completed && set.set_type === "working").length,
        0
      ),
    0
  );
  const prs = new Map<string, number>();
  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.is_completed && set.set_type === "working") {
          prs.set(exercise.exercise.name, Math.max(prs.get(exercise.exercise.name) ?? 0, set.weight_kg));
        }
      });
    });
  });

  const invalidateBodyweight = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bodyweight-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["bodyweight-trend"] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!isDateInput(entryDate)) throw new Error("Use a YYYY-MM-DD date.");
      const weightKg = toApiWeight(entryWeight, unit);
      if (weightKg < 25 || weightKg > 350) throw new Error("Enter a bodyweight between 25 kg and 350 kg.");
      return api.createBodyweightEntry({
        measured_date: entryDate,
        weight_kg: weightKg,
        note: entryNote.trim() || null
      });
    },
    onSuccess: async () => {
      setEntryWeight("");
      setEntryNote("");
      setEntryDate(localDateISO());
      setEntryError(null);
      await invalidateBodyweight();
    },
    onError: (error) => setEntryError(error instanceof Error ? error.message : "Bodyweight entry was not saved.")
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; measuredDate: string; weight: string; note: string }) => {
      if (!isDateInput(payload.measuredDate)) throw new Error("Use a YYYY-MM-DD date.");
      const weightKg = toApiWeight(payload.weight, unit);
      if (weightKg < 25 || weightKg > 350) throw new Error("Enter a bodyweight between 25 kg and 350 kg.");
      return api.updateBodyweightEntry(payload.id, {
        measured_date: payload.measuredDate,
        weight_kg: weightKg,
        note: payload.note.trim() || null
      });
    },
    onSuccess: async () => {
      setEditing(null);
      setEntryError(null);
      await invalidateBodyweight();
    },
    onError: (error) => setEntryError(error instanceof Error ? error.message : "Bodyweight entry was not updated.")
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => api.deleteBodyweightEntry(entryId),
    onSuccess: async () => {
      setEditing(null);
      setEntryError(null);
      await invalidateBodyweight();
    },
    onError: (error) => setEntryError(error instanceof Error ? error.message : "Bodyweight entry was not deleted.")
  });

  const startEditing = (entry: BodyweightEntry) => {
    setEditing({
      id: entry.id,
      measuredDate: entry.measured_date,
      weight: unit === "lb" ? String(Number(kgToLb(entry.weight_kg).toFixed(1))) : String(entry.weight_kg),
      note: entry.note ?? ""
    });
    setEntryError(null);
  };

  const confirmDelete = (entry: BodyweightEntry) => {
    Alert.alert("Delete bodyweight", formatDate(entry.measured_date), [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(entry.id) }
    ]);
  };

  const trendData = trend.data;

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">Progress</Text>
          <Text muted>Frequency, volume, exercise bests, and bodyweight trend.</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              Workouts
            </Text>
            <Text variant="heading">{workouts.length}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              Working sets
            </Text>
            <Text variant="heading">{workingSets}</Text>
          </Card>
        </View>
        <Card>
          <Text variant="heading">Training volume</Text>
          <Text variant="title">{displayVolume(volume, unit)}</Text>
          <Text muted>Total completed working-set volume in logged history.</Text>
        </Card>

        <Text variant="heading">Bodyweight</Text>
        <Card>
          <Text variant="heading">Quick entry</Text>
          <TextField label="Date" value={entryDate} onChangeText={setEntryDate} autoCapitalize="none" />
          <TextField
            label={`Weight (${unit})`}
            keyboardType="decimal-pad"
            value={entryWeight}
            onChangeText={setEntryWeight}
            placeholder={unit}
          />
          <TextField label="Note" value={entryNote} onChangeText={setEntryNote} placeholder="Optional" />
          {entryError ? (
            <Text variant="caption" style={{ color: theme.danger }}>
              {entryError}
            </Text>
          ) : null}
          <Button
            title="Log bodyweight"
            icon={Plus}
            loading={createMutation.isPending}
            onPress={() => createMutation.mutate()}
          />
        </Card>

        <Card>
          <Text variant="heading">Weight trend</Text>
          {trend.isLoading ? <Text muted>Loading bodyweight trend...</Text> : null}
          {trend.isError ? <Text muted>Bodyweight trend unavailable.</Text> : null}
          {trendData && trendData.latest_weight_kg == null ? <Text muted>No bodyweight entries yet.</Text> : null}
          {trendData && trendData.latest_weight_kg != null ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="title">{displayWeight(trendData.latest_weight_kg, unit)}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <Text muted>7-day avg: {trendData.rolling_average_7d_kg == null ? "--" : displayWeight(trendData.rolling_average_7d_kg, unit)}</Text>
                <Text muted>7-day: {trendData.change_7d_kg == null ? "--" : displayWeightDelta(trendData.change_7d_kg, unit)}</Text>
                <Text muted>30-day: {trendData.change_30d_kg == null ? "--" : displayWeightDelta(trendData.change_30d_kg, unit)}</Text>
                <Text muted>Direction: {trendData.direction}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        <Text variant="heading">Weight history</Text>
        {bodyweights.isLoading ? (
          <Card>
            <Text muted>Loading bodyweight history...</Text>
          </Card>
        ) : null}
        {bodyweights.isError ? (
          <EmptyState icon={Scale} title="Bodyweight unavailable" message="Try again after checking the backend connection." />
        ) : null}
        {!bodyweights.isLoading && !bodyweights.isError && entries.length === 0 ? (
          <EmptyState icon={Scale} title="No bodyweight entries" message="Bodyweight history will appear here." />
        ) : null}
        {entries.map((entry) =>
          editing?.id === entry.id ? (
            <Card key={entry.id}>
              <TextField label="Date" value={editing.measuredDate} onChangeText={(value) => setEditing({ ...editing, measuredDate: value })} />
              <TextField
                label={`Weight (${unit})`}
                keyboardType="decimal-pad"
                value={editing.weight}
                onChangeText={(value) => setEditing({ ...editing, weight: value })}
              />
              <TextField label="Note" value={editing.note} onChangeText={(value) => setEditing({ ...editing, note: value })} />
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Button
                  title="Save"
                  icon={Save}
                  loading={updateMutation.isPending}
                  style={{ flex: 1 }}
                  onPress={() => updateMutation.mutate(editing)}
                />
                <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(null)} />
              </View>
            </Card>
          ) : (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text>{formatDate(entry.measured_date)}</Text>
                  <Text variant="heading">{displayWeight(entry.weight_kg, unit)}</Text>
                  {entry.note ? <Text muted>{entry.note}</Text> : null}
                </View>
                <View style={{ gap: spacing.sm }}>
                  <Button title="Edit" icon={Pencil} variant="secondary" onPress={() => startEditing(entry)} />
                  <Button title="Delete" icon={Trash2} variant="danger" loading={deleteMutation.isPending} onPress={() => confirmDelete(entry)} />
                </View>
              </View>
            </Card>
          )
        )}

        <Text variant="heading">Personal records</Text>
        {Array.from(prs.entries())
          .slice(0, 10)
          .map(([name, weight]) => (
            <Card key={name}>
              <Text>{name}</Text>
              <Text muted>{displayWeight(weight, unit)} top working set</Text>
            </Card>
          ))}
        {prs.size === 0 ? (
          <EmptyState icon={BarChart3} title="No records yet" message="Complete working sets to populate exercise bests." />
        ) : null}
      </View>
    </Screen>
  );
}
