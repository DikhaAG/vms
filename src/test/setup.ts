import { vi } from "vitest";

// Default lightweight mock for Next.js App Router navigation hooks in node test environment
vi.mock("next/navigation", () => ({
  usePathname: () => "/vms/reception",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Default fallback mock for nuqs useQueryState when components are rendered in static test assertions without NuqsAdapter or outside App Router
vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryState: (key: string, parser?: { defaultValue?: unknown }) => {
      try {
        return (
          actual.useQueryState as unknown as (
            k: string,
            p?: { defaultValue?: unknown }
          ) => unknown
        )(key, parser);
      } catch (err: unknown) {
        const error = err as Error | undefined;
        if (
          error?.message?.includes("nuqs requires an adapter") ||
          error?.message?.includes("expected app router to be mounted")
        ) {
          const defaultValue = parser?.defaultValue ?? "";
          return [defaultValue, vi.fn()];
        }
        throw err;
      }
    },
  };
});

// The app always uses PostgreSQL (ADR 0006). Tests swap the shared singleton for
// the in-memory test double so they run without a database.
vi.mock("@/lib/vms/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vms/repository")>();
  return {
    ...actual,
    defaultVmsRepository: new actual.InMemoryVmsRepository(),
  };
});
