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

export default function RegisterScreen() {
  const setAuthToken = useAuthStore((state) => state.setAuthToken);
  const form = useForm<AuthForm>({
    resolver: zodResolver(authFormSchema),
    defaultValues: { email: "", password: "" }
  });
  const mutation = useMutation({
    mutationFn: (values: AuthForm) => api.register(values.email, values.password),
    onSuccess: async (token) => {
      await setAuthToken(token.access_token);
      router.replace("/onboarding/profile");
    },
    onError: (error) => Alert.alert("Registration failed", error instanceof Error ? error.message : "Try again.")
  });

  return (
    <Screen>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xxl }}>
        <View>
          <Text variant="title">Create Forge account</Text>
          <Text muted>Start with workout tracking. The rest of the platform can grow from here.</Text>
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
        <Button
          title="Create account"
          loading={mutation.isPending}
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
        />
      </View>
    </Screen>
  );
}
