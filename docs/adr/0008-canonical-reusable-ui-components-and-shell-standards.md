---
status: accepted
---

# Canonical Reusable UI Component Suite and Enterprise Shell Standards

We will establish a canonical reusable UI component suite (`src/components/vms/ui/`) and enforce uniform enterprise shell patterns across all operational pages in the Visitor Management System (VMS).

## Context

Following the initial Kinpaku design system adoption (ADR 0007), user review via `/grill-with-docs` revealed friction across the application:
1. The desktop sidebar collapse toggle was cramped next to the top logo, breaking standard visual hierarchy when collapsed.
2. The top header overflowed horizontally on mobile viewports (< 640px) due to excessive inline telemetry (live second counter, full facility selector, and breadcrumbs).
3. The codebase lacked a centralized reusable component library, leading to style drift: `/vms/active-monitoring` had a modern high-contrast Kinpaku architecture, while `/vms/approvals`, `/vms/pre-registration`, `/vms/group-registration`, `/vms/access-levels`, `/vms/visitors`, and `/vms/reception` still contained legacy dual-class Tailwind styles, inconsistent button colors (`bg-blue-600`, `bg-neutral-900`), and arbitrary border radiuses (`rounded-lg`, `rounded-xl`, `rounded-full`).

## Considered Options

- **Option 1: Continue ad-hoc styling per page**: Fix buttons and margins in each client file individually. *Rejected: Highly prone to regression and future style drift.*
- **Option 2: Heavy 3rd-party component library (e.g. Radix UI or Full Shadcn CLI)**: Introduce external component packages. *Rejected: Adds unnecessary bundle weight and external dependencies when custom Kinpaku tokens are already established.*
- **Option 3: Canonical Reusable UI Component Suite (`src/components/vms/ui/`)**: Build lightweight, fully accessible, zero-dependency canonical primitives (`UiButton`, `UiCard`, `UiKpiCard`, `UiFilterToolbar`, `UiBadge`, `UiModal`, `PageHeader`) that strictly adhere to Kinpaku design tokens, and systematically refactor all 7 routes to follow the `/vms/active-monitoring` standard. *Accepted.*

## Consequences

- **Ergonomics**: The desktop sidebar collapse toggle moves to the bottom footer dock, keeping the top brand logo centered and uncrowded.
- **Responsiveness**: The mobile header hides non-essential telemetry (second clock) on narrow viewports, truncates breadcrumbs to active page title, and guarantees zero horizontal overflow.
- **Visual Uniformity**: Every button in the application shares identical micro-bevels (`cap-lift`, `cap-press`), font sizes, and consistent border radius (`rounded-[var(--ks-radius-md)]`).
- **Code Maintainability**: All pages follow the identical Server Component (`page.tsx`) + Client Component + Reusable UI Components architecture.
- **Accessibility & Integrity**: Retains 100% test pass rate, focus trapping via `useModalFocusTrap`, and full compliance with Indonesian localized dictionary strings (`id.ts`).

