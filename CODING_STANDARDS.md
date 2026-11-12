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

## UI & React Composition

- **Extract repeated form/control chrome:** When two or more fieldsets or panels share identical interactive markup (such as radio-card groups), extract one parameterized helper component rather than duplicating JSX loops.
- **Keep identifiers crisp in forms:** Disable prose autocorrection (`autoCorrect="off"`, `autoCapitalize="none"`, `spellCheck={false}`) on technical ID inputs, associate every `<label>` via `htmlFor`/`id`, and validate on blur/submit while keeping submit enabled until an active request is in flight.

