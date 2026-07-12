import { PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";

import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const theme = useForgeTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: 8,
          borderWidth: 1,
          gap: spacing.md,
          padding: spacing.lg
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
