# UI Indonesian Shell Task Map

Task graph for Indonesian Localization, Impeccable App Shell, and Guided Onboarding Modals.

## Notes & Decisions
- Built on top of VMS foundational architecture: ADR 0001 (Hybrid State), ADR 0002 (Facility Timezone & UTC Storage), and ADR 0005 (Indonesian Localization, Impeccable App Shell, and Guided Modals).
- Centralized i18n dictionary at `src/lib/vms/i18n/id.ts` maintains consistency across all labels, statuses, and guide content.
- App Shell wraps `/vms/*` internal staff routes with responsive/collapsible sidebar and live header; public guest portal (`/invite/[token]`) remains isolated without operator chrome.
- Design quality adheres to Impeccable (Operate Mode): high scannability, clear typography hierarchy, and distinct status chip contrast.

## Tickets

| Number | Slug | Status | Blocked By | Frontier |
|---|---|---|---|---|
| 01 | [01-indonesian-dictionary-and-page-guide-modal.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/ui-indonesian-shell/issues/01-indonesian-dictionary-and-page-guide-modal.md) | ready-for-agent | None | **READY** |
| 02 | [02-app-shell-sidebar-and-header.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/ui-indonesian-shell/issues/02-app-shell-sidebar-and-header.md) | ready-for-agent | 01 | Waiting on 01 |
| 03 | [03-core-operations-localization-and-guides.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/ui-indonesian-shell/issues/03-core-operations-localization-and-guides.md) | ready-for-agent | 02 | Waiting on 02 |
| 04 | [04-invitation-security-and-self-registration-localization.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/ui-indonesian-shell/issues/04-invitation-security-and-self-registration-localization.md) | ready-for-agent | 02 | Waiting on 02 |
| 05 | [05-e2e-ui-accessibility-and-visual-audit.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/ui-indonesian-shell/issues/05-e2e-ui-accessibility-and-visual-audit.md) | ready-for-agent | 03, 04 | Waiting on 03, 04 |

## Frontier
- `01-indonesian-dictionary-and-page-guide-modal.md` is currently unblocked and ready for immediate implementation.

