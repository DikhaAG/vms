# Spec: Unified UI Component Suite, Shell Responsiveness, and Multi-Page Architectural Alignment

Status: ready-for-agent

## Problem Statement

Following the initial adoption of the Kinpaku design system, several critical ergonomic, responsive, and architectural inconsistencies remain across the Visitor Management System (VMS):

1. **Sidebar Toggle Ergonomic Degradation:** The desktop sidebar collapse toggle button is cramped beside the brand logo inside the top 64px header rail. When collapsed into an icon-only rail, both the logo icon and the toggle button compete for horizontal space in a narrow width, breaking standard layout best practices and causing visual awkwardness.
2. **Top Navigation Mobile Screen Overflow:** On mobile screens (< 640px / 768px), the top navigation bar displays the hamburger button, breadcrumb trail, full facility selector dropdown, live second-counter clock, and user avatar on a single horizontal row without wrapping or truncation. This causes the top header to horizontally overflow viewport boundaries, introducing unsightly horizontal scrollbars and squished elements.
3. **Disparate Page Component Architecture:** While `/vms/active-monitoring` has been refactored into a modern, high-contrast, structured pattern (Server Component page, interactive KPI card grid, dedicated search & filter toolbar, Kinpaku tokenized table, and accessible focus-trapped dialogs), the remaining operational routes (`/vms/reception`, `/vms/approvals`, `/vms/pre-registration`, `/vms/group-registration`, `/vms/access-levels`, and `/vms/visitors`) continue to use legacy patterns, ad-hoc inline styling, and obsolete dual-class light/dark Tailwind utilities.
4. **Widespread Border Radius & Button Inconsistencies:** Buttons, cards, and input fields across the system exhibit haphazard styling—varying between `rounded-none`, `rounded-lg`, `rounded-xl`, `rounded-full`, `bg-neutral-900`, `bg-blue-600`, `bg-white`, and custom `.ks-btn` classes without a unified design token standard.
5. **Absence of Canonical Reusable Components:** Developers are forced to repeatedly duplicate complex markup for KPI cards, filter toolbars, modal dialogs, and action buttons across page files, resulting in style drift and maintenance friction.

## Solution

1. **Enterprise Docked Sidebar Toggle:** Re-architect the desktop sidebar by moving the collapse/expand trigger to a dedicated bottom dock (footer) of the sidebar rail—adhering to best practices established in modern enterprise consoles (VS Code, Linear, JetBrains). This leaves the top brand header uncluttered and ensures that in collapsed mode, the brand mark sits cleanly centered.
2. **Overflow-Free Responsive Top Navigation:** Refactor the top navigation bar for mobile viewports by hiding the live second-counter clock on small viewports (< 640px, while keeping it accessible in the mobile slide-out drawer), truncating breadcrumbs to the active page title, streamlining the facility selector, and applying strict overflow boundaries to guarantee zero horizontal scrolling.
3. **Canonical Reusable Component Suite:** Establish a single source of truth for UI building blocks:
   - **Tactile Button (`UiButton`):** Standardized button supporting `primary`, `secondary`, `danger`, and `ghost` variants with uniform micro-bevels, tactile pressed states, and consistent `rounded-[var(--ks-radius-md)]` geometry.
   - **Paper Surface (`UiCard`, `UiCardHeader`, `UiCardContent`):** Uniform container surfaces built on Kinpaku paper tokens with hairline 1px rules and standard padding.
   - **Metric Cards (`UiKpiCard`, `UiKpiGrid`):** Standardized KPI cards featuring eyebrow labels, high-contrast tabular numeric counters, semantic LED glow dots, and interactive filter button capabilities.
   - **Filter Toolbar (`UiFilterToolbar`):** Unified search and filtering bar providing standard search inputs, facility selection slots, and action buttons.
   - **Status Badge (`UiBadge`):** Unified badge component tied directly to the centralized Indonesian dictionary (`idDict.statusBadges`).
   - **Accessible Modal (`UiModal`):** Reusable dialog component wrapping backdrop blur, focus trapping, escape key handling, title bar, content, and action footer.
4. **Complete Multi-Page Architectural Migration:** Refactor all 6 remaining operational routes (`/vms/reception`, `/vms/approvals`, `/vms/pre-registration`, `/vms/group-registration`, `/vms/access-levels`, and `/vms/visitors`) to strictly match the code structure and component hierarchy established by `/vms/active-monitoring`.

## User Stories

1. As a security operator using a desktop monitor, I want the sidebar collapse toggle to be positioned cleanly at the bottom of the navigation rail, so that the top logo remains uncrowded and my mouse navigation feels natural.
2. As a security operator working on a collapsed sidebar, I want the brand logo to be centered cleanly without an awkward button jammed beside it, so that the interface looks professional and calm.
3. As a security operator working on a collapsed sidebar, I want an obvious, accessible bottom toggle button with a clear tooltip and accessible label, so that I can easily expand the sidebar back to full width.
4. As a mobile operator or receptionist using a smartphone, I want the top header bar to never scroll horizontally or overflow, so that I have a clean, stable interface on any screen size.
5. As a mobile operator, I want secondary telemetry like the live seconds clock to be hidden on narrow screens, so that the navigation bar does not run out of room.
6. As a mobile operator opening the mobile navigation drawer, I want to see the facility timezone and current local time prominently inside the drawer header, so that I never lose situational awareness of the facility clock.
7. As a mobile operator, I want the top breadcrumb on small screens to display just the current page title, so that it does not collide with the hamburger button or facility selector.
8. As a receptionist on the Reception Desk page (`/vms/reception`), I want the filter buttons ("Semua", "Normal", "Overstay", "Kuota") to share the exact same tactile button styling, active state, and border radius as the Active Monitoring page, so that the system feels cohesive.
9. As a receptionist processing walk-ins, I want the walk-in modal, verification modal, and pass modal to use a standard modal layout with consistent close buttons and footer actions, so that my workflow is predictable.
10. As a host approver on the Approvals page (`/vms/approvals`), I want the page header, filter toolbar, approval queue cards, and rejection modal to use the exact same Kinpaku paper cards, buttons, and status badges as Active Monitoring, so that I am not looking at outdated gray-and-blue boxes.
11. As a security officer reviewing watch-list escalations on the Approvals page, I want escalated items to feature high-contrast Kinpaku status badges with illuminated LED indicators, so that critical security alerts are instantly noticeable.
12. As an employee creating a pre-registration invitation (`/vms/pre-registration`), I want every section of the form (facility selection, visitor details, photo capture, schedule, host details, and access level selection) to be wrapped in uniform paper cards with standardized typography, so that the form is pleasant and easy to fill.
13. As an employee selecting access levels during pre-registration, I want the selectable access cards and tap quota options to match the unified card and button styling, so that the selection states are unmistakably clear.
14. As an employee scheduling a group visit (`/vms/group-registration`), I want the group header card, delegation member table, and QR credential pass cards to match the unified component system, so that mass visitor bookings look authoritative.
15. As a security administrator managing access levels (`/vms/access-levels`), I want the door synchronization button, create access button, and access level cards to use standardized tactile buttons and paper cards, so that master security configurations feel sturdy and precise.
16. As a security administrator creating an access level, I want the access level creation modal to use the unified modal component with focus trapping and standardized form controls, so that keyboard navigation is fully accessible.
17. As an auditor reviewing the visitor database (`/vms/visitors`), I want the summary KPI cards (Total Basis Data, Profil Aktif, Arsip PDP) to use the exact same `UiKpiCard` component as Active Monitoring, so that metrics look consistent across the entire product.
18. As an auditor searching for visitor records, I want the search input and PDP compliance filter to be housed in the standard `UiFilterToolbar`, so that table filtering works identically across all pages.
19. As a front-end developer, I want to import `UiButton`, `UiCard`, `UiKpiCard`, `UiFilterToolbar`, `UiBadge`, and `UiModal` from a single component module, so that I never write custom ad-hoc button classes or arbitrary border-radius values again.
20. As a front-end developer, I want all buttons in the system to strictly honor the Kinpaku micro-bevel and elevation design tokens (`cap-lift`, `cap-press`, `--ks-radius-md`), so that visual harmony is guaranteed across all future feature additions.

## Implementation Decisions

### 1. Reusable Component Suite Architecture
- Construct a dedicated canonical component library containing:
  - **`UiButton`**: Exports a polymorphic or standard HTML button supporting variants:
    - `primary`: Kinpaku ink / gold accent with tactile shadow and micro-lift.
    - `secondary`: Paper raised with subtle rule border, ink text, and micro-lift.
    - `danger`: Vermilion red accent with subtle border for destructive actions.
    - `ghost`: Transparent background with hover state for icon actions and quiet controls.
    - Standardized sizes (`sm`, `md`, `lg`) and uniform border radius (`rounded-[var(--ks-radius-md)]` or `rounded-[var(--ks-radius-sm)]`).
  - **`UiCard`, `UiCardHeader`, `UiCardContent`**: Clean container components rendering paper-raised canvas, 1px subtle rule borders, and standard padding.
  - **`UiKpiCard` & `UiKpiGrid`**: Grid wrapper and individual card components rendering eyebrow label, large font-mono tabular value, auxiliary description, optional semantic LED indicator, and interactive button/tab selection state.
  - **`UiFilterToolbar`**: Flexbox container with paper-raised background, subtle rule border, standard padding, and slots for facility dropdown, search input, and action buttons.
  - **`UiBadge`**: Standardized pill badge linking status codes to localized labels and LED glowing dots.
  - **`UiModal`**: Standard accessible dialog wrapping backdrop blur, `useModalFocusTrap`, Escape key handling, header with title and close icon, content body, and action footer.
  - **`PageHeader`**: Standardized page title header with eyebrow, title, live status badge slot, subtitle, and guide modal slot.

### 2. Sidebar Navigation Re-Architecture
- Move the desktop sidebar collapse toggle from the top header to a dedicated footer dock at the bottom of the sidebar.
- In expanded mode (`w-64`), the footer dock displays a full-width tactile button with a collapse icon and "Ciutkan Menu" text.
- In collapsed mode (`w-18`), the footer dock displays a centered square button with an expand icon and accessible tooltip.
- The top header of the sidebar maintains a fixed height (64px) with the VMS logo and brand title when expanded, and a cleanly centered single "V" mark when collapsed, eliminating layout crowding.

### 3. Top Navigation Bar Mobile Optimization
- Wrap the header in an overflow-protected container (`max-w-full overflow-hidden`).
- On small screens (`< sm` / `< 640px`):
  - Hide the live seconds clock and timezone badge from the header (retaining it in the mobile drawer).
  - Truncate breadcrumb trail so it displays only the current page title.
  - Apply clean width constraints to the facility selector so it never forces horizontal overflow.
  - Ensure the hamburger button, title, facility selector, and avatar fit comfortably within 360px–390px viewports without horizontal scrolling.

### 4. Systematic Multi-Page Refactoring (Matching Active Monitoring)
- **`/vms/reception`**:
  - Replace custom status filter pills with `UiKpiCard` or `UiButton`.
  - Replace ad-hoc modal markup for Walk-in, Camera Capture, and Pass Issuance with `UiModal`.
  - Apply `PageHeader` and `UiCard` to the main check-in layout.
- **`/vms/approvals`**:
  - Replace legacy `bg-white`, `border-neutral-200`, and `bg-neutral-900` elements with `PageHeader`, `UiFilterToolbar`, `UiCard`, and `UiButton`.
  - Refactor rejection modal to use `UiModal`.
  - Standardize status badges with `UiBadge`.
- **`/vms/pre-registration`**:
  - Replace the 6-section form with `UiCard` blocks.
  - Standardize facility selector radio cards, camera buttons, and invite generation buttons using `UiButton`.
  - Align `page.tsx` header with `PageHeader`.
- **`/vms/group-registration`**:
  - Standardize delegation group form, member entry grid, and QR credential cards using `UiCard`, `UiButton`, and `UiBadge`.
- **`/vms/access-levels`**:
  - Replace legacy access level cards with `UiCard`.
  - Replace door sync button and create button with `UiButton`.
  - Refactor access level form modal to use `UiModal`.
- **`/vms/visitors`**:
  - Replace legacy metric cards with `UiKpiGrid` and `UiKpiCard`.
  - Replace filter/search bar with `UiFilterToolbar`.
  - Align profiles table with Kinpaku table styles and `UiButton` action triggers.

### 5. Architectural Alignment & ADR Recording
- Codify the unified reusable component architecture and shell refinements in ADR 0008 (`docs/adr/0008-canonical-reusable-ui-components-and-shell-standards.md`).
- Update `GLOSSARY.md` with definitions for the reusable UI component primitives.

## Testing Decisions

### What Makes a Good Test
- Tests must assert external behavior, accessibility, and visual structure (checking presence of accessible labels, focus trapping, semantic roles, and responsive attributes), without binding tightly to brittle internal implementation details.
- Tests must verify that all 7 operational routes render properly without runtime errors and honor the centralized Indonesian dictionary strings.

### Modules Tested
- **Component Suite**: Unit and integration tests for `UiButton`, `UiCard`, `UiKpiCard`, `UiFilterToolbar`, `UiBadge`, `UiModal`, and `PageHeader`.
- **Shell**: Header mobile responsiveness and Sidebar bottom dock collapse/expand behavior.
- **Page Integration**: Existing test suites for all 7 routes:
  - `sidebar.test.tsx`, `header.test.tsx`, `app-shell.test.tsx`
  - `active-monitoring-client.test.tsx`
  - `reception-client.test.tsx`
  - `approvals-client.test.tsx`
  - `pre-registration-form.test.tsx`
  - `group-registration-client.test.tsx`
  - `access-levels-client.test.tsx`
  - `visitors-client.test.tsx`
  - `e2e-ui-indonesian-shell.test.tsx`
  - `production-integrity.test.ts`

### Prior Art
- Existing component tests in `src/components/vms/*.test.tsx` and route tests in `src/app/vms/*/*.test.tsx`.

## Out of Scope
- Backend API schema changes or HikCentral hardware integration changes.
- Altering the Indonesian dictionary strings (`src/lib/vms/i18n/id.ts`) other than adding new component labels if needed.
- Mocking hardware or relaxing production integrity checks.

## Further Notes
- All changes must pass `pnpm check` (linting, typechecking, and 100% test pass rate across 631 tests).

