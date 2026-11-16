"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { trpc } from "@/lib/trpc/client";

export interface VmsProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  trpcClient?: ReturnType<typeof trpc.createClient>;
}

export function VmsProviders({
  children,
  queryClient: customQueryClient,
  trpcClient: customTrpcClient,
}: VmsProvidersProps) {
  const [queryClient] = useState(
    () =>
      customQueryClient ??
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(
    () =>
      customTrpcClient ??
      trpc.createClient({
        links: [
          httpBatchLink({
            url: "/api/trpc",
          }),
        ],
      })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          {children}
          <Toaster position="top-right" richColors theme="system" />
        </NuqsAdapter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
