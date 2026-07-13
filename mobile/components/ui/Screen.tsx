import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/constants/theme";
import { useForgeTheme } from "@/hooks/useForgeTheme";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const theme = useForgeTheme();
  const content = (
    <View style={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl }}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
