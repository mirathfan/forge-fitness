import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react-native";
import { View } from "react-native";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { api } from "@/services/api";
import { displayVolume, displayWeight } from "@/utils/units";

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

export default function ProgressScreen() {
  const history = useQuery({ queryKey: ["sessions", "completed"], queryFn: () => api.workoutSessions("completed") });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const workouts = history.data?.items ?? [];
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

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">Progress</Text>
          <Text muted>Frequency, volume, and exercise bests for this milestone.</Text>
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
