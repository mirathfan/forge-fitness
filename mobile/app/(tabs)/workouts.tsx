import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pencil, Play, Plus, Trash2 } from "lucide-react-native";
import { Alert, Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import { useActiveWorkoutStore } from "@/stores/activeWorkoutStore";

export default function WorkoutsScreen() {
  const theme = useForgeTheme();
  const setSession = useActiveWorkoutStore((state) => state.setSession);
  const templates = useQuery({ queryKey: ["templates"], queryFn: api.templates });
  const history = useQuery({ queryKey: ["sessions", "completed"], queryFn: () => api.workoutSessions("completed") });
  const start = useMutation({
    mutationFn: (templateId: string) => api.startWorkout({ workout_template_id: templateId }),
    onSuccess: async (session) => {
      setSession(session.id);
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      router.push(`/workout/${session.id}`);
    },
    onError: (error) => Alert.alert("Workout not started", error instanceof Error ? error.message : "Try again.")
  });
  const remove = useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] })
  });

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Workouts</Text>
            <Text muted>Templates and completed sessions.</Text>
          </View>
          <Button title="New" icon={Plus} onPress={() => router.push("/template/new")} />
        </View>

        <Text variant="heading">Templates</Text>
        {(templates.data ?? []).map((template) => (
          <Card key={template.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="heading">{template.name}</Text>
                <Text muted>{template.exercises.length} exercises</Text>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Pressable accessibilityRole="button" onPress={() => router.push(`/template/${template.id}`)}>
                  <Pencil color={theme.muted} size={24} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    Alert.alert("Delete template", `Delete ${template.name}?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => remove.mutate(template.id) }
                    ])
                  }
                >
                  <Trash2 color={theme.danger} size={24} />
                </Pressable>
              </View>
            </View>
            <Button title="Start" icon={Play} loading={start.isPending} onPress={() => start.mutate(template.id)} />
          </Card>
        ))}
        {templates.data?.length === 0 ? (
          <EmptyState icon={Plus} title="Build your first template" message="Add exercises and targets for a repeatable session." />
        ) : null}

        <Text variant="heading">History</Text>
        {(history.data?.items ?? []).slice(0, 8).map((workout) => (
          <Card key={workout.id}>
            <Text variant="heading">{workout.name}</Text>
            <Text muted>
              {new Date(workout.started_at).toLocaleDateString()} · {workout.exercises.length} exercises
            </Text>
            <Button title="View summary" variant="secondary" onPress={() => router.push(`/summary/${workout.id}`)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
