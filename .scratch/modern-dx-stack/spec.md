# Spec: Modern Developer Experience Stack (Zod, React Hook Form, TanStack Table, tRPC, nuqs, and Sonner)

Status: ready-for-agent

## Problem Statement

Following the successful rollout of the Kinpaku design system (ADR 0007) and canonical UI components (ADR 0008), the Visitor Management System (VMS) codebase suffers from acute developer-experience friction, excessive boilerplate, and architectural duplication across its 7 operational routes:

1. **Manual Runtime Validation & Contract Drift:** Validation logic across `src/lib/vms/*-contract.ts` is hand-written using imperative checks, manual string trimming, regex assertions, and custom `as const` tuples. This causes maintenance divergence between TypeScript types and runtime validation rules, requiring repetitive boilerplate for each new field.
2. **Form Boilerplate Explosion & Re-render Overhead:** Forms across the operational dashboard (most notably `PreRegistrationForm` which spans over 1,568 lines, `GroupRegistrationClient`, and `WalkInModal`) manage dozens of individual controlled `useState` variables, manual blur/change handlers, and imperative error maps. This produces unnecessary component re-renders, complex state lifecycles, and verbose manual accessibility attributes (`id`, `htmlFor`, `aria-invalid`, `aria-describedby`).
3. **Duplicated Data Table Logic:** Five operational pages (`/vms/visitors`, `/vms/reception`, `/vms/active-monitoring`, `/vms/approvals`, and `/vms/access-levels`) each independently implement bespoke HTML `<table>` layouts, custom pagination state, ad-hoc search filtering, and column sorting. There is no unified headless table engine, leading to inconsistent table interactions and UI discrepancies.
4. **Untyped Network Boundaries & Disconnected State:** Client Components interact with API Route Handlers via raw imperative `fetch("/api/vms/...")` calls with manual JSON stringification, manual try/catch wrapping, and unverified response typing. Furthermore, live telemetry (e.g., door status and active visits in Active Monitoring) lacks reactive cache management, query deduplication, and automated background polling.
5. **Loss of Filter State on Page Navigation:** Operators frequently filter or paginate visitor records, but because table state lives entirely in unpersisted React state, refreshing the page or sharing links with colleagues loses all applied search terms and page indexes.
6. **Inconsistent Feedback Notifications:** UI feedback across the system is split between inline alerts, browser banners, and ad-hoc status text, lacking a unified, accessible, and lightweight toast notification system.

## Solution

We will implement a cohesive modern Developer Experience (DX) architecture centered on industry-standard, headless, and type-safe libraries, strictly adhering to ADR 0009 and the Kinpaku design system:

1. **Isomorphic Validation with Zod:**
   - Define canonical Zod schemas in `src/lib/vms/*-contract.ts` for all domain inputs, entities, and parameters.
   - Infer TypeScript interfaces automatically via `z.infer<typeof schema>` to guarantee single-source-of-truth accuracy.
   - Maintain backward-compatible validation wrappers (`validatePreRegistrationInput`, etc.) that wrap `.safeParse()`, keeping existing tests and services 100% functional.
2. **High-Performance Form Management with React Hook Form:**
   - Migrate complex forms to `react-hook-form` paired with `@hookform/resolvers/zod`.
   - Build a canonical suite of accessible form field primitives in `src/components/vms/ui/` (`UiFormField`, `UiTextInput`, `UiSelect`, `UiTextarea`) that automatically wire label IDs, helper text, and validation error messages with zero boilerplate.
   - Wrap specialized controls (webcam photo capture, tap quota selectors) cleanly using `<Controller />`.
3. **Canonical Headless Data Table (`UiDataTable`):**
   - Build `UiDataTable` in `src/components/vms/ui/ui-data-table.tsx` powered by `@tanstack/react-table`, styled exclusively with Kinpaku tokens (`UiCard`, `UiBadge`, `UiButton`).
   - Support both instant in-memory filtering/sorting/pagination and optional URL synchronization.
4. **Type-Safe URL State with `nuqs`:**
   - Integrate `nuqs` to synchronize table query filters (`?q=...`), active page numbers, and sort columns into URL search parameters without triggering Next.js full-page reloads, allowing bookmarkable and shareable operator links.
5. **End-to-End Typed Communications with tRPC v11 & TanStack Query:**
   - Establish tRPC routers in `src/server/trpc/` for all internal `/vms/*` operator dashboard procedures, with repository dependency injection (`vmsRepository`) in the context.
   - Provide `@tanstack/react-query` for reactive query caching, automated deduplication, optimistic mutations, and real-time polling in Active Monitoring.
   - Retain standard Next.js REST Route Handlers for external integrations (HikCentral OpenAPI webhooks and public invitation tokens `/invite/[token]`).
6. **Accessible Feedback with Sonner:**
   - Mount `<Toaster />` via a centralized Client Component `VmsProviders` in `src/app/vms/layout.tsx`.
   - Enforce that all toast notification strings are derived directly from the centralized Indonesian UI dictionary (`src/lib/vms/i18n/id.ts`).

## User Stories

### Developer Experience & Architecture
1. As a frontend developer, I want domain contracts and inputs to be defined via Zod schemas, so that I can automatically derive TypeScript types with `z.infer` without writing duplicate interfaces.
2. As a frontend developer, I want runtime validation to happen through `schema.safeParse()`, so that boundary payloads are strictly validated without repetitive imperative `if/else` checks.
3. As a frontend developer, I want existing validation helper functions to remain callable as backward-compatible wrappers, so that 81 existing test files and 671 unit tests do not break during refactoring.
4. As a frontend developer, I want to use `react-hook-form` with `@hookform/resolvers/zod`, so that I can declare form validation rules directly from domain schemas with zero boilerplate.
5. As a frontend developer, I want canonical Kinpaku form field primitives (`UiFormField`, `UiTextInput`, `UiSelect`), so that labels, IDs, error messages, and ARIA attributes are wired automatically without manually managing `useId()`.
6. As a frontend developer, I want complex inputs like webcam photo capture and tap quota toggles to integrate with React Hook Form via `<Controller />`, so that form submission state is completely unified.
7. As a frontend developer, I want a canonical headless table component `UiDataTable` powered by TanStack Table, so that I don't have to rewrite table pagination, column sorting, and search filtering across 5 different pages.
8. As a frontend developer, I want `UiDataTable` to render using Kinpaku tokens (`UiCard`, `UiBadge`, `UiButton`), so that the visual hierarchy remains 100% compliant with ADR 0007 and ADR 0008.
9. As a frontend developer, I want table search queries and active pages to synchronize to URL search parameters via `nuqs`, so that table state is declarative and shareable.
10. As a fullstack developer, I want internal dashboard API calls to be managed by tRPC v11 procedures, so that client components have full autocomplete and compile-time type safety without manual OpenAPI codegen.
11. As a fullstack developer, I want tRPC routers to receive `vmsRepository` via context dependency injection, so that procedures can be tested in isolation with in-memory repositories during unit testing.
12. As a fullstack developer, I want external webhook handlers (HikCentral) and public self-registration endpoints (`/invite/[token]`) to remain standard REST Route Handlers, so that external consumers are not bound to tRPC client runtimes.
13. As a frontend developer, I want Server Components (`page.tsx`) to continue fetching initial data directly from repositories/services during SSR, so that initial page loads have zero internal HTTP roundtrip latency.
14. As a frontend developer, I want Client Components to use `@tanstack/react-query` hooks (via tRPC) for mutations and real-time polling, so that cache invalidation and loading states are handled automatically.
15. As a frontend developer, I want a centralized `VmsProviders` component mounted in `src/app/vms/layout.tsx`, so that tRPC, TanStack Query, `nuqs`, and Sonner are scoped only to operator dashboard routes and do not bloat public landing pages.
16. As a frontend developer, I want a test helper `renderWithVmsProviders` in `src/test/test-utils.tsx`, so that I can mount components in Vitest with an isolated in-memory `QueryClient` without network flakiness.

### Operator & Receptionist Workflows
17. As a receptionist filling out the Pre-Registration form (`/vms/pre-registration`), I want instant inline validation feedback powered by Zod and React Hook Form, so that I immediately know which fields are missing before attempting to submit.
18. As a receptionist entering visitor names, I want forbidden characters (like `*`, `?`, `/`) to be highlighted with clear Indonesian error messages from `id.ts`, so that HikCentral sync errors are prevented before dispatch.
19. As a receptionist capturing a visitor's webcam photo, I want the photo status and file size validation to integrate smoothly with form submission, so that oversized or invalid images cannot be submitted.
20. As a receptionist submitting a pre-registration, I want an animated, accessible Sonner toast notification to confirm registration success, so that I have clear visual feedback without disruptive browser alert modals.
21. As a security operator viewing the Visitors directory (`/vms/visitors`), I want to search visitors by name, company, or badge number using `UiDataTable`, so that the list filters instantly without reloading the page.
22. As a security operator on the Visitors directory, I want to click column headers to sort by registration date, visitor name, or status, so that I can easily organize large lists.
23. As a security operator who filtered a visitor list, I want the search term and page number to be reflected in the browser URL (via `nuqs`), so that I can copy the link and send it to my colleague to inspect the exact same results.
24. As a security officer on the Active Monitoring page (`/vms/active-monitoring`), I want door statuses and active visitor lists to refresh automatically in the background via TanStack Query polling, so that I always see live hardware and occupancy state.
25. As a security officer granting emergency access, I want mutation errors (e.g. gateway timeout or network failure) to display an accessible, high-contrast error toast from Sonner with retry options, so that I am immediately alerted if hardware fails to unlock.
26. As an approver on the Approvals page (`/vms/approvals`), I want batch review and individual approval actions to trigger automatic query cache invalidation, so that approved requests disappear from the pending queue immediately without manual browser refreshes.

## Implementation Decisions

### 1. Package Dependencies
- Install production dependencies:
  - `zod`
  - `react-hook-form`, `@hookform/resolvers`
  - `@tanstack/react-table`
  - `@tanstack/react-query`
  - `@trpc/server`, `@trpc/client`, `@trpc/react-query`
  - `nuqs`
  - `sonner`
- Verify strict compatibility with `next@16.4.6` and `react@19.3.1`.

### 2. Isomorphic Zod Contracts
- Transition `src/lib/vms/*-contract.ts` (`vms-contract.ts`, `access-level-contract.ts`, `approval-contract.ts`, `checkin-contract.ts`, `checkout-contract.ts`, `group-contract.ts`, `invitation-contract.ts`) to declare canonical Zod schemas.
- Types previously defined as manual `interface` declarations will now be derived via `z.infer<typeof schema>`.
- Existing validation functions (`validatePreRegistrationInput`, `validateAccessLevelInput`, etc.) will be maintained as wrapper functions executing `schema.safeParse()`, maintaining exact output shapes (`{ valid: boolean, errors: Record<string, string> }`) for full backward compatibility with existing tests.
- Contracts remain strictly isomorphic: zero `node:*` imports and zero `process.env` reads.

### 3. Canonical Form Controls (`src/components/vms/ui/`)
- Build modular form components adhering to Kinpaku tokens:
  - `UiFormField`: Container managing label, optional indicator, helper text, and accessible error message with automatic `htmlFor`, `id`, `aria-invalid`, and `aria-describedby` wiring.
  - `UiTextInput`: Styled `<input>` with Kinpaku borders, focus rings, disabled styling, and invalid states.
  - `UiSelect`: Styled `<select>` dropdown with matching micro-bevels and padding.
  - `UiTextarea`: Multiline input for notes and rejection reasons.
- Bridge webcam photo capture (`processBrowserImageFile`) and tap quota selector to React Hook Form via `<Controller />`.

### 4. Headless Canonical Data Table (`UiDataTable`)
- Create `src/components/vms/ui/ui-data-table.tsx` wrapping TanStack Table.
- Primitives provide:
  - Header sorting with visual indicators (chevron up/down/neutral).
  - Built-in pagination controls using `UiButton` and tabular page counters.
  - Global filter input integrated into `UiFilterToolbar`.
  - Empty state message rendering with Indonesian localization from `id.ts`.
  - Optional `nuqs` adapter hooks to bind `page`, `pageSize`, `search`, and `sort` directly to URL search parameters.

### 5. tRPC Router & Data Layer Architecture
- Router directory: `src/server/trpc/`
  - `trpc.ts`: Initializes tRPC with superjson/transformer (or plain JSON) and error formatting.
  - `context.ts`: Context creation injecting `repository: vmsRepository`, facility timezone, and optional session info.
  - `routers/`: Modular domain routers:
    - `visitorRouter`: Visitor search, pre-registration, self-registration verification.
    - `approvalRouter`: Approval queue fetching, approve, and reject mutations.
    - `accessLevelRouter`: Access level queries and assignments.
    - `monitoringRouter`: Active visits, door status polling, emergency overrides.
  - `appRouter`: Root router combining all domain routers.
- Route Handler: `src/app/api/trpc/[trpc]/route.ts` using `fetchRequestHandler`.
- Client integration: `src/lib/trpc/client.ts` exporting `trpc = createTRPCReact<AppRouter>()`.
- Server Components continue to call repositories/services directly without internal HTTP roundtrips.

### 6. Centralized Provider (`VmsProviders`) & Toaster
- Create `src/components/vms/vms-providers.tsx` as a Client Component wrapping:
  - `QueryClientProvider` with standard stale-time and cache configuration.
  - `trpc.Provider` backed by `httpBatchLink({ url: "/api/trpc" })`.
  - `NuqsAdapter` for Next.js App Router query string synchronization.
  - Sonner `<Toaster position="top-right" richColors theme="system" />`.
- Mount `VmsProviders` strictly within `src/app/vms/layout.tsx` so public routes (landing page, `/invite/[token]`) remain lean.

### 7. Phased Implementation Pilot
- **Vertical Slice 1 (Pre-Registration):** Prove Zod + React Hook Form + Kinpaku Form Controls + Sonner by refactoring `src/app/vms/pre-registration/pre-registration-form.tsx`, reducing its line count drastically while retaining all features (face photo, tap quota, multi-facility).
- **Vertical Slice 2 (Visitors & Active Monitoring Table):** Prove TanStack Table + `nuqs` + TanStack Query by refactoring `src/app/vms/visitors/visitors-client.tsx` and `src/app/vms/active-monitoring/active-monitoring-client.tsx`.
- **Vertical Slice 3 (tRPC Routers):** Implement `src/server/trpc/` routers and connect Client Components.

## Testing Decisions

### Testing Seams (Highest Possible Seams)
1. **Frontend Interaction Seam (Highest UI Seam):**
   - Test Client Components using Vitest + React Testing Library via `renderWithVmsProviders(<Component />)` in `src/test/test-utils.tsx`.
   - Tests interact through user-facing roles (`getByRole("button")`, `getByLabelText("Nama Lengkap")`), fill in inputs, submit forms, and assert on rendered outputs, error states, and toast triggers.
   - Do NOT test internal React Hook Form or TanStack Table implementation details. Test only observable DOM changes and callback dispatches.
2. **tRPC Router Seam (Highest API Seam):**
   - Test tRPC procedures directly via `appRouter.createCaller(createContext({ repository: inMemoryRepository }))`.
   - This executes procedures in Node/Vitest with zero network overhead, validating input parsing, domain authorization, and error code mappings (`BAD_REQUEST`, `NOT_FOUND`).
3. **Contract Schema Seam (Isomorphic Boundary):**
   - Test Zod schemas directly using `.safeParse()` with both valid payloads and malicious/edge-case inputs (forbidden HikCentral characters, boundary string lengths, invalid dates).
   - Verify that backward-compatible validation wrappers return identical `{ valid: boolean, errors: Record<string, string> }` shapes.

### Prior Art
- `src/components/vms/ui/ui-components.test.tsx` (tests canonical UI components against accessible DOM contracts).
- `src/app/vms/active-monitoring/active-monitoring-client.test.tsx` (tests complex dashboard client state and modal triggers).
- `src/lib/vms/vms-contract.test.ts` (tests contract validation rules).
- `src/test/e2e-access-enhancements.test.ts` (tests multi-service integration).

### Verification Gates
- `pnpm lint`: Zero ESLint warnings or errors (`jsx-a11y/label-has-associated-control` enabled).
- `pnpm typecheck`: Zero TypeScript compiler errors with `tsc --noEmit`.
- `pnpm test`: 100% pass rate across all 81+ test files (671+ tests).

## Out of Scope
- Rewriting external HikCentral HTTP adapters (`src/lib/hikcentral/*`) to use tRPC (HikCentral communicates via proprietary REST/OpenAPI and signature math).
- Replacing Drizzle ORM or PostgreSQL with a different database layer.
- Changing the Indonesian localization dictionary structure (`src/lib/vms/i18n/id.ts`).
- Public invite link `/invite/[token]` migration to tRPC (remains on REST Route Handler for zero-dependency public access).

## Further Notes
- This specification fulfills the architectural decisions recorded in **ADR 0009** (`docs/adr/0009-modern-developer-experience-stack-zod-rhf-tanstack-trpc.md`).
- All work must be conducted on feature branch `feat/modern-dx-stack`.
- Individual implementation tasks will be tracked as separate numbered ticket files under `.scratch/modern-dx-stack/issues/`.

