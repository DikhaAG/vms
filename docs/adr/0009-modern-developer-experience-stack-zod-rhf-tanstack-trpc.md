---
status: accepted
---

# Modern Developer Experience Stack: Zod, React Hook Form, TanStack Table, and tRPC

We will adopt a cohesive, modern Developer Experience (DX) and type-safe architecture across the Visitor Management System (VMS) utilizing **Zod** for isomorphic domain schemas, **React Hook Form** for performant accessible forms, **TanStack Table** for canonical headless data tables, **tRPC v11** with **TanStack Query** for end-to-end typed internal dashboard communication, **nuqs** for type-safe URL query parameter synchronization, and **sonner** for accessible toast feedback.

## Context

Following the establishment of the Kinpaku design system (ADR 0007) and canonical UI components (ADR 0008), an architectural review via `/grill-with-docs` revealed several developer experience and maintainability bottlenecks:

1. **Validation & Contract Drift**: Contracts in `src/lib/vms/*-contract.ts` relied on hand-written runtime validation functions (`validatePreRegistrationInput`, etc.) and manual `as const` tuples, resulting in duplicated type guards and verbose error dictionaries.
2. **Form Boilerplate Explosion**: Form components relied on dozens of individual controlled `useState` hooks and manual blur handlers. For example, `PreRegistrationForm` exceeded 1,568 lines, causing excessive component re-renders and repetitive accessibility wiring (`id`, `htmlFor`, `aria-invalid`).
3. **Duplicated Data Table Logic**: Five operational pages (`/vms/visitors`, `/vms/reception`, `/vms/active-monitoring`, `/vms/approvals`, `/vms/access-levels`) each hand-coded table elements (`<table>`, `<thead>`, `<tbody>`), client-side pagination, search filtering, and sorting state independently.
4. **Untyped Network Boundaries & Cache Invalidation**: Client components fetched API Route Handlers via raw `fetch("/api/vms/...")` with manual JSON parsing, error unwrapping, and imperative refetch triggers.
5. **Quality Guarantee**: The repository maintains 81 test files with 671 passing tests (100% pass rate). Any architectural upgrade must be zero-regression, maintaining strict compatibility with Next.js 16 App Router, React 19, and the centralized Indonesian UI dictionary (`src/lib/vms/i18n/id.ts`).

## Considered Options

- **Option 1: Status Quo (Manual `useState`, bespoke `<table>`, raw `fetch`)**:
  *Rejected*: High maintenance overhead, excessive boilerplate, and ongoing risk of contract drift across 7 operational routes.
- **Option 2: Pure Next.js Server Actions without Client Cache / tRPC**:
  *Rejected*: While native to Next.js, Server Actions alone do not provide automatic reactive query caching, real-time background polling (critical for door telemetry in active monitoring), or end-to-end client router autocomplete without bespoke wrappers.
- **Option 3: Modern Hybrid DX Architecture (Zod + RHF + TanStack Table + tRPC v11 + TanStack Query + nuqs + Sonner)**:
  *Accepted*: Combines industry-standard developer ergonomics with headless flexibility:
  - **Zod**: Isomorphic validation schemas generating TypeScript types (`z.infer`) and powering both server validation and form resolvers.
  - **React Hook Form**: High-performance uncontrolled form inputs with minimal re-renders.
  - **TanStack Table**: Headless table engine styled cleanly with existing Kinpaku tokens (`UiCard`, `UiBadge`, `UiButton`).
  - **tRPC v11**: End-to-end compile-time type safety and automatic query batching for internal `/vms/*` operator pages, preserving standard REST Route Handlers for external webhooks (HikCentral) and public registration links (`/invite/[token]`).
  - **nuqs**: Type-safe synchronization between table filters/pagination and browser URL search parameters.
  - **Sonner**: Accessible, lightweight toast notifications styled to Kinpaku tokens.

## Consequences

- **Isomorphic Schema Centralization**: Zod schemas in `src/lib/vms/*-contract.ts` become the single source of truth for types and validation. Existing validation functions (e.g., `validatePreRegistrationInput`) are maintained as backward-compatible wrappers delegating to `schema.safeParse()`, ensuring all 671 existing unit tests remain green.
- **Canonical Form Primitives**: `src/components/vms/ui/` is extended with accessible form primitives (`UiFormField`, `UiTextInput`, `UiSelect`, `UiTextarea`) that integrate automatically with React Hook Form and Indonesian dictionary labels (`id.ts`), while complex controls (webcam photo capture, tap quota selectors) are cleanly bridged via `<Controller />`.
- **Headless Canonical Table (`UiDataTable`)**: A reusable `UiDataTable` component standardizes sorting, filtering, and pagination across all operational views, supporting both instant in-memory mode and shareable URL state mode via `nuqs`.
- **Hybrid Communication Architecture**: Internal dashboard interactions run via tRPC routers in `src/server/trpc/` with `vmsRepository` dependency injection in context. External APIs (HikCentral callbacks, public invite tokens) remain on Next.js REST Route Handlers. Server Components (RSC) continue calling repositories/services directly for zero-latency initial loads.
- **Scoped Client Provider**: A centralized `VmsProviders` Client Component wraps `QueryClientProvider`, `trpc.Provider`, `NuqsAdapter`, and Sonner `<Toaster />` inside `src/app/vms/layout.tsx`, preventing unnecessary client bundle overhead on public landing pages.
- **Isolated Testing Harness**: Vitest unit and integration tests utilize `renderWithVmsProviders` from `src/test/test-utils.tsx`, executing against isolated in-memory query clients without network flakiness.

