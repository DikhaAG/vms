---
name: Visitor Management System (VMS) — Kinpaku Design System
description: Japanese craft-inspired physical access control and visitor management with tactile micro-depth, high-contrast ink typography, and high-density split-pane layouts.
colors:
  primary: "oklch(84% 0.19 80.46)"
  primary-rich: "oklch(77% 0.13 82)"
  primary-deep: "oklch(61% 0.085 78)"
  neutral-paper: "oklch(97.8% 0 0)"
  neutral-paper-raised: "oklch(99.5% 0 0)"
  neutral-paper-deep: "oklch(95% 0 0)"
  neutral-ink: "oklch(13% 0 0)"
  neutral-text: "oklch(22% 0 0)"
  neutral-muted: "oklch(46% 0 0)"
  neutral-faint: "oklch(51% 0 0)"
  neutral-rule: "oklch(13% 0 0 / 0.08)"
  neutral-edge: "oklch(13% 0 0 / 0.45)"
  success: "oklch(70% 0.12 188)"
  success-deep: "oklch(45% 0.1 190)"
  warning: "oklch(76% 0.15 65)"
  danger: "oklch(52% 0.16 35)"
  danger-deep: "oklch(42% 0.15 32)"
typography:
  display:
    fontFamily: '"Albert Sans", "Avenir Next", "Helvetica Neue", Arial, system-ui, sans-serif'
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Albert Sans", "Avenir Next", "Helvetica Neue", Arial, system-ui, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: '"Albert Sans", "Avenir Next", "Helvetica Neue", Arial, system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: '"Albert Sans", "Avenir Next", "Helvetica Neue", Arial, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  mono:
    fontFamily: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  eyebrow:
    fontFamily: '"Albert Sans", sans-serif'
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
    textTransform: "uppercase"
rounded:
  sm: "3px"
  md: "8px"
  pill: "999px"
shadows:
  lift-1: "0 1px 1px oklch(13% 0 0 / 0.05), 0 2px 3px oklch(13% 0 0 / 0.04), 0 6px 12px oklch(13% 0 0 / 0.05)"
  lift-2: "0 1px 1px oklch(13% 0 0 / 0.04), 0 3px 5px oklch(13% 0 0 / 0.05), 0 12px 20px oklch(13% 0 0 / 0.06), 0 32px 48px oklch(13% 0 0 / 0.07)"
  cap-lift: "inset 0 1px 0 oklch(100% 0 0 / 0.9), 0 1px 0 oklch(13% 0 0 / 0.14), 0 2px 3px oklch(13% 0 0 / 0.08)"
  cap-press: "inset 0 1px 2px oklch(13% 0 0 / 0.14)"
  track-recess: "inset 0 1px 3px oklch(13% 0 0 / 0.16), inset 0 -1px 0 oklch(100% 0 0 / 0.7)"
  led-glow: "0 0 0 1px oklch(13% 0 0 / 0.12), 0 0 4px var(--led)"
---

# Design System: Visitor Management System (VMS) — Kinpaku (金箔)

## Overview

**Creative North Star: "Presisi Taktil & Ketertiban Berwibawa" (Tactile Precision & Dignified Governance)**

The VMS visual architecture adopts the **Kinpaku (金箔)** design paradigm from `https://impeccable.style/`. Moving beyond flat, generic enterprise software defaults, Kinpaku anchors access control and security management in Japanese paper craft, tactile instrument hardware, and razor-sharp typographic discipline.

The visual experience balances:
1. **Warm Paper Canvas (`--ks-paper`)**: Natural off-white tactile background that prevents screen glare during long operator shifts.
2. **Paper-Raised Surfaces (`--ks-paper-raised`)**: Crisp modular card containers separated by 1px hairline rules (`oklch(13% 0 0 / 0.08)`).
3. **Deep Ink Typography (`--ks-ink`)**: Albert Sans paired with JetBrains Mono for clinical legibility across dense biometric and telemetry tables.
4. **Kinpaku Gold / Brass Accents (`--ks-kinpaku`)**: Warm, authoritative highlights reserved for active navigation, key controls, and focus states.
5. **Physical Instrument Controls**: Micro-beveled button surfaces (`cap-lift` highlight + `cap-press` inset) and illuminated hardware LED status dots (`0 0 4px var(--led)`).

Confirmed visual anti-references: generic pastel SaaS gradients, neon cyberpunk badges, bulky rounded cartoonish buttons, and generic admin dashboard templates.

---

## Color Tokens

| Token Name | OKLCH Value | CSS Variable | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Warm Paper** | `oklch(97.8% 0 0)` | `--ks-paper` | Global application canvas background |
| **Paper Raised** | `oklch(99.5% 0 0)` | `--ks-paper-raised` | Cards, modals, table rows, form inputs |
| **Paper Deep** | `oklch(95% 0 0)` | `--ks-paper-deep` | Sub-panels, table headers, recessed trays |
| **Deep Ink** | `oklch(13% 0 0)` | `--ks-ink` | Primary headings, active labels, high-contrast text |
| **Body Text** | `oklch(22% 0 0)` | `--ks-text` | Body copy, descriptions, standard data cells |
| **Muted Ink** | `oklch(46% 0 0)` | `--ks-text-muted` | Helper text, breadcrumbs, unselected navigation |
| **Hairline Rule** | `oklch(13% 0 0 / 0.08)` | `--ks-rule` | 1px architectural borders and dividers |
| **Edge Accent** | `oklch(13% 0 0 / 0.45)` | `--ks-edge` | High-contrast focus boundaries and active rules |
| **Kinpaku Gold** | `oklch(84% 0.19 80.46)` | `--ks-kinpaku` | Primary brand accent, active navigation bar |
| **Patina Teal** | `oklch(70% 0.12 188)` | `--ks-patina` | Verified doors, turnstile online, approved state |
| **Vermilion Red** | `oklch(52% 0.16 35)` | `--ks-vermilion` | Emergency release, overstay violation, system alarm |

---

## Typography Hierarchy

- **Font UI:** `Albert Sans`, `Avenir Next`, `system-ui`, `sans-serif`
- **Font Telemetry/Code:** `JetBrains Mono`, `ui-monospace`, `monospace`
- **Display Titles (`text-2xl` / `1.875rem`):** Albert Sans, weight 700, tight tracking (`-0.02em`).
- **Section Headers (`text-lg` / `1.125rem`):** Albert Sans, weight 600, line-height 1.3.
- **Micro-Eyebrows (`text-[11px]`):** Albert Sans, weight 700, uppercase, tracking `0.14em` (`tracking-[0.14em]`).
- **Telemetry & Hardware Identifiers:** JetBrains Mono, weight 500, tabular numbers.

---

## Physical Depth & Component Elevation

```css
/* Micro-beveled button cap lift */
--ks-cap-lift: inset 0 1px 0 oklch(100% 0 0 / 0.9), 0 1px 0 oklch(13% 0 0 / 0.14), 0 2px 3px oklch(13% 0 0 / 0.08);

/* Tactile button press inset */
--ks-cap-press: inset 0 1px 2px oklch(13% 0 0 / 0.14);

/* Physical LED hardware glow */
--ks-led: 0 0 0 1px oklch(13% 0 0 / 0.12), 0 0 4px var(--led-glow);

/* Physics spring transition */
--ks-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
```

---

## Layout Architecture

1. **Desktop Management Shell (`>= 1024px`)**:
   - Fixed left sidebar (`w-64` or `w-18` collapsed) with active item highlighted via a Kinpaku Gold vertical line or subtle warm paper-deep highlight.
   - Fixed top header (`h-16`) containing facility selector, real-time timezone clock (`JetBrains Mono`), HikCentral hardware gateway status badge with glowing LED, and operator profile.
   - Master-Detail high-density workspace minimizing vertical scrolling.
2. **Mobile Layout (`< 1024px`)**:
   - Header hamburger button opens an accessible slide-out navigation drawer with backdrop blur.
   - Focus trap and Escape listener ensure seamless keyboard accessibility.
