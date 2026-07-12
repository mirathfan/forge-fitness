import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { TemplateEditor } from "@/features/workouts/TemplateEditor";
import { api } from "@/services/api";

export default function EditTemplateScreen() {
  const theme = useForgeTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = useQuery({ queryKey: ["template", id], queryFn: () => api.template(id), enabled: Boolean(id) });

  if (template.isLoading) {
    return (
      <View style={{ alignItems: "center", backgroundColor: theme.background, flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <Screen>
      <Text variant="title">Edit template</Text>
      {template.data ? <TemplateEditor template={template.data} /> : <Text muted>Template not found.</Text>}
    </Screen>
  );
}
