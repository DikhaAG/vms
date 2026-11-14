---
name: Visitor Management System (VMS)
description: Enterprise visitor scheduling, biometric verification, and physical access management with polite Indonesian Operate Mode
colors:
  primary: "#1d4ed8"
  primary-hover: "#1e40af"
  primary-subtle: "#eff6ff"
  neutral-dark: "#0f172a"
  neutral-card: "#ffffff"
  neutral-bg: "#f8fafc"
  neutral-border: "#e2e8f0"
  neutral-muted: "#64748b"
  success: "#059669"
  success-subtle: "#ecfdf5"
  warning: "#d97706"
  warning-subtle: "#fffbeb"
  danger: "#dc2626"
  danger-subtle: "#fef2f2"
  info: "#2563eb"
  info-subtle: "#eff6ff"
typography:
  display:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.025em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-card}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-card}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  badge:
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Visitor Management System (VMS)

## Overview

**Creative North Star: "Gerbang Presisi Terpercaya" (The Sovereign Concierge)**

The Visitor Management System visual system combines the institutional rigor and precision of enterprise access control with the dignified, polite hospitality of modern Indonesian corporate governance. Tailored for continuous operational shifts by receptionists, security officers, and hosts, the interface prioritizes high information density, instantaneous scannability, and cognitive clarity over decorative novelty.

The aesthetic philosophy is rooted in structured restraint: a serene slate-tinted canvas (`#f8fafc`), crisp white modular surfaces (`#ffffff`), 1px architectural dividers (`#e2e8f0`), and an authoritative Institutional Blue (`#1d4ed8` / `#2563eb`) signaling operational state and active controls. Operational statuses are communicated through unambiguous, high-contrast semantic palettes (Emerald, Amber, Rose, Slate) accompanied by live status dots, ensuring operators never mistake a pending approval for an active clearance.

Confirmed visual anti-references: generic consumer SaaS pastel gradients, cartoonish illustrations, low-density marketing fluff, and dark, retro CCTV terminal styling that causes eye strain during long security shifts.

**Key Characteristics:**
- High-density Operate Mode designed for rapid data entry and verification.
- Flat architectural layering with subtle 1px structural boundaries.
- Dedicated, polite Indonesian UI vocabulary free from technical acronyms.
- Universal keyboard accessibility with focus traps and Escape listeners.
- Complete visual isolation between staff operational consoles and public mobile visitor portals.

## Colors

The palette character balances institutional authority with clean, functional clarity, utilizing precise slate neutrals for scaffolding and semantic accents strictly for operational status.

### Primary
- **Institutional Blue** (`#1d4ed8`): Primary brand color, active sidebar navigation pills, primary operational buttons, and focused form outlines.
- **Deep Navy** (`#1e40af`): Hover state for primary buttons and high-priority confirmations.
- **Subtle Blue Tint** (`#eff6ff`): Subtle background fill for active navigation items, informational callouts, and the Page Guide trigger button.

### Neutral
- **Slate Void** (`#0f172a`): High-contrast primary headings, logo marks, and dark mode background surfaces.
- **Clean Slate White** (`#ffffff`): Card containers, modal windows, table rows, and form inputs.
- **Canvas Mist** (`#f8fafc`): Global background canvas that eliminates glare on high-brightness desktop monitors.
- **Architectural Border** (`#e2e8f0`): 1px structural container borders, horizontal rules, and table cell dividers.
- **Muted Steel** (`#64748b`): Subtitles, helper text, empty state descriptions, and table column headers.

### Semantic Status
- **Operational Emerald** (`#059669` / `#ecfdf5`): Approved visits, active turnstile connectivity, and verified biometric photos.
- **Cautionary Amber** (`#d97706` / `#fffbeb`): Pending approvals, approaching visit windows, and warnings.
- **Alert Rose** (`#dc2626` / `#fef2f2`): Overstay alarms, rejected requests, access violations, and emergency overrides.
- **Terminal Slate** (`#64748b` / `#f1f5f9`): Completed visits, checked-out visitors, and archived records.

### Named Rules
**The Semantic Purity Rule.** Status colors (Emerald, Amber, Rose) are strictly reserved for functional operational states (Approved, Pending, Overstay/Error). They must never be applied decoratively, as background wallpapers, or as arbitrary brand accents.

**The Action Singularity Rule.** Every card, form section, or modal dialog has at most one dominant primary action button. Secondary actions must use restrained outline or ghost styling to prevent operator hesitation.

## Typography

**Display & Body Font:** Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
**Monospace Font:** ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace

The typographic pairing provides clinical legibility across dense tabular grids while maintaining polite, humanist warmth in headers and Indonesian operator instructions.

### Hierarchy
- **Display** (Bold 700, 1.875rem / 30px, line-height 1.2, letter-spacing -0.02em): Main page titles and greeting headers.
- **Headline** (Bold 700, 1.25rem / 20px, line-height 1.3, letter-spacing -0.01em): Section titles, modal headers, and KPI stat titles.
- **Title** (Semibold 600, 1.0rem / 16px, line-height 1.4): Table headers, card titles, and navigation group banners.
- **Body** (Regular 400 / Medium 500, 0.875rem / 14px, line-height 1.5): Form inputs, descriptive labels, guide explanations, and table data cells.
- **Label & Meta** (Medium 500 / Bold 700, 0.75rem / 12px, letter-spacing 0.025em, uppercase in sidebar group headers): Badges, timestamps, counter tags, and metadata captions.

### Named Rules
**The Tabular Clarity Rule.** Timestamps, visit identification numbers, certificate numbers, tap quotas, and countdown timers must always render in monospace or tabular figures (`font-mono`) to prevent layout shifting during real-time telemetry refreshes.

## Layout

The spatial model enforces an ergonomic desktop experience for multi-hour workstation usage, combined with seamless mobile drawer adaptability for tablets and smartphones.

- **Desktop Shell**: 
  - Collapsible desktop sidebar: `w-64` (256px) expanded with full labels and section titles, transitioning smoothly to `w-18` (72px) collapsed icon-only mode with tooltips.
  - Sticky operational header (`h-16` / 64px) housing the facility timezone clock (`Asia/Jakarta WIB`, `Asia/Makassar WITA`, `Asia/Jayapura WIT`), terminal connection heartbeats, breadcrumbs, and operator profile.
  - Main operational workspace: `flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8` on a subtle gray canvas (`bg-slate-50`).
- **Responsive Drawer**: 
  - On screens under 1024px (`lg`), the sidebar converts to an off-canvas drawer sheet with an accessible backdrop overlay (`bg-slate-900/40 backdrop-blur-xs`), Tab focus trap, and Escape key listener.
- **Public Portal Isolation**: 
  - External visitor self-registration (`/invite/[token]`) renders outside the internal `AppShell`. It uses a centered, card-based, mobile-first container (`max-w-lg mx-auto`) optimized for touchscreens and camera self-portraits.

## Elevation & Depth

Depth is established primarily through tonal contrast and crisp borders rather than heavy atmospheric shadows. Surfaces sit flat on the canvas, with elevation reserved strictly for floating dialogs and ephemeral sheets.

### Shadow Vocabulary
- **Micro Resting** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Standard buttons, KPI cards, form fields, and table cards.
- **Interactive Hover** (`box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.08)`): Active navigation pills and card hover states.
- **Modal Overlay** (`box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`): Standardized `PageGuideModal`, force check-out dialogs, and emergency access panels.

### Named Rules
**The Flat-By-Default Rule.** Content surfaces, cards, and data tables remain flat at rest with 1px border lines (`border-slate-200`). Elevation shadows appear only as a functional response to user interaction or modal elevation.

## Shapes

The form language embodies friendly corporate authority:
- **Small Controls & Tags** (`rounded-md` / 6px): Table action buttons, search pills, and form dropdowns.
- **Standard Controls** (`rounded-lg` / 8px): Text inputs, primary action buttons, guide triggers, and notification alerts.
- **Cards & Modular Sections** (`rounded-xl` / 12px): Data tables, metric summary cards, and form sections.
- **Dialogs & Sheets** (`rounded-2xl` / 16px): Large modal containers and mobile drawer panels.
- **Pills & Indicators** (`rounded-full` / 9999px): Status dots, counter badges, and avatar circles.

## Components

### Buttons
- **Shape:** Rounded corners (`rounded-lg`, 8px).
- **Primary:** Background Institutional Blue (`#1d4ed8`), text white, padding `8px 16px` (or `10px 20px` on submission forms), font-medium. Hover transitions to Deep Navy (`#1e40af`).
- **Secondary:** Background white, text slate-700 (`#334155`), border slate-300 (`#cbd5e1`), padding `8px 16px`. Hover transitions to slate-50 (`#f8fafc`).
- **Guide Trigger:** Subtle Blue background (`#eff6ff`), border blue-200 (`#bfdbfe`), text blue-700 (`#1d4ed8`), padding `6px 12px` with persistent book icon.
- **Danger / Destructive:** Background Rose-600 (`#dc2626`), text white. Triggers must always prompt a confirmation dialog.

### Chips & Status Badges
- **Style:** Compact pill (`rounded-full` or `rounded-md`, padding `2px 8px`, text-xs font-semibold) with a colored 6px dot indicator on the left.
- **Variants:**
  - `PENDING_APPROVAL`: Amber-50 bg, Amber-800 text, Amber-300 border, Amber-500 dot.
  - `APPROVED`: Emerald-50 bg, Emerald-800 text, Emerald-300 border, Emerald-500 dot.
  - `CHECKED_IN`: Blue-50 bg, Blue-800 text, Blue-300 border, Blue-500 dot.
  - `OVERSTAY`: Red-50 bg, Red-800 text, Red-300 border, Red-500 dot.
  - `CHECKED_OUT`: Slate-100 bg, Slate-800 text, Slate-300 border, Slate-400 dot.
  - `REJECTED`: Rose-50 bg, Rose-800 text, Rose-300 border, Rose-500 dot.

### Cards / Containers
- **Corner Style:** Smooth corners (`rounded-xl`, 12px).
- **Background:** Crisp White (`#ffffff`) over Canvas Mist (`#f8fafc`).
- **Border:** 1px solid slate-200 (`#e2e8f0`).
- **Internal Padding:** `p-4` to `p-6` (16px to 24px).

### Inputs / Fields
- **Style:** Background white, border slate-300 (`#cbd5e1`), radius `rounded-lg` (8px), padding `8px 12px`, text-sm.
- **Focus:** 2px ring in Blue-500 (`#3b82f6`) with 0 offset.
- **Error:** Border Rose-500 (`#ef4444`) with accompanying Indonesian descriptive message below the field.

### Navigation
- **Sidebar Groups:** 3 canonical workflow groups (Operasional Utama, Pendaftaran Undangan, Master Keamanan).
- **Active State:** Blue-50 background, Blue-700 text, Blue-600 2px right border highlight.
- **Hover State:** Slate-100 background, Slate-900 text.

### Signature Component: PageGuideModal (Panduan Halaman Ini)
A standardized, persistent 5-section operational guide modal accessible from every page header via a dedicated blue button (`📘 Panduan Halaman Ini`):
1. **Tujuan Halaman**: Operational objective in layman's terms.
2. **Peran Pengguna**: Permitted user roles.
3. **Langkah Operasional (1-2-3)**: Step-by-step workflow instructions.
4. **Arti Warna Status**: Explanations for all badge states appearing on that page.
5. **Solusi Masalah Umum**: Practical troubleshooting advice for terminal disconnections and errors.
Keyboard accessible with focus trapping and Escape key listener.

## Do's and Don'ts

### Do:
- **Do** wrap every internal operational page in `AppShell` with the persistent `PageGuideModal` trigger.
- **Do** format all dates and timestamps using the active facility's specific timezone (WIB, WITA, WIT).
- **Do** use centralized Indonesian lay strings from `src/lib/vms/i18n/id.ts` and `GLOSSARY.md`.
- **Do** display status badges with their corresponding dot indicator and descriptive tooltip.
- **Do** require explicit two-step confirmation dialogs with audit reasons for destructive actions (e.g. force checkout, biometric deletion).
- **Do** ensure focus is trapped inside open modals and mobile drawers, and that Escape closes them.

### Don't:
- **Don't** expose technical HikCentral or backend jargon (e.g. "Artemis", "Privilege Groups", "HTTP 500", "ECONNREFUSED") in operator-facing text.
- **Don't** display internal staff navigation sidebars or headers on the public guest self-registration screen (`/invite/[token]`).
- **Don't** use status colors (emerald, amber, rose) for decorative borders or non-status typography.
- **Don't** use raw unstyled alert dialogs or native browser prompts (`window.prompt`); use accessible modal dialogs with focus traps.
- **Don't** rely on client local time; all visit windows must validate against the facility's canonical IANA timezone.

