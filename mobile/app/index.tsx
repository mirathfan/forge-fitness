import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useForgeTheme } from "@/hooks/useForgeTheme";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const theme = useForgeTheme();
  const { token, hydrated } = useAuthStore();

  if (!hydrated) {
    return (
      <View style={{ alignItems: "center", backgroundColor: theme.background, flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return <Redirect href={token ? "/(tabs)/home" : "/(auth)/welcome"} />;
}
