---
status: accepted
---

# Adoption of Kinpaku Design System and Impeccable Visual Architecture

We will adopt the **Kinpaku (金箔)** visual design system inspired by `https://impeccable.style/` across the entire VMS application shell, token architecture, typography, and interactive components.

## Context

Following user review via `/grill-with-docs`, the previous UI styling—based on generic enterprise SaaS templates (flat white cards, standard Inter font, `#1d4ed8` corporate blue, and standard slate borders)—lacked distinction, aesthetic character, and operational presence. The user directed the adoption of the exact visual design qualities of `https://impeccable.style/`:
- Warm paper canvas and raised paper surfaces.
- Deep ink typography with high contrast.
- Kinpaku gold/brass accenting.
- Patina cyan-teal and vermilion for hardware access control and emergency telemetry.
- Tactile micro-beveled control buttons (`cap-lift` highlight + `cap-press`).
- Glowing hardware LED status indicators (`box-shadow: 0 0 4px var(--led)`).
- Geometric Albert Sans typography paired with JetBrains Mono for telemetry, badge IDs, and timestamps.
- Retention of the enterprise management shell layout: fixed top header, collapsible left sidebar on desktop, slide-out drawer on mobile with hamburger toggle, and high-density split-pane master-detail operational views.

## Considered Options

- **Option 1: Generic Tailwind / Shadcn corporate defaults**: Standard slate cards, default blue primary, standard Inter typography, flat borders. *Rejected: Felt like generic AI-slop / template admin.*
- **Option 2: Dark-mode CCTV terminal styling**: High contrast black background with neon green/amber telemetry. *Rejected: Causes severe eye fatigue for receptionists and daytime corporate staff.*
- **Option 3: Impeccable Kinpaku Design System**: Warm tactile paper canvas (`--ks-paper`), raised cards (`--ks-paper-raised`), deep ink typography (`--ks-ink`), Kinpaku gold (`--ks-kinpaku`) accents, patina teal (`--ks-patina`) hardware indicators, tactile button bevels, and Albert Sans + JetBrains Mono typography, wrapped in a structured enterprise management shell. *Accepted.*

## Consequences

- **Visual Character**: Transforms the application from a generic admin dashboard into a prestigious, tactile, high-craft operational system ("The Sovereign Concierge / Gerbang Presisi Terpercaya").
- **Physical Feel**: Micro-beveled action buttons and LED glows provide immediate tactile and visual feedback appropriate for security and access control hardware.
- **Scannability**: High-contrast deep ink and JetBrains Mono ensure timestamps, door IDs, and visitor credentials can be read in milliseconds without cognitive friction.
- **Responsive Architecture**: The desktop sidebar collapses cleanly to icon-only mode, and mobile devices (< 768px) access full navigation via a smooth slide-out drawer triggered by a header hamburger button.
- **Integrity & Compatibility**: All Indonesian localized strings (`src/lib/vms/i18n/id.ts`) and zero-mock hardware security constraints (`production-integrity.test.ts`) remain 100% enforced and untouched.

