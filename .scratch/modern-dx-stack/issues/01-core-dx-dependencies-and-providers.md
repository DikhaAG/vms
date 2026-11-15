# 01: Core DX Dependencies, Unified Client Providers, and Test Harness

**What to build:** Install and wire the core modern developer experience packages (`zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `@tanstack/react-query`, `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `nuqs`, `sonner`). Provide a unified Client Component provider (`VmsProviders`) mounted in the operator app layout (`src/app/vms/layout.tsx`) that provisions query caching, tRPC context, URL search parameter synchronization, and Kinpaku-styled toast notifications without polluting public pages. Provide an isolated test harness utility (`renderWithVmsProviders`) in `src/test/test-utils.tsx` so Vitest can render provider-dependent components with an in-memory client.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Install production dependencies: `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `@tanstack/react-query`, `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `nuqs`, `sonner`.
- [x] Create `src/components/vms/vms-providers.tsx` Client Component wrapping `QueryClientProvider`, `trpc.Provider`, `NuqsAdapter`, and Sonner `<Toaster position="top-right" richColors theme="system" />`.
- [x] Mount `VmsProviders` in `src/app/vms/layout.tsx` around the enterprise app shell.
- [x] Create `renderWithVmsProviders` helper in `src/test/test-utils.tsx` with an isolated, non-retrying in-memory `QueryClient`.
- [x] Verify that `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass cleanly with all 671 existing tests intact.

