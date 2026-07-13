import { QueryClient } from "@tanstack/react-query";

import { ApiError, NetworkError } from "@/services/api";

export function isRecoverableError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  return error instanceof ApiError && error.status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && "status" in error && error.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 20_000
    },
    mutations: {
      retry: (failureCount, error) => isRecoverableError(error) && failureCount < 2
    }
  }
});
