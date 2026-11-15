import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { idDict } from "@/lib/vms/i18n/id";
import { renderWithVmsProviders } from "@/test/test-utils";

// Form and Table UI primitives
import {
  UiFormField,
  UiTextInput,
  UiSelect,
  UiTextarea,
  UiDataTable,
  UiLoadingFallback,
  type UiTableColumnDef,
} from "@/components/vms/ui";

// Pages
import PreRegistrationPage from "@/app/vms/pre-registration/page";
import VisitorsPage from "@/app/vms/visitors/page";
import ActiveMonitoringPage from "@/app/vms/active-monitoring/page";
import ReceptionPage from "@/app/vms/reception/page";
import ApprovalsPage from "@/app/vms/approvals/page";
import AccessLevelsPage from "@/app/vms/access-levels/page";
import GroupRegistrationPage from "@/app/vms/group-registration/page";

// Providers & tRPC
import { appRouter } from "@/server/trpc/routers/_app";
import { createContext } from "@/server/trpc/context";
import { InMemoryVmsRepository } from "@/lib/vms/repository";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/vms/active-monitoring",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface SampleRow {
  id: string;
  name: string;
  status: string;
}

const sampleColumns: UiTableColumnDef<SampleRow>[] = [
  { accessorKey: "id", header: "ID", enableSorting: false },
  { accessorKey: "name", header: "Nama Lengkap", enableSorting: true },
  { accessorKey: "status", header: "Status", enableSorting: true },
];

const sampleData: SampleRow[] = [
  { id: "1", name: "Budi Santoso", status: "CHECKED_IN" },
  { id: "2", name: "Siti Rahma", status: "PENDING_APPROVAL" },
];

describe("Modern DX Quality Gates & Verification (Ticket 09)", () => {
  describe("Gate 1: Route Integrity Across Modern DX Stack", () => {
    it("renders all 7 operator routes without SSR exceptions", async () => {
      const preReg = await PreRegistrationPage();
      expect(renderToStaticMarkup(preReg)).toBeTruthy();

      const visitors = await VisitorsPage();
      expect(renderToStaticMarkup(visitors)).toBeTruthy();

      const activeMon = await ActiveMonitoringPage();
      expect(renderToStaticMarkup(activeMon)).toBeTruthy();

      const reception = await ReceptionPage();
      expect(renderToStaticMarkup(reception)).toBeTruthy();

      const approvals = await ApprovalsPage();
      expect(renderToStaticMarkup(approvals)).toBeTruthy();

      const accessLevels = await AccessLevelsPage();
      expect(renderToStaticMarkup(accessLevels)).toBeTruthy();

      const groupReg = await GroupRegistrationPage();
      expect(renderToStaticMarkup(groupReg)).toBeTruthy();
    });

    it("renders shared UiLoadingFallback cleanly with localized message", () => {
      const html = renderToStaticMarkup(
        <UiLoadingFallback message={idDict.common.loading} />
      );
      expect(html).toContain(escapeHtml(idDict.common.loading));
      expect(html).toContain("rounded-xl");
      expect(html).toContain("bg-[var(--ks-surface-card)]");
    });
  });

  describe("Gate 2: Accessibility (A11y) Verification for Form Field Primitives", () => {
    it("associates label htmlFor to input id and wires aria-describedby for errors", () => {
      const html = renderToStaticMarkup(
        <UiFormField
          id="test-visitor-name"
          label="Nama Lengkap Tamu"
          error="Nama wajib diisi"
          description="Sesuai kartu identitas resmi"
          required
        >
          <UiTextInput placeholder="Masukkan nama" />
        </UiFormField>
      );

      // Label and input association
      expect(html).toContain('for="test-visitor-name"');
      expect(html).toContain('id="test-visitor-name"');

      // Accessibility attributes
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-describedby="test-visitor-name-desc test-visitor-name-error"');

      // Error message role & container
      expect(html).toContain('id="test-visitor-name-error"');
      expect(html).toContain('role="alert"');
      expect(html).toContain("Nama wajib diisi");

      // Required indicator
      expect(html).toContain("*");
    });

    it("wires UiSelect and UiTextarea with form field context", () => {
      const selectHtml = renderToStaticMarkup(
        <UiFormField id="facility-select" label="Pilih Gedung">
          <UiSelect>
            <option value="fac-1">Kantor Pusat</option>
          </UiSelect>
        </UiFormField>
      );
      expect(selectHtml).toContain('for="facility-select"');
      expect(selectHtml).toContain('id="facility-select"');

      const textareaHtml = renderToStaticMarkup(
        <UiFormField id="notes-textarea" label="Catatan Kunjungan">
          <UiTextarea rows={3} />
        </UiFormField>
      );
      expect(textareaHtml).toContain('for="notes-textarea"');
      expect(textareaHtml).toContain('id="notes-textarea"');
    });
  });

  describe("Gate 3: Accessibility (A11y) Verification for Headless Data Table", () => {
    it("provides accessible sorting buttons and aria-sort on sortable headers", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={sampleColumns}
          data={sampleData}
          sorting={[{ id: "name", desc: false }]}
          enableSorting
        />
      );

      // Sortable header has accessible attributes
      expect(html).toContain('aria-sort="ascending"');
      expect(html).toContain(`title="${escapeHtml(idDict.table.sortDescending)}"`);
      expect(html).toContain("scope=\"col\"");
      expect(html).toContain("Nama Lengkap");

      // Non-sortable header does not have sort indicator
      expect(html).toContain("ID");
      expect(html).not.toContain('aria-sort="none"');
    });

    it("provides accessible pagination controls, disabled states, and ARIA roles", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={sampleColumns}
          data={sampleData}
          pageSize={1}
          pagination={{ pageIndex: 0, pageSize: 1 }}
        />
      );

      // Previous button is disabled on page 1
      expect(html).toContain(`aria-label="${escapeHtml(idDict.table.previous)}"`);
      expect(html).toContain(`disabled=""`);

      // Next button is accessible
      expect(html).toContain(`aria-label="${escapeHtml(idDict.table.next)}"`);

      // Tabular numbers and counters
      expect(html).toContain(escapeHtml(idDict.table.page));
      expect(html).toContain(escapeHtml(idDict.table.of));
      expect(html).toContain(escapeHtml(idDict.table.totalRows));
    });
  });

  describe("Gate 4: Indonesian UI Dictionary Consistency (id.ts)", () => {
    it("ensures dictionary keys for modern DX table and form feedback are populated", () => {
      expect(idDict.table.searchPlaceholder).toBeTruthy();
      expect(idDict.table.noDataFound).toBeTruthy();
      expect(idDict.table.rowsPerPage).toBeTruthy();
      expect(idDict.table.previous).toBeTruthy();
      expect(idDict.table.next).toBeTruthy();

      expect(idDict.common.loading).toBeTruthy();
      expect(idDict.common.submitting).toBeTruthy();
      expect(idDict.common.success).toBeTruthy();
      expect(idDict.common.failed).toBeTruthy();
    });

    it("verifies no unlocalized English placeholders or button texts exist in modern DX components", () => {
      const rootDir = process.cwd();
      const targetDirs = [
        path.join(rootDir, "src/components/vms/ui"),
        path.join(rootDir, "src/app/vms/pre-registration"),
        path.join(rootDir, "src/app/vms/visitors"),
        path.join(rootDir, "src/app/vms/active-monitoring"),
      ];

      const bannedEnglishStrings = [
        "Search...",
        "Search records",
        "Loading...",
        "Loading records",
        "Next Page",
        "Previous Page",
        "Submit Form",
      ];

      const violations: { file: string; token: string }[] = [];

      for (const dir of targetDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs
          .readdirSync(dir)
          .filter((f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test."));

        for (const file of files) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          for (const token of bannedEnglishStrings) {
            if (content.includes(`"${token}"`) || content.includes(`'${token}'`)) {
              violations.push({
                file: path.relative(rootDir, filePath),
                token,
              });
            }
          }
        }
      }

      expect(
        violations,
        `Found hardcoded unlocalized strings in modern DX components: ${JSON.stringify(violations, null, 2)}`
      ).toEqual([]);
    });
  });

  describe("Gate 5: Centralized Provider & tRPC Integration", () => {
    it("renders components via renderWithVmsProviders test harness with Sonner toaster", () => {
      const { html } = renderWithVmsProviders(
        <div data-testid="test-child">Konten Terproteksi</div>
      );

      expect(html).toContain("Konten Terproteksi");
      expect(html).toContain("Notifications");
    });

    it("verifies tRPC caller execution against in-memory repository", async () => {
      const repository = new InMemoryVmsRepository();
      const ctx = await createContext({ repository, facilityTimezone: "Asia/Jakarta" });
      const caller = appRouter.createCaller(ctx);

      const visits = await caller.monitoring.listActive();
      expect(Array.isArray(visits.activeVisits)).toBe(true);

      const accessLevels = await caller.accessLevel.list({ facilityId: "fac-jakarta" });
      expect(Array.isArray(accessLevels)).toBe(true);
    });
  });
});
