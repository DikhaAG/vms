import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/lib/trpc/client";
import { VmsProviders } from "@/components/vms/vms-providers";

/**
 * Creates an isolated in-memory QueryClient configured for non-flaky test execution:
 * - retry: false (never retry failed queries during tests)
 * - gcTime: 0 (immediate garbage collection, zero state leak across tests)
 * - staleTime: 0 (immediate freshness invalidation)
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Creates an isolated tRPC client for test assertions with local URL link.
 */
export function createTestTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/api/trpc",
      }),
    ],
  });
}

export interface RenderWithVmsProvidersOptions {
  queryClient?: QueryClient;
  trpcClient?: ReturnType<typeof trpc.createClient>;
}

export interface RenderWithVmsProvidersResult {
  html: string;
  queryClient: QueryClient;
  trpcClient: ReturnType<typeof trpc.createClient>;
  element: React.ReactElement;
}

/**
 * Renders a React component wrapped in isolated VMS test providers.
 * Returns rendered static HTML, query client, and trpc client for assertions.
 */
export function renderWithVmsProviders(
  ui: React.ReactElement,
  options?: RenderWithVmsProvidersOptions
): RenderWithVmsProvidersResult {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const trpcClient = options?.trpcClient ?? createTestTrpcClient();

  const element = (
    <VmsProviders queryClient={queryClient} trpcClient={trpcClient}>
      {ui}
    </VmsProviders>
  );

  const html = renderToStaticMarkup(element);

  return {
    html,
    queryClient,
    trpcClient,
    element,
  };
}
