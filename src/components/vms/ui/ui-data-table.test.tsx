import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import {
  UiDataTable,
  useTableUrlState,
  type UiTableColumnDef,
} from "./ui-data-table";
import { idDict } from "@/lib/vms/i18n/id";
import { UiFilterToolbar } from "./ui-filter-toolbar";

interface TestVisitor {
  id: string;
  name: string;
  company: string;
  status: string;
}

const testData: TestVisitor[] = [
  { id: "vis-1", name: "Budi Santoso", company: "PT Mega Perkasa", status: "CHECKED_IN" },
  { id: "vis-2", name: "Dewi Lestari", company: "CV Cahaya Abadi", status: "PENDING_APPROVAL" },
  { id: "vis-3", name: "Agus Pratama", company: "PT Solusi Digital", status: "APPROVED" },
];

const testColumns: UiTableColumnDef<TestVisitor>[] = [
  {
    accessorKey: "id",
    header: "ID Tamu",
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: "Nama Tamu",
    enableSorting: true,
  },
  {
    accessorKey: "company",
    header: "Instansi",
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
  },
];

describe("UiDataTable Component (Ticket 05)", () => {
  describe("Seam 1: Canonical Kinpaku Table Rendering", () => {
    it("renders table with columns, data rows, and Kinpaku visual hierarchy", () => {
      const html = renderToStaticMarkup(
        <UiDataTable columns={testColumns} data={testData} />
      );

      // Verify headers
      expect(html).toContain("ID Tamu");
      expect(html).toContain("Nama Tamu");
      expect(html).toContain("Instansi");
      expect(html).toContain("Status");

      // Verify data rows
      expect(html).toContain("Budi Santoso");
      expect(html).toContain("Dewi Lestari");
      expect(html).toContain("Agus Pratama");
      expect(html).toContain("PT Mega Perkasa");

      // Verify Kinpaku styling tokens
      expect(html).toContain("rounded-[var(--ks-radius-md)]");
      expect(html).toContain("border-[var(--ks-rule-subtle)]");
      expect(html).toContain("bg-[var(--ks-paper-raised)]");
      expect(html).toContain("text-[var(--ks-text)]");
    });
  });

  describe("Seam 2: Column Sorting & Tactile Header Affordance", () => {
    it("renders interactive tactile buttons for sortable columns and plain headers for non-sortable", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          sorting={[{ id: "name", desc: false }]}
          enableSorting
        />
      );

      // Non-sortable ID header is not wrapped in sorting button
      expect(html).toContain("ID Tamu");

      // Sortable Name column has ascending indicator and aria-sort="ascending"
      expect(html).toContain('aria-sort="ascending"');
      expect(html).toContain("▲");
      expect(html).toContain(idDict.table.sortDescending);

      // Sortable Company column is currently unsorted
      expect(html).toContain("Instansi");
      expect(html).toContain("⇅");
    });

    it("renders descending sort indicator when column is sorted descending", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          sorting={[{ id: "name", desc: true }]}
          enableSorting
        />
      );

      expect(html).toContain('aria-sort="descending"');
      expect(html).toContain("▼");
      expect(html).toContain(idDict.table.sortClear);
    });

    it("sorts rows correctly when initial sorting state is provided", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          defaultSorting={[{ id: "name", desc: false }]}
          enableSorting
        />
      );

      // Agus Pratama should appear before Budi Santoso, and Budi before Dewi
      const agusIndex = html.indexOf("Agus Pratama");
      const budiIndex = html.indexOf("Budi Santoso");
      const dewiIndex = html.indexOf("Dewi Lestari");

      expect(agusIndex).toBeGreaterThan(-1);
      expect(budiIndex).toBeGreaterThan(agusIndex);
      expect(dewiIndex).toBeGreaterThan(budiIndex);
    });
  });

  describe("Seam 3: Pagination Controls & Tabular Badges", () => {
    it("renders pagination controls and localized page counters", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          enablePagination
          pageSize={2}
        />
      );

      // With 3 items and pageSize 2, page 1 displays 2 items and page count is 2
      expect(html).toContain("Budi Santoso");
      expect(html).toContain("Dewi Lestari");
      expect(html).not.toContain("Agus Pratama");

      // Localized pagination counters
      expect(html).toContain(idDict.table.page);
      expect(html).toContain(idDict.table.of);
      expect(html).toContain("1");
      expect(html).toContain("2");
      expect(html).toContain(idDict.table.totalRows);
      expect(html).toContain("3");

      // UiButton controls
      expect(html).toContain(idDict.table.previous);
      expect(html).toContain(idDict.table.next);
      // Previous button should be disabled on page 1
      expect(html).toContain("disabled=\"\"");
    });

    it("renders page 2 correctly when pagination state is set to pageIndex 1", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          enablePagination
          pagination={{ pageIndex: 1, pageSize: 2 }}
        />
      );

      expect(html).not.toContain("Budi Santoso");
      expect(html).not.toContain("Dewi Lestari");
      expect(html).toContain("Agus Pratama");
    });
  });

  describe("Seam 4: Global Filtering & UiFilterToolbar Compatibility", () => {
    it("filters rows by global search term", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          globalFilter="Dewi"
        />
      );

      expect(html).toContain("Dewi Lestari");
      expect(html).not.toContain("Budi Santoso");
      expect(html).not.toContain("Agus Pratama");
    });

    it("renders built-in search input when showSearch is true", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          showSearch
          searchPlaceholder="Cari tamu..."
        />
      );

      expect(html).toContain('placeholder="Cari tamu..."');
      expect(html).toContain('type="search"');
    });

    it("supports custom filterToolbar slot compatible with UiFilterToolbar", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          filterToolbar={
            <UiFilterToolbar
              searchSlot={<input data-testid="custom-search" />}
              actionsSlot={<button type="button">Unduh CSV</button>}
            />
          }
        />
      );

      expect(html).toContain('data-testid="custom-search"');
      expect(html).toContain("Unduh CSV");
    });
  });

  describe("Seam 5: Empty State Localization", () => {
    it("renders localized empty state from idDict.layTerms.noDataFound when data is empty", () => {
      const html = renderToStaticMarkup(
        <UiDataTable columns={testColumns} data={[]} />
      );

      expect(html).toContain(idDict.layTerms.noDataFound);
      expect(html).toContain(idDict.layTerms.tableEmpty);
    });

    it("renders matching records message when global filter produces no results", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={testData}
          globalFilter="NonExistentName123"
        />
      );

      expect(html).toContain(idDict.layTerms.noDataFound);
      expect(html).toContain(idDict.layTerms.noMatchingRecords);
    });

    it("renders custom emptyState node when provided", () => {
      const html = renderToStaticMarkup(
        <UiDataTable
          columns={testColumns}
          data={[]}
          emptyState={<div data-testid="custom-empty">Kustom Kosong</div>}
        />
      );

      expect(html).toContain('data-testid="custom-empty"');
      expect(html).toContain("Kustom Kosong");
    });
  });

  describe("Seam 6: useTableUrlState Hook Integration", () => {
    function TableWithUrlState() {
      const urlState = useTableUrlState({
        defaultPageSize: 2,
      });

      return (
        <UiDataTable
          columns={testColumns}
          data={testData}
          enablePagination
          enableSorting
          {...urlState.tableProps}
        />
      );
    }

    it("reads initial search query and pagination from URL search params via NuqsTestingAdapter", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter searchParams={{ q: "Agus", page: "1" }}>
          <TableWithUrlState />
        </NuqsTestingAdapter>
      );

      // Only Agus Pratama matches "Agus"
      expect(html).toContain("Agus Pratama");
      expect(html).not.toContain("Budi Santoso");
      expect(html).not.toContain("Dewi Lestari");
    });

    it("reads sorting parameters from URL search params", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter searchParams={{ sort: "name", order: "desc" }}>
          <TableWithUrlState />
        </NuqsTestingAdapter>
      );

      // Descending by name: Dewi Lestari first, then Budi Santoso
      expect(html).toContain('aria-sort="descending"');
      const dewiIndex = html.indexOf("Dewi Lestari");
      const budiIndex = html.indexOf("Budi Santoso");
      expect(dewiIndex).toBeGreaterThan(-1);
      expect(budiIndex).toBeGreaterThan(dewiIndex);
    });
  });
});
