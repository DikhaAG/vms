"use client";

import React, { useState, useMemo } from "react";
import {
  useTable,
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  globalFilteringFeature,
  columnFilteringFeature,
  createSortedRowModel,
  createPaginatedRowModel,
  createFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type OnChangeFn,
  type Updater,
  type RowData,
} from "@tanstack/react-table";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { UiCard } from "./ui-card";
import { UiButton } from "./ui-button";
import { UiBadge } from "./ui-badge";
import { UiFilterToolbar } from "./ui-filter-toolbar";
import { idDict } from "@/lib/vms/i18n/id";

function resolveUpdater<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function"
    ? (updater as (old: T) => T)(current)
    : updater;
}

export const defaultTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  globalFilteringFeature,
  columnFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filteredRowModel: createFilteredRowModel(),
});

export type UiTableFeatures = typeof defaultTableFeatures;

export type UiTableColumnDef<
  TData extends RowData,
  TValue = unknown
> = ColumnDef<UiTableFeatures, TData, TValue>;

export interface UiDataTableProps<TData extends RowData, TValue = unknown> {
  columns: ColumnDef<UiTableFeatures, TData, TValue>[];
  data: TData[];

  // Sorting
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  defaultSorting?: SortingState;
  enableSorting?: boolean;

  // Pagination
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  defaultPagination?: PaginationState;
  enablePagination?: boolean;
  pageSize?: number;

  // Global search filtering
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  defaultGlobalFilter?: string;
  enableGlobalFilter?: boolean;
  searchPlaceholder?: string;
  showSearch?: boolean;

  // Filter toolbar & action slots
  filterToolbar?: React.ReactNode;
  facilitySlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;

  // Empty state customization
  emptyState?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;

  // Styling & event handlers
  className?: string;
  tableClassName?: string;
  rowClassName?: string | ((row: TData, index: number) => string);
  onRowClick?: (row: TData) => void;
}

export function UiDataTable<TData extends RowData, TValue = unknown>({
  columns,
  data,
  sorting,
  onSortingChange,
  defaultSorting,
  enableSorting = true,
  pagination,
  onPaginationChange,
  defaultPagination,
  enablePagination = true,
  pageSize = 10,
  globalFilter,
  onGlobalFilterChange,
  defaultGlobalFilter = "",
  searchPlaceholder,
  showSearch = false,
  filterToolbar,
  facilitySlot,
  actionsSlot,
  emptyState,
  emptyTitle,
  emptyDescription,
  className = "",
  tableClassName = "",
  rowClassName = "",
  onRowClick,
}: UiDataTableProps<TData, TValue>) {
  // Uncontrolled state fallbacks
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    defaultSorting ?? []
  );
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    defaultPagination ?? {
      pageIndex: 0,
      pageSize: enablePagination ? pageSize : Math.max(data.length, 1000),
    }
  );
  const [internalGlobalFilter, setInternalGlobalFilter] = useState<string>(
    defaultGlobalFilter
  );

  // Controlled vs Uncontrolled resolution
  const isControlledSorting = sorting !== undefined;
  const activeSorting = isControlledSorting ? sorting : internalSorting;
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    if (onSortingChange) {
      onSortingChange(updater);
    }
    if (!isControlledSorting) {
      setInternalSorting((prev) => resolveUpdater(updater, prev));
    }
  };

  const isControlledPagination = pagination !== undefined;
  const activePagination = useMemo(() => {
    if (!enablePagination) {
      return { pageIndex: 0, pageSize: Math.max(data.length, 1000) };
    }
    return isControlledPagination ? pagination : internalPagination;
  }, [enablePagination, isControlledPagination, pagination, internalPagination, data.length]);

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (onPaginationChange) {
      onPaginationChange(updater);
    }
    if (!isControlledPagination) {
      setInternalPagination((prev) => resolveUpdater(updater, prev));
    }
  };

  const isControlledGlobalFilter = globalFilter !== undefined;
  const activeGlobalFilter = isControlledGlobalFilter
    ? globalFilter
    : internalGlobalFilter;
  const handleGlobalFilterChange: OnChangeFn<string> = (updater) => {
    if (onGlobalFilterChange) {
      onGlobalFilterChange(updater);
    }
    if (!isControlledGlobalFilter) {
      setInternalGlobalFilter((prev) => resolveUpdater(updater, prev));
    }
  };

  const table = useTable<UiTableFeatures, TData>({
    features: defaultTableFeatures,
    columns: columns as unknown as readonly ColumnDef<
      UiTableFeatures,
      TData,
      unknown
    >[],
    data,
    state: {
      sorting: activeSorting,
      pagination: activePagination,
      globalFilter: activeGlobalFilter,
    },
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    onGlobalFilterChange: handleGlobalFilterChange,
  });

  const pageCount = table.getPageCount();
  const showBuiltinToolbar = showSearch || Boolean(facilitySlot || actionsSlot);

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {filterToolbar ? (
        filterToolbar
      ) : showBuiltinToolbar ? (
        <UiFilterToolbar
          facilitySlot={facilitySlot}
          searchSlot={
            showSearch ? (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <input
                  type="search"
                  value={activeGlobalFilter}
                  onChange={(e) => handleGlobalFilterChange(e.target.value)}
                  placeholder={
                    searchPlaceholder ?? idDict.table.searchPlaceholder
                  }
                  className="w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3 py-1.5 text-xs sm:text-sm text-[var(--ks-text)] placeholder-[var(--ks-muted)] shadow-xs focus:outline-hidden focus:border-[var(--ks-ink)] focus:ring-1 focus:ring-[var(--ks-ink)]"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
            ) : null
          }
          actionsSlot={actionsSlot}
        />
      ) : null}

      <UiCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className={`w-full border-collapse text-left ${tableClassName}`.trim()}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)]/50"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort() && enableSorting;
                    const isSorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        scope="col"
                        aria-sort={
                          isSorted === "asc"
                            ? "ascending"
                            : isSorted === "desc"
                            ? "descending"
                            : undefined
                        }
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ks-muted)]"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1.5 font-semibold text-[var(--ks-muted)] hover:text-[var(--ks-ink)] focus:outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--ks-ink)] rounded py-0.5 px-1 -mx-1 transition-colors select-none"
                            title={
                              isSorted === "asc"
                                ? idDict.table.sortDescending
                                : isSorted === "desc"
                                ? idDict.table.sortClear
                                : idDict.table.sortAscending
                            }
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                            <span
                              className="inline-flex flex-col text-[10px] leading-none shrink-0"
                              aria-hidden="true"
                            >
                              {isSorted === "asc" ? (
                                <span className="text-[var(--ks-ink)] font-bold">
                                  ▲
                                </span>
                              ) : isSorted === "desc" ? (
                                <span className="text-[var(--ks-ink)] font-bold">
                                  ▼
                                </span>
                              ) : (
                                <span className="text-[var(--ks-muted)]/40 hover:text-[var(--ks-muted)]">
                                  ⇅
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-[var(--ks-muted)]"
                  >
                    {emptyState ? (
                      emptyState
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <p className="text-sm font-semibold text-[var(--ks-ink)]">
                          {emptyTitle ?? idDict.layTerms.noDataFound}
                        </p>
                        <p className="text-xs text-[var(--ks-muted)]">
                          {emptyDescription ??
                            (activeGlobalFilter
                              ? idDict.layTerms.noMatchingRecords
                              : idDict.layTerms.tableEmpty)}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => {
                  const rowClass =
                    typeof rowClassName === "function"
                      ? rowClassName(row.original, index)
                      : rowClassName;

                  return (
                    <tr
                      key={row.id}
                      onClick={
                        onRowClick ? () => onRowClick(row.original) : undefined
                      }
                      className={`border-b border-[var(--ks-rule-subtle)] hover:bg-[var(--ks-paper)]/40 transition-colors ${
                        onRowClick ? "cursor-pointer" : ""
                      } ${rowClass}`.trim()}
                    >
                      {row.getAllCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3 text-xs sm:text-sm text-[var(--ks-text)] align-middle"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {enablePagination && (
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-xs text-[var(--ks-muted)]">
            <div className="flex items-center gap-2">
              <span>
                {idDict.table.page}{" "}
                <strong className="font-semibold text-[var(--ks-ink)]">
                  {pageCount === 0 ? 0 : activePagination.pageIndex + 1}
                </strong>{" "}
                {idDict.table.of}{" "}
                <strong className="font-semibold text-[var(--ks-ink)]">
                  {pageCount}
                </strong>
              </span>
              <span className="text-[var(--ks-rule-subtle)]">|</span>
              <span>
                {idDict.table.totalRows}:{" "}
                <UiBadge variant="neutral" className="tabular-nums">
                  {table.getFilteredRowModel().rows.length}
                </UiBadge>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <UiButton
                variant="secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label={idDict.table.previous}
              >
                ← {idDict.table.previous}
              </UiButton>
              <UiButton
                variant="secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label={idDict.table.next}
              >
                {idDict.table.next} →
              </UiButton>
            </div>
          </div>
        )}
      </UiCard>
    </div>
  );
}

export interface UseTableUrlStateOptions {
  searchKey?: string;
  pageKey?: string;
  pageSizeKey?: string;
  sortKey?: string;
  orderKey?: string;
  defaultPageSize?: number;
  defaultSort?: SortingState;
  defaultSearch?: string;
}

export interface UseTableUrlStateReturn {
  globalFilter: string;
  setGlobalFilter: (query: string) => void;
  pagination: PaginationState;
  setPagination: (
    updater: PaginationState | ((prev: PaginationState) => PaginationState)
  ) => void;
  sorting: SortingState;
  setSorting: (
    updater: SortingState | ((prev: SortingState) => SortingState)
  ) => void;
  tableProps: {
    globalFilter: string;
    onGlobalFilterChange: OnChangeFn<string>;
    pagination: PaginationState;
    onPaginationChange: OnChangeFn<PaginationState>;
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
  };
}

export function useTableUrlState(
  options: UseTableUrlStateOptions = {}
): UseTableUrlStateReturn {
  const {
    searchKey = "q",
    pageKey = "page",
    pageSizeKey = "pageSize",
    sortKey = "sort",
    orderKey = "order",
    defaultPageSize = 10,
    defaultSort = [],
    defaultSearch = "",
  } = options;

  const [q, setQ] = useQueryState(
    searchKey,
    parseAsString.withDefault(defaultSearch)
  );
  const [page, setPage] = useQueryState(
    pageKey,
    parseAsInteger.withDefault(1)
  );
  const [pageSize, setPageSize] = useQueryState(
    pageSizeKey,
    parseAsInteger.withDefault(defaultPageSize)
  );
  const [sortCol, setSortCol] = useQueryState(
    sortKey,
    parseAsString.withDefault(defaultSort[0]?.id ?? "")
  );
  const [sortOrder, setSortOrder] = useQueryState(
    orderKey,
    parseAsString.withDefault(defaultSort[0]?.desc ? "desc" : "asc")
  );

  const globalFilter = q;
  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: Math.max(0, page - 1),
      pageSize: Math.max(1, pageSize),
    }),
    [page, pageSize]
  );
  const sorting: SortingState = useMemo(
    () =>
      sortCol ? [{ id: sortCol, desc: sortOrder === "desc" }] : [],
    [sortCol, sortOrder]
  );

  const handleGlobalFilterChange: OnChangeFn<string> = (updater) => {
    const next = resolveUpdater(updater, globalFilter);
    setQ(next ? next : null);
    setPage(1);
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = resolveUpdater(updater, pagination);
    setPage(next.pageIndex + 1);
    if (next.pageSize !== defaultPageSize) {
      setPageSize(next.pageSize);
    }
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = resolveUpdater(updater, sorting);
    if (next && next.length > 0) {
      setSortCol(next[0].id);
      setSortOrder(next[0].desc ? "desc" : "asc");
    } else {
      setSortCol(null);
      setSortOrder(null);
    }
  };

  return {
    globalFilter,
    setGlobalFilter: (val) => handleGlobalFilterChange(val),
    pagination,
    setPagination: (val) => handlePaginationChange(val),
    sorting,
    setSorting: (val) => handleSortingChange(val),
    tableProps: {
      globalFilter,
      onGlobalFilterChange: handleGlobalFilterChange,
      pagination,
      onPaginationChange: handlePaginationChange,
      sorting,
      onSortingChange: handleSortingChange,
    },
  };
}
