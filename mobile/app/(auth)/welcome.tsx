import { Dumbbell, LogIn, UserPlus } from "lucide-react-native";
import { router } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";

export default function WelcomeScreen() {
  const theme = useForgeTheme();
  return (
    <Screen>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xxl }}>
        <View style={{ alignItems: "flex-start", gap: spacing.md }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: theme.surfaceMuted,
              borderRadius: 8,
              height: 56,
              justifyContent: "center",
              width: 56
            }}
          >
            <Dumbbell color={theme.primary} size={30} />
          </View>
          <Text variant="title">Forge</Text>
          <Text muted>
            Track workouts, see what you did last time, and get clear progression guidance after every session.
          </Text>
        </View>
        <Card>
          <Text variant="heading">Workout tracking foundation</Text>
          <Text muted>Templates, active sessions, set logging, history, and deterministic overload recommendations.</Text>
        </Card>
        <View style={{ gap: spacing.md }}>
          <Button title="Create account" icon={UserPlus} onPress={() => router.push("/(auth)/register")} />
          <Button title="Log in" icon={LogIn} variant="secondary" onPress={() => router.push("/(auth)/login")} />
        </View>
      </View>
    </Screen>
  );
}
