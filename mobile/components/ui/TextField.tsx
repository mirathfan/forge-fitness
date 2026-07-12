import { TextInput, TextInputProps, View } from "react-native";

import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";
import { Text } from "@/components/ui/Text";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  const theme = useForgeTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        style={[
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.border,
            borderRadius: 8,
            borderWidth: 1,
            color: theme.text,
            fontSize: 16,
            minHeight: 48,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          },
          style
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" style={{ color: theme.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
