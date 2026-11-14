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

