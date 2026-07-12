import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { LogOut, Pencil } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { api } from "@/services/api";
import { queryClient } from "@/services/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useActiveWorkoutStore } from "@/stores/activeWorkoutStore";

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);
  const clearWorkout = useActiveWorkoutStore((state) => state.clear);
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text variant="title">Profile</Text>
          <Text muted>Account and training preferences.</Text>
        </View>
        <Card>
          <Text variant="heading">{profile.data?.display_name ?? "Athlete"}</Text>
          <Text muted>Goal: {profile.data?.fitness_goal.replace("_", " ") ?? "maintain"}</Text>
          <Text muted>Experience: {profile.data?.experience_level ?? "beginner"}</Text>
          <Text muted>Display weights in {profile.data?.preferred_weight_unit ?? "kg"}</Text>
        </Card>
        <Button title="Edit profile" icon={Pencil} variant="secondary" onPress={() => router.push("/onboarding/profile")} />
        <Button
          title="Log out"
          icon={LogOut}
          variant="danger"
          onPress={async () => {
            clearWorkout();
            await logout();
            queryClient.clear();
            router.replace("/(auth)/welcome");
          }}
        />
      </View>
    </Screen>
  );
}
