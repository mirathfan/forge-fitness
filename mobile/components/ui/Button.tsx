import { ComponentType } from "react";
import { ActivityIndicator, Pressable, PressableProps, View } from "react-native";
import { LucideProps } from "lucide-react-native";

import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { Text } from "@/components/ui/Text";

type ButtonProps = PressableProps & {
  title: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  icon?: ComponentType<LucideProps>;
};

export function Button({ title, variant = "primary", loading = false, icon: Icon, disabled, style, ...props }: ButtonProps) {
  const theme = useForgeTheme();
  const background =
    variant === "primary" ? theme.primary : variant === "danger" ? theme.danger : theme.surfaceMuted;
  const color = variant === "secondary" ? theme.text : theme.primaryText;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          alignItems: "center",
          backgroundColor: background,
          borderRadius: 8,
          minHeight: 48,
          justifyContent: "center",
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md
        },
        style as object
      ]}
      {...props}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        {loading ? <ActivityIndicator color={color} /> : Icon ? <Icon color={color} size={18} /> : null}
        <Text variant="label" style={{ color }}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
