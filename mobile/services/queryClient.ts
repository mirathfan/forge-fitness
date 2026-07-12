import { QueryClient } from "@tanstack/react-query";

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
      retry: false
    }
  }
});
