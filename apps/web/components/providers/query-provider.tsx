"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/lib/stores/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // Clear cached user data immediately on sign-out or 401 session expiration
  React.useEffect(() => {
    return useAuthStore.subscribe((state, prevState) => {
      if (prevState.isAuthenticated && !state.isAuthenticated) {
        queryClient.clear();
      }
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "!bg-card !text-foreground !border !border-border !rounded-lg !shadow-xl !text-sm",
          style: {
            background: "var(--card)",
            color: "var(--foreground)",
            borderColor: "var(--border)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
