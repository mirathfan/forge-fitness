import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Dumbbell, Pencil, Plus, Save, Scale, Trash2 } from "lucide-react-native";
import { Alert, Pressable, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { ApiError, api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import { BodyweightEntry, ExerciseAnalyticsRead, WeightUnit, WorkoutSession } from "@/types/api";
import {
  BodyweightChartPoint,
  BodyweightRangeDays,
  buildBodyweightChartPoints,
  buildWeeklyTrainingStats,
  dateFromLocalISO,
  daysBetween,
  findBodyweightEntryForDate,
  formatDate,
  localDateISO,
  startDateForRange
} from "@/utils/progressAnalytics";
import { displayVolume, displayWeight, displayWeightDelta, inputWeightToKg, kgToLb } from "@/utils/units";

const bodyweightRanges: BodyweightRangeDays[] = [7, 30, 90];
const chartWidth = 320;
const chartHeight = 180;
const chartPadding = { top: 18, right: 28, bottom: 28, left: 44 };

type EditState = {
  id: string;
  measuredDate: string;
  weight: string;
  note: string;
};

type BestPerformance = {
  name: string;
  weightKg: number;
  repetitions: number;
  completedAt: string;
};

type CreateBodyweightResult =
  | { status: "created"; entry: BodyweightEntry }
  | { status: "duplicate"; entry: BodyweightEntry };

function toApiWeight(value: string, unit: WeightUnit): number {
  const weight = inputWeightToKg(value, unit);
  return Number(weight.toFixed(2));
}

function chartValue(weightKg: number, unit: WeightUnit): number {
  return unit === "lb" ? kgToLb(weightKg) : weightKg;
}

function chartLabel(weightKg: number, unit: WeightUnit): string {
  const value = chartValue(weightKg, unit);
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}

function buildPath<T>(points: T[], xFor: (point: T, index: number) => number, yFor: (point: T) => number): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(point, index)} ${yFor(point)}`).join(" ");
}

function recentBestPerformances(workouts: WorkoutSession[]): BestPerformance[] {
  const bests = new Map<string, BestPerformance>();
  workouts.forEach((workout) => {
    if (!workout.completed_at) return;
    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (!set.is_completed || set.set_type !== "working" || set.weight_kg <= 0 || set.repetitions <= 0) {
          return;
        }
        const existing = bests.get(exercise.exercise.name);
        if (!existing || set.weight_kg > existing.weightKg) {
          bests.set(exercise.exercise.name, {
            name: exercise.exercise.name,
            weightKg: set.weight_kg,
            repetitions: set.repetitions,
            completedAt: workout.completed_at ?? ""
          });
        }
      });
    });
  });
  return Array.from(bests.values())
    .sort((first, second) => second.completedAt.localeCompare(first.completedAt))
    .slice(0, 6);
}

function strengthDelta(analytics: ExerciseAnalyticsRead): number | null {
  const points = analytics.trend.filter((point) => point.best_estimated_one_rep_max_kg != null);
  if (points.length < 2) return null;
  const previous = points[points.length - 2].best_estimated_one_rep_max_kg ?? 0;
  const latest = points[points.length - 1].best_estimated_one_rep_max_kg ?? 0;
  return latest - previous;
}

function DatePickerField({
  label,
  value,
  onChange,
  open,
  onToggle
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const theme = useForgeTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: "row",
          gap: spacing.sm,
          minHeight: 48,
          opacity: pressed ? 0.82 : 1,
          paddingHorizontal: spacing.md
        })}
      >
        <CalendarDays color={theme.muted} size={18} />
        <Text>{formatDate(value)}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          display="inline"
          maximumDate={new Date()}
          mode="date"
          value={dateFromLocalISO(value)}
          onChange={(_, selectedDate) => {
            if (selectedDate) {
              onChange(localDateISO(selectedDate));
            }
          }}
        />
      ) : null}
    </View>
  );
}

function RangeSelector({
  value,
  onChange
}: {
  value: BodyweightRangeDays;
  onChange: (range: BodyweightRangeDays) => void;
}) {
  const theme = useForgeTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {bodyweightRanges.map((range) => {
        const selected = range === value;
        return (
          <Pressable
            accessibilityRole="button"
            key={range}
            onPress={() => onChange(range)}
            style={({ pressed }) => ({
              backgroundColor: selected ? theme.primary : theme.surfaceMuted,
              borderRadius: 8,
              opacity: pressed ? 0.82 : 1,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            })}
          >
            <Text variant="label" style={{ color: selected ? theme.primaryText : theme.text }}>
              {range}D
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BodyweightChart({
  points,
  rangeDays,
  selectedPoint,
  unit,
  onSelectPoint
}: {
  points: BodyweightChartPoint[];
  rangeDays: BodyweightRangeDays;
  selectedPoint: BodyweightChartPoint | null;
  unit: WeightUnit;
  onSelectPoint: (point: BodyweightChartPoint) => void;
}) {
  const theme = useForgeTheme();
  if (points.length === 0) {
    return <Text muted>No recorded weights in this range.</Text>;
  }

  const today = localDateISO();
  const startDate = startDateForRange(rangeDays);
  const values = points.flatMap((point) => [point.weightKg, point.rollingAverageKg]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(1, maxValue - minValue);
  const floor = minValue - spread * 0.15;
  const ceiling = maxValue + spread * 0.15;
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const xForDate = (measuredDate: string) =>
    chartPadding.left + (daysBetween(startDate, measuredDate) / Math.max(1, rangeDays - 1)) * plotWidth;
  const yForWeight = (weightKg: number) =>
    chartPadding.top + (1 - (weightKg - floor) / (ceiling - floor)) * plotHeight;
  const weightPath = buildPath(points, (point) => xForDate(point.measuredDate), (point) => yForWeight(point.weightKg));
  const averagePath = buildPath(
    points,
    (point) => xForDate(point.measuredDate),
    (point) => yForWeight(point.rollingAverageKg)
  );
  const topLabel = chartLabel(ceiling, unit);
  const bottomLabel = chartLabel(floor, unit);

  return (
    <View style={{ gap: spacing.sm }}>
      <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%">
        <Line
          stroke={theme.border}
          strokeWidth={1}
          x1={chartPadding.left}
          x2={chartWidth - chartPadding.right}
          y1={chartPadding.top}
          y2={chartPadding.top}
        />
        <Line
          stroke={theme.border}
          strokeWidth={1}
          x1={chartPadding.left}
          x2={chartWidth - chartPadding.right}
          y1={chartHeight - chartPadding.bottom}
          y2={chartHeight - chartPadding.bottom}
        />
        <SvgText fill={theme.muted} fontSize={10} x={4} y={chartPadding.top + 4}>
          {topLabel}
        </SvgText>
        <SvgText fill={theme.muted} fontSize={10} x={4} y={chartHeight - chartPadding.bottom + 4}>
          {bottomLabel}
        </SvgText>
        <SvgText fill={theme.muted} fontSize={10} x={chartPadding.left} y={chartHeight - 8}>
          {formatDate(startDate)}
        </SvgText>
        <SvgText
          fill={theme.muted}
          fontSize={10}
          textAnchor="end"
          x={chartWidth - chartPadding.right}
          y={chartHeight - 8}
        >
          {formatDate(today)}
        </SvgText>
        <Path d={averagePath} fill="none" stroke={theme.success} strokeDasharray="4 4" strokeWidth={2} />
        <Path d={weightPath} fill="none" stroke={theme.primary} strokeLinecap="round" strokeWidth={3} />
        {points.map((point) => {
          const selected = selectedPoint?.measuredDate === point.measuredDate;
          return (
            <Circle
              cx={xForDate(point.measuredDate)}
              cy={yForWeight(point.weightKg)}
              fill={selected ? theme.primary : theme.surface}
              key={point.measuredDate}
              onPress={() => onSelectPoint(point)}
              r={selected ? 5 : 4}
              stroke={theme.primary}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Text muted>Recorded</Text>
        <Text muted>Seven-record avg</Text>
      </View>
    </View>
  );
}

function StrengthTrendChart({ analytics, unit }: { analytics: ExerciseAnalyticsRead; unit: WeightUnit }) {
  const theme = useForgeTheme();
  const points = analytics.trend.filter((point) => point.best_estimated_one_rep_max_kg != null);
  if (points.length === 0) {
    return <Text muted>No estimated 1RM trend yet.</Text>;
  }

  const values = points.map((point) => point.best_estimated_one_rep_max_kg ?? 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(1, maxValue - minValue);
  const floor = minValue - spread * 0.15;
  const ceiling = maxValue + spread * 0.15;
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const xFor = (_: (typeof points)[number], index: number) =>
    chartPadding.left + (index / Math.max(1, points.length - 1)) * plotWidth;
  const yFor = (point: (typeof points)[number]) =>
    chartPadding.top + (1 - ((point.best_estimated_one_rep_max_kg ?? 0) - floor) / (ceiling - floor)) * plotHeight;
  const path = buildPath(points, xFor, yFor);

  return (
    <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%">
      <Line
        stroke={theme.border}
        strokeWidth={1}
        x1={chartPadding.left}
        x2={chartWidth - chartPadding.right}
        y1={chartPadding.top}
        y2={chartPadding.top}
      />
      <Line
        stroke={theme.border}
        strokeWidth={1}
        x1={chartPadding.left}
        x2={chartWidth - chartPadding.right}
        y1={chartHeight - chartPadding.bottom}
        y2={chartHeight - chartPadding.bottom}
      />
      <SvgText fill={theme.muted} fontSize={10} x={4} y={chartPadding.top + 4}>
        {chartLabel(ceiling, unit)}
      </SvgText>
      <SvgText fill={theme.muted} fontSize={10} x={4} y={chartHeight - chartPadding.bottom + 4}>
        {chartLabel(floor, unit)}
      </SvgText>
      <Path d={path} fill="none" stroke={theme.primary} strokeLinecap="round" strokeWidth={3} />
      {points.map((point, index) => (
        <Circle
          cx={xFor(point, index)}
          cy={yFor(point)}
          fill={theme.surface}
          key={point.workout_session_id}
          r={4}
          stroke={theme.primary}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}

export default function ProgressScreen() {
  const theme = useForgeTheme();
  const history = useQuery({ queryKey: ["sessions", "completed"], queryFn: () => api.workoutSessions("completed") });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const [bodyweightRange, setBodyweightRange] = useState<BodyweightRangeDays>(30);
  const [entryDate, setEntryDate] = useState(localDateISO());
  const [entryWeight, setEntryWeight] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [showEntryDatePicker, setShowEntryDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [selectedBodyweightPoint, setSelectedBodyweightPoint] = useState<BodyweightChartPoint | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const bodyweights = useQuery({
    queryKey: ["bodyweight-entries", bodyweightRange],
    queryFn: () =>
      api.bodyweightEntries({
        start_date: startDateForRange(bodyweightRange),
        end_date: localDateISO(),
        limit: 100
      })
  });
  const trend = useQuery({ queryKey: ["bodyweight-trend"], queryFn: api.bodyweightTrend });
  const exerciseOptions = useQuery({ queryKey: ["exercise-analytics"], queryFn: api.exerciseAnalyticsOptions });
  const exerciseAnalytics = useQuery({
    enabled: selectedExerciseId != null,
    queryKey: ["exercise-analytics", selectedExerciseId],
    queryFn: () => api.exerciseAnalytics(selectedExerciseId ?? "")
  });

  const workouts = useMemo(() => history.data?.items ?? [], [history.data?.items]);
  const entries = useMemo(() => bodyweights.data?.items ?? [], [bodyweights.data?.items]);
  const unit = profile.data?.preferred_weight_unit ?? "kg";
  const weeklyStats = useMemo(() => buildWeeklyTrainingStats(workouts), [workouts]);
  const bests = useMemo(() => recentBestPerformances(workouts), [workouts]);
  const chartPoints = useMemo(
    () => buildBodyweightChartPoints(entries, bodyweightRange),
    [bodyweightRange, entries]
  );
  const trendData = trend.data;

  useEffect(() => {
    setSelectedBodyweightPoint(chartPoints[chartPoints.length - 1] ?? null);
  }, [chartPoints]);

  useEffect(() => {
    const options = exerciseOptions.data ?? [];
    if (!selectedExerciseId && options.length > 0) {
      setSelectedExerciseId(options[0].exercise.id);
    }
  }, [exerciseOptions.data, selectedExerciseId]);

  const invalidateBodyweight = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bodyweight-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["bodyweight-trend"] })
    ]);
  };

  const loadEntryForDate = async (measuredDate: string): Promise<BodyweightEntry | null> => {
    const cached = findBodyweightEntryForDate(entries, measuredDate);
    if (cached) return cached;
    const response = await api.bodyweightEntries({ start_date: measuredDate, end_date: measuredDate, limit: 1 });
    return response.items[0] ?? null;
  };

  const startEditing = (entry: BodyweightEntry, draft?: { weight: string; note: string }) => {
    setEditing({
      id: entry.id,
      measuredDate: entry.measured_date,
      weight: draft?.weight || (unit === "lb" ? String(Number(kgToLb(entry.weight_kg).toFixed(1))) : String(entry.weight_kg)),
      note: draft?.note ?? entry.note ?? ""
    });
    setShowEditDatePicker(false);
    setEntryError(null);
  };

  const offerEditExisting = (entry: BodyweightEntry) => {
    Alert.alert("Entry already exists", `Edit the ${formatDate(entry.measured_date)} entry instead?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Edit entry", onPress: () => startEditing(entry, { weight: entryWeight, note: entryNote }) }
    ]);
  };

  const createMutation = useMutation<CreateBodyweightResult>({
    mutationFn: async () => {
      const weightKg = toApiWeight(entryWeight, unit);
      if (weightKg < 25 || weightKg > 350) throw new Error("Enter a bodyweight between 25 kg and 350 kg.");
      const existing = await loadEntryForDate(entryDate);
      if (existing) {
        return { status: "duplicate", entry: existing };
      }
      const entry = await api.createBodyweightEntry({
        measured_date: entryDate,
        weight_kg: weightKg,
        note: entryNote.trim() || null
      });
      return { status: "created", entry };
    },
    onSuccess: async (result) => {
      if (result.status === "duplicate") {
        setEntryError(null);
        offerEditExisting(result.entry);
        return;
      }
      setEntryWeight("");
      setEntryNote("");
      setEntryDate(localDateISO());
      setEntryError(null);
      await invalidateBodyweight();
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        const existing = await loadEntryForDate(entryDate);
        if (existing) {
          setEntryError(null);
          offerEditExisting(existing);
          return;
        }
      }
      setEntryError(error instanceof Error ? error.message : "Bodyweight entry was not saved.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; measuredDate: string; weight: string; note: string }) => {
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
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setEntryError("Another entry already exists for that date.");
        return;
      }
      setEntryError(error instanceof Error ? error.message : "Bodyweight entry was not updated.");
    }
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

  const confirmDelete = (entry: BodyweightEntry) => {
    Alert.alert("Delete bodyweight", formatDate(entry.measured_date), [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(entry.id) }
    ]);
  };

  const selectedAnalytics = exerciseAnalytics.data;
  const exerciseDelta = selectedAnalytics ? strengthDelta(selectedAnalytics) : null;

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">Progress</Text>
          <Text muted>Bodyweight trend, weekly training load, and exercise progression.</Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              Weekly workouts
            </Text>
            <Text variant="heading">{weeklyStats.completedWorkouts}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              Weekly sets
            </Text>
            <Text variant="heading">{weeklyStats.workingSets}</Text>
          </Card>
        </View>
        <Card>
          <Text variant="heading">Weekly training volume</Text>
          <Text variant="heading">{displayVolume(weeklyStats.volumeKg, unit)}</Text>
          <Text muted>Completed working-set volume over the last seven days.</Text>
        </Card>

        <Text variant="heading">Bodyweight</Text>
        <Card>
          <Text variant="heading">Quick entry</Text>
          <DatePickerField
            label="Date"
            onChange={setEntryDate}
            onToggle={() => setShowEntryDatePicker((value) => !value)}
            open={showEntryDatePicker}
            value={entryDate}
          />
          <TextField
            keyboardType="decimal-pad"
            label={`Weight (${unit})`}
            onChangeText={setEntryWeight}
            placeholder={unit}
            value={entryWeight}
          />
          <TextField label="Note" onChangeText={setEntryNote} placeholder="Optional" value={entryNote} />
          {entryError ? (
            <Text variant="caption" style={{ color: theme.danger }}>
              {entryError}
            </Text>
          ) : null}
          <Button
            icon={Plus}
            loading={createMutation.isPending}
            onPress={() => createMutation.mutate()}
            title="Log bodyweight"
          />
        </Card>

        <Card>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
            <Text variant="heading">Weight trend</Text>
            <RangeSelector onChange={setBodyweightRange} value={bodyweightRange} />
          </View>
          {trend.isLoading || bodyweights.isLoading ? <Text muted>Loading bodyweight trend...</Text> : null}
          {trend.isError || bodyweights.isError ? <Text muted>Bodyweight trend unavailable.</Text> : null}
          {!trend.isLoading && !bodyweights.isLoading && chartPoints.length === 0 ? (
            <Text muted>No bodyweight entries in this range.</Text>
          ) : null}
          {trendData && trendData.latest_weight_kg != null ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="heading">{displayWeight(trendData.latest_weight_kg, unit)}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <Text muted>
                  7-day avg:{" "}
                  {trendData.rolling_average_7d_kg == null ? "--" : displayWeight(trendData.rolling_average_7d_kg, unit)}
                </Text>
                <Text muted>
                  7-day: {trendData.change_7d_kg == null ? "--" : displayWeightDelta(trendData.change_7d_kg, unit)}
                </Text>
                <Text muted>
                  30-day: {trendData.change_30d_kg == null ? "--" : displayWeightDelta(trendData.change_30d_kg, unit)}
                </Text>
                <Text muted>Direction: {trendData.direction}</Text>
              </View>
            </View>
          ) : null}
          <BodyweightChart
            onSelectPoint={setSelectedBodyweightPoint}
            points={chartPoints}
            rangeDays={bodyweightRange}
            selectedPoint={selectedBodyweightPoint}
            unit={unit}
          />
          {selectedBodyweightPoint ? (
            <View style={{ gap: spacing.xs }}>
              <Text variant="label">{formatDate(selectedBodyweightPoint.measuredDate)}</Text>
              <Text muted>Recorded: {displayWeight(selectedBodyweightPoint.weightKg, unit)}</Text>
              <Text muted>Seven-record avg: {displayWeight(selectedBodyweightPoint.rollingAverageKg, unit)}</Text>
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
          <EmptyState icon={Scale} message="Try again after checking the backend connection." title="Bodyweight unavailable" />
        ) : null}
        {!bodyweights.isLoading && !bodyweights.isError && entries.length === 0 ? (
          <EmptyState icon={Scale} message="Bodyweight history will appear here." title="No bodyweight entries" />
        ) : null}
        {entries.map((entry) =>
          editing?.id === entry.id ? (
            <Card key={entry.id}>
              <DatePickerField
                label="Date"
                onChange={(value) => setEditing({ ...editing, measuredDate: value })}
                onToggle={() => setShowEditDatePicker((value) => !value)}
                open={showEditDatePicker}
                value={editing.measuredDate}
              />
              <TextField
                keyboardType="decimal-pad"
                label={`Weight (${unit})`}
                onChangeText={(value) => setEditing({ ...editing, weight: value })}
                value={editing.weight}
              />
              <TextField
                label="Note"
                onChangeText={(value) => setEditing({ ...editing, note: value })}
                value={editing.note}
              />
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Button
                  icon={Save}
                  loading={updateMutation.isPending}
                  onPress={() => updateMutation.mutate(editing)}
                  style={{ flex: 1 }}
                  title="Save"
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
                  <Button icon={Pencil} onPress={() => startEditing(entry)} title="Edit" variant="secondary" />
                  <Button
                    icon={Trash2}
                    loading={deleteMutation.isPending}
                    onPress={() => confirmDelete(entry)}
                    title="Delete"
                    variant="danger"
                  />
                </View>
              </View>
            </Card>
          )
        )}

        <Text variant="heading">Exercise analytics</Text>
        <Card>
          {exerciseOptions.isLoading ? <Text muted>Loading exercise history...</Text> : null}
          {exerciseOptions.isError ? (
            <EmptyState icon={Dumbbell} message="Exercise analytics could not be loaded." title="Analytics unavailable" />
          ) : null}
          {!exerciseOptions.isLoading && !exerciseOptions.isError && (exerciseOptions.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Dumbbell} message="Complete working sets to unlock exercise trends." title="No exercise history" />
          ) : null}
          {(exerciseOptions.data?.length ?? 0) > 0 ? (
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {exerciseOptions.data?.map((option) => {
                  const selected = selectedExerciseId === option.exercise.id;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option.exercise.id}
                      onPress={() => setSelectedExerciseId(option.exercise.id)}
                      style={({ pressed }) => ({
                        backgroundColor: selected ? theme.primary : theme.surfaceMuted,
                        borderRadius: 8,
                        opacity: pressed ? 0.82 : 1,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm
                      })}
                    >
                      <Text variant="label" style={{ color: selected ? theme.primaryText : theme.text }}>
                        {option.exercise.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {exerciseAnalytics.isLoading ? <Text muted>Loading selected exercise...</Text> : null}
              {exerciseAnalytics.isError ? <Text muted>Selected exercise analytics unavailable.</Text> : null}
              {selectedAnalytics ? (
                <View style={{ gap: spacing.md }}>
                  <Text variant="heading">{selectedAnalytics.exercise.name}</Text>
                  <StrengthTrendChart analytics={selectedAnalytics} unit={unit} />
                  <View style={{ gap: spacing.xs }}>
                    <Text muted>
                      Estimated 1RM:{" "}
                      {selectedAnalytics.estimated_one_rep_max_kg == null
                        ? "--"
                        : displayWeight(selectedAnalytics.estimated_one_rep_max_kg, unit)}
                    </Text>
                    <Text muted>
                      Best set:{" "}
                      {selectedAnalytics.best_working_set
                        ? `${displayWeight(selectedAnalytics.best_working_set.weight_kg, unit)} x ${
                            selectedAnalytics.best_working_set.repetitions
                          }`
                        : "--"}
                    </Text>
                    <Text muted>
                      Recent progression: {exerciseDelta == null ? "--" : displayWeightDelta(exerciseDelta, unit)}
                    </Text>
                    <Text muted>
                      Heaviest working weight:{" "}
                      {selectedAnalytics.heaviest_working_weight_kg == null
                        ? "--"
                        : displayWeight(selectedAnalytics.heaviest_working_weight_kg, unit)}
                    </Text>
                    <Text muted>Total working volume: {displayVolume(selectedAnalytics.total_working_volume_kg, unit)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </Card>

        <Text variant="heading">Recent bests</Text>
        {bests.map((best) => (
          <Card key={best.name}>
            <Text>{best.name}</Text>
            <Text muted>
              {displayWeight(best.weightKg, unit)} x {best.repetitions} on {formatDate(best.completedAt.slice(0, 10))}
            </Text>
          </Card>
        ))}
        {bests.length === 0 ? (
          <EmptyState icon={BarChart3} message="Complete working sets to populate exercise bests." title="No records yet" />
        ) : null}
      </View>
    </Screen>
  );
}
