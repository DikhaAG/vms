# Coding Standards

Judgement-call conventions enforced by `/code-review` alongside ESLint and TypeScript (`pnpm check`). Keep these rules focused on module boundaries and external API safety rather than formatting or type checks that tooling already verifies.

## Module Boundaries (Next.js App Router + HikCentral)

- **Separate isomorphic contracts from server code:** Place shared UI/API types, `as const` option tuples, type guards, and pure input validators in `*-contract.ts` (zero `node:*` imports, zero `process.env` reads) so Client Components never pull Node-only modules into the browser bundle.
- **Derive unions and runtime guards from one `as const` tuple:** Define finite string options once (`export const MODES = [...] as const`), derive the TypeScript union (`(typeof MODES)[number]`), and expose a type guard backed by that tuple instead of duplicating `Set`s or switch lists across route handlers and UI components.
- **Keep each module to one reason to change:** Separate pure protocol math (`signature.ts`), HTTP/TLS transport & env parsing, domain use-cases, and dev stub fixtures cleanly as complexity grows.
- **Keep HTTP client and secrets strictly server-side:** Load `HIKCENTRAL_APP_KEY` and `HIKCENTRAL_APP_SECRET` only inside server modules or Route Handlers, and exclude secrets, raw authorization headers, and raw `responseBody` dumps from structured error objects returned to clients.

## External API Contracts

- **Validate `data` at runtime even when `code === "0"`:** HikCentral responses occasionally omit or alter `data` fields. Narrow `response.data` with an explicit type guard before returning `ok: true` or rendering success state in the UI.
- **Validate boundary payloads before calling use-cases:** Parse JSON inside `try/catch` in Route Handlers, check field types explicitly, and map validation vs config vs upstream/network errors to clear HTTP status codes (`400` / `500` / `502`).
- **Iterate over batch/multi-resource parameters in hardware adapters:** When an adapter receives a collection of physical resources (e.g. `doorIndexCodes: string[]`, `cameraIndexCodes`), iterate or batch across all items so all target hardware controllers receive grants. Never silently truncate to `[0]`.
- **Distinguish optional bodies from malformed bodies in Route Handlers:** In endpoints where a request body is optional (e.g. `DELETE`), inspect content length or text before calling `request.json()`. If a non-empty body contains invalid JSON syntax or fails schema validation, return HTTP `400 Bad Request` immediately rather than silently swallowing into an empty default object.

## Domain Model & Upstream Anti-Corruption Layer

- **Translate upstream naming discrepancies at the adapter boundary:** HikCentral OpenAPI naming quirks (e.g. calling internal host employees `receptionistId`, or embedding typo fields like `getVistorRegisterRecord`) must be translated immediately inside `src/lib/hikcentral/*` adapters. Never let upstream naming anomalies leak into internal domain models, database columns, or UI component props.
- **Normalize photo data URIs at system boundaries:** HikCentral wire payloads expect raw Base64 JPEG strings without the `data:image/...;base64,` prefix. Strip any data URI scheme before serializing wire payloads to HikCentral, and conversely attach a valid data URI prefix when returning or rendering image sources in Client Components.
- **Distinguish hardware resource codes from human labels:** Keep physical device identifiers (e.g. `doorIndexCode`, `cameraIndexCode`) strictly separate from display labels (`doorName`, `facilityName`). Never pass human-readable labels into arrays or parameters expected by upstream hardware controllers or access level assignments.
- **Isolate repository persistence behind clean interfaces:** Define repository interfaces so use-cases and domain services can run against lightweight in-memory stores during fast TDD cycles without being tightly coupled to a running database container.

## UI & React Composition

- **Extract repeated form/control chrome:** When two or more fieldsets or panels share identical interactive markup (such as radio-card groups), extract one parameterized helper component rather than duplicating JSX loops.
- **Extract complex modal dialogs:** Interactive modals with dedicated state, form validation, and API submissions should be extracted into co-located component files (e.g. `emergency-access-modal.tsx`) rather than inlined in the parent dashboard view.
- **Keep identifiers crisp in forms:** Disable prose autocorrection (`autoCorrect="off"`, `autoCapitalize="none"`, `spellCheck={false}`) on technical ID inputs, associate every `<label>` via `htmlFor`/`id`, and validate on blur/submit while keeping submit enabled until an active request is in flight.
- **Enforce Escape dismissal and Tab focus trap on modal dialogs & drawers:** Every overlay dialog (`role="dialog"`) or mobile drawer must use the shared `useModalFocusTrap({ ref, isOpen, onClose })` hook from `@/components/vms/use-modal-focus-trap`. Never hand-roll duplicate imperative DOM keydown listeners.
- **Initialize modal form state via keyed remounting instead of effect sync:** In React 19, avoid calling `setState` synchronously within `useEffect` when an edit modal opens. Instead, pass a composite key to the modal component (`key={`${editingId ?? "new"}-${isOpen}`}`) and initialize form state via callback initializers (`useState(() => ...)`) so the form resets cleanly on mount.
- **Normalize HTML entity escaping in static markup assertions:** When asserting string outputs from `renderToStaticMarkup` against i18n dictionaries, normalize characters with `escapeHtml` (`&` -> `&amp;`, `'` -> `&#x27;`, `<`/`>` -> `&lt;`/`&gt;`) instead of raw string equality.
- **Keep hook invocations unconditional in Client Components:** Never call React hooks inside `try...catch` or conditional branches to silence test environment errors. Isolate test mocks in `src/test/setup.ts` or custom hook abstractions instead.

