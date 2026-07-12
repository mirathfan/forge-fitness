import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/constants/theme";
import { api } from "@/services/api";
import { AuthForm, authFormSchema } from "@/services/forms";
import { useAuthStore } from "@/stores/authStore";

export default function LoginScreen() {
  const setAuthToken = useAuthStore((state) => state.setAuthToken);
  const form = useForm<AuthForm>({
    resolver: zodResolver(authFormSchema),
    defaultValues: { email: "", password: "" }
  });
  const mutation = useMutation({
    mutationFn: (values: AuthForm) => api.login(values.email, values.password),
    onSuccess: async (token) => {
      await setAuthToken(token.access_token);
      router.replace("/(tabs)/home");
    },
    onError: (error) => Alert.alert("Login failed", error instanceof Error ? error.message : "Try again.")
  });

  return (
    <Screen>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xxl }}>
        <View>
          <Text variant="title">Welcome back</Text>
          <Text muted>Log in to continue your training history.</Text>
        </View>
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              value={field.value}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Password"
              secureTextEntry
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              value={field.value}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button title="Log in" loading={mutation.isPending} onPress={form.handleSubmit((values) => mutation.mutate(values))} />
      </View>
    </Screen>
  );
}
