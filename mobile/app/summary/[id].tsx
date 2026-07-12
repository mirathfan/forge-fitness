import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Award, Dumbbell } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { api } from "@/services/api";
import { formatRecommendation, formatRecommendationExplanation } from "@/utils/recommendations";
import { displayVolume, displayWeight } from "@/utils/units";

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useQuery({ queryKey: ["session", id], queryFn: () => api.workoutSession(id), enabled: Boolean(id) });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const recommendations = useQuery({ queryKey: ["recommendations"], queryFn: api.recommendations });
  const workout = session.data;
  const unit = profile.data?.preferred_weight_unit ?? "kg";
  const workingSets =
    workout?.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.filter((set) => set.is_completed && set.set_type === "working").length,
      0
    ) ?? 0;
  const volume =
    workout?.exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets
          .filter((set) => set.is_completed && set.set_type === "working")
          .reduce((setSum, set) => setSum + set.weight_kg * set.repetitions, 0),
      0
    ) ?? 0;
  const prs =
    workout?.exercises
      .map((exercise) => {
        const top = Math.max(0, ...exercise.sets.map((set) => set.weight_kg));
        return top > 0 ? `${exercise.exercise.name}: ${displayWeight(top, unit)}` : null;
      })
      .filter(Boolean) ?? [];
  const sessionRecommendations = (recommendations.data ?? []).filter((item) => item.source_workout_session_id === id);

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">Workout summary</Text>
          <Text muted>{workout?.name ?? "Completed session"}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              Exercises
            </Text>
            <Text variant="heading">{workout?.exercises.length ?? 0}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              Sets
            </Text>
            <Text variant="heading">{workingSets}</Text>
          </Card>
        </View>
        <Card>
          <Text variant="heading">Training volume</Text>
          <Text variant="title">{displayVolume(volume, unit)}</Text>
          <Text muted>Completed working sets only.</Text>
        </Card>
        <Card>
          <Text variant="heading">Duration</Text>
          <Text>{Math.round((workout?.total_duration_seconds ?? 0) / 60)} minutes</Text>
        </Card>
        <Text variant="heading">Session bests</Text>
        {prs.map((pr) => (
          <Card key={pr}>
            <Text>{pr}</Text>
          </Card>
        ))}
        {prs.length === 0 ? <EmptyState icon={Award} title="No completed sets" message="Completed sets will show here." /> : null}
        <Text variant="heading">Recommendations</Text>
        {sessionRecommendations.map((recommendation) => (
          <Card key={recommendation.id}>
            <Text>{formatRecommendation(recommendation, unit)}</Text>
            <Text muted>{formatRecommendationExplanation(recommendation, unit)}</Text>
          </Card>
        ))}
        {sessionRecommendations.length === 0 ? (
          <EmptyState icon={Dumbbell} title="No guidance yet" message="Recommendations appear after completion." />
        ) : null}
        <Button title="Back to workouts" onPress={() => router.replace("/(tabs)/workouts")} />
      </View>
    </Screen>
  );
}
