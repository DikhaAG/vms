# 03: Purge Stubs from UI & Implement HikCentral-Authoritative Door Selection

**What to build:** Remove all simulation/stub dropdowns and mock controls across `/vms/*` and `/invite/*`. On `/vms/access-levels`, eliminate the manual door text input and dummy presets; add a "Sinkronkan Pintu dari Server HikCentral" sync button with live feedback, and render an interactive checklist of real doors fetched from the repository.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] In `src/app/vms/access-levels/access-levels-client.tsx`:
  - Remove manual door input field and "Preset Pilihan Cepat".
  - Add "Sinkronkan Pintu dari Server HikCentral" button with loading/success indicators.
  - Render an interactive checklist of doors loaded from `GET /api/vms/doors`.
- [ ] In `src/app/vms/pre-registration/pre-registration-form.tsx`:
  - Remove Section 7 (Mode Eksekusi & Simulasi Integrasi).
  - Remove `mode` and `stubScenario` state and payload fields.
- [ ] In `src/app/vms/reception/reception-client.tsx`:
  - Remove `Gateway: STUB/LIVE` toolbar switcher.
- [ ] In `src/app/vms/active-monitoring/active-monitoring-client.tsx`:
  - Remove `Mode Eksekusi Gateway` top banner.
- [ ] In `src/app/invite/[token]/invite-form.tsx`:
  - Remove simulation/mode selector fields.
- [ ] Update frontend test suites to reflect pure production UI contracts.

## Comments

