import { Tabs } from "expo-router";
import { ChartNoAxesCombined, Dumbbell, Home, User } from "lucide-react-native";

import { useForgeTheme } from "@/hooks/useForgeTheme";

export default function TabsLayout() {
  const theme = useForgeTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border
        }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} />
      <Tabs.Screen
        name="workouts"
        options={{ title: "Workouts", tabBarIcon: ({ color }) => <Dumbbell color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: "Progress", tabBarIcon: ({ color }) => <ChartNoAxesCombined color={color} size={22} /> }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
    </Tabs>
  );
}
