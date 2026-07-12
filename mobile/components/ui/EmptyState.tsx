import { ComponentType } from "react";
import { View } from "react-native";
import { LucideProps } from "lucide-react-native";

import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";

type EmptyStateProps = {
  title: string;
  message: string;
  icon?: ComponentType<LucideProps>;
};

export function EmptyState({ title, message, icon: Icon }: EmptyStateProps) {
  const theme = useForgeTheme();
  return (
    <Card>
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        {Icon ? <Icon color={theme.muted} size={28} /> : null}
        <Text variant="heading" style={{ textAlign: "center" }}>
          {title}
        </Text>
        <Text muted style={{ textAlign: "center" }}>
          {message}
        </Text>
      </View>
    </Card>
  );
}
