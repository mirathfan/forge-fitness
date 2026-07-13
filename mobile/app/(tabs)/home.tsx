import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Activity, Play, Plus } from "lucide-react-native";
import { useEffect } from "react";
import { Alert, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { ApiError, api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import { useActiveWorkoutStore } from "@/stores/activeWorkoutStore";
import { formatRecommendation } from "@/utils/recommendations";
import { friendlyWorkoutError } from "@/utils/workoutReliability";

function sameWeek(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return date >= start;
}

export default function HomeScreen() {
  const setSession = useActiveWorkoutStore((state) => state.setSession);
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const templates = useQuery({ queryKey: ["templates"], queryFn: api.templates });
  const active = useQuery({ queryKey: ["sessions", "active"], queryFn: () => api.workoutSessions("active") });
  const completed = useQuery({ queryKey: ["sessions", "completed"], queryFn: () => api.workoutSessions("completed") });
  const recommendations = useQuery({ queryKey: ["recommendations"], queryFn: api.recommendations });
  const start = useMutation({
    mutationFn: (templateId: string) => api.startWorkout({ workout_template_id: templateId }),
    onSuccess: async (session) => {
      setSession(session.id);
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      router.push(`/workout/${session.id}`);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        const activeSessions = await api.activeWorkoutSessions();
        const existing = activeSessions.items[0];
        if (existing) {
          setSession(existing.id);
          router.push(`/workout/${existing.id}`);
          return;
        }
      }
      Alert.alert("Workout not started", friendlyWorkoutError(error));
    }
  });

  const activeSession = active.data?.items[0];
  const latestWorkout = completed.data?.items[0];
  const weeklyCount = completed.data?.items.filter((workout) => sameWeek(workout.started_at)).length ?? 0;
  const firstTemplate = templates.data?.[0];

  useEffect(() => {
    if (activeSession) setSession(activeSession.id);
  }, [activeSession, setSession]);

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">Forge</Text>
          <Text muted>{profile.data?.display_name ? `Ready, ${profile.data.display_name}` : "Ready for your next session"}</Text>
        </View>

        {activeSession ? (
          <Card>
            <Text variant="heading">Active workout</Text>
            <Text muted>{activeSession.name}</Text>
            <Button title="Resume workout" icon={Play} onPress={() => router.push(`/workout/${activeSession.id}`)} />
          </Card>
        ) : (
          <Button
            title={firstTemplate ? "Start workout" : "Create template"}
            icon={firstTemplate ? Play : Plus}
            loading={start.isPending}
            onPress={() => (firstTemplate ? start.mutate(firstTemplate.id) : router.push("/template/new"))}
          />
        )}

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              This week
            </Text>
            <Text variant="heading">{weeklyCount}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" muted>
              Templates
            </Text>
            <Text variant="heading">{templates.data?.length ?? 0}</Text>
          </Card>
        </View>

        {latestWorkout ? (
          <Card>
            <Text variant="heading">Most recent workout</Text>
            <Text>{latestWorkout.name}</Text>
            <Text muted>
              {latestWorkout.exercises.length} exercises · {latestWorkout.total_duration_seconds ?? 0}s
            </Text>
          </Card>
        ) : (
          <EmptyState
            icon={Activity}
            title="No completed workouts yet"
            message="Create a template, start a session, and your history will appear here."
          />
        )}

        <Card>
          <Text variant="heading">Latest recommendations</Text>
          {(recommendations.data ?? []).slice(0, 3).map((recommendation) => (
            <Text key={recommendation.id} muted>
              {formatRecommendation(recommendation, profile.data?.preferred_weight_unit ?? "kg")}
            </Text>
          ))}
          {recommendations.data?.length === 0 ? <Text muted>Complete a workout to generate guidance.</Text> : null}
        </Card>
      </View>
    </Screen>
  );
}
