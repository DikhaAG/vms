"use client";

import React, { useState, useMemo, useContext, useCallback } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
} from "@/lib/vms/checkout-contract";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClientContext,
} from "@tanstack/react-query";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { toast } from "sonner";
import {
  UiDataTable,
  UiKpiCard,
  UiKpiGrid,
  UiFilterToolbar,
  useTableUrlState,
} from "@/components/vms/ui";
import { VmsProviders } from "@/components/vms/vms-providers";
import { EmergencyAccessModal } from "./emergency-access-modal";
import { ForceCheckoutModal } from "./force-checkout-modal";
import { createActiveVisitColumns } from "./columns";

export interface ActiveMonitoringClientProps {
  facilities: Facility[];
  initialVisits: ActiveVisitSummary[];
  doors?: FacilityDoor[];
}

export const FILTER_TAB_IDS = ["all", "normal", "overstay", "quota"] as const;
export type FilterTab = (typeof FILTER_TAB_IDS)[number];

export const FILTER_TABS: readonly { id: FilterTab; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "normal", label: "Normal" },
  { id: "overstay", label: "Overstay" },
  { id: "quota", label: "Kuota" },
] as const;

function ActiveMonitoringClientInner({
  facilities,
  initialVisits,
  doors = [],
}: ActiveMonitoringClientProps) {
  const queryClient = useQueryClient();

  // nuqs URL synchronization for facility and status tab
  const [selectedFacilityId, setSelectedFacilityId] = useQueryState(
    "facilityId",
    parseAsString.withDefault("all"),
  );
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(FILTER_TAB_IDS).withDefault("all"),
  );

  // nuqs URL state for data table search, pagination, and sorting
  const tableUrlState = useTableUrlState({
    searchKey: "q",
    pageKey: "page",
    pageSizeKey: "pageSize",
    sortKey: "sort",
    orderKey: "order",
    defaultPageSize: 10,
    defaultSort: [{ id: "fullName", desc: false }],
  });

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Force check-out modal state
  const [forceVisit, setForceVisit] = useState<ActiveVisitSummary | null>(null);
  const [isForceSubmitting, setIsForceSubmitting] = useState(false);

  // Emergency Access modal state
  const [emergencyVisit, setEmergencyVisit] = useState<ActiveVisitSummary | null>(null);

  // Notification banners (for backward compatibility & high accessibility)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // TanStack Query for Active Visits with automated 5-second background polling
  const {
    data: visits = initialVisits,
    isFetching: isVisitsFetching,
    refetch: refetchVisits,
  } = useQuery<ActiveVisitSummary[]>({
    queryKey: ["active-visits", selectedFacilityId],
    queryFn: async () => {
      const url =
        selectedFacilityId !== "all"
          ? `/api/vms/active-visits?facilityId=${encodeURIComponent(selectedFacilityId)}`
          : "/api/vms/active-visits";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal memuat daftar tamu aktif.");
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.activeVisits)) {
        throw new Error(data.error?.message || "Format data tamu aktif tidak valid.");
      }
      return data.activeVisits;
    },
    initialData: selectedFacilityId === "all" ? initialVisits : undefined,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  // TanStack Query for Doors with automated 5-second background polling
  const {
    data: doorsList = doors,
    isFetching: isDoorsFetching,
    refetch: refetchDoors,
  } = useQuery<FacilityDoor[]>({
    queryKey: ["doors", selectedFacilityId],
    queryFn: async () => {
      const doorsUrl =
        selectedFacilityId !== "all"
          ? `/api/vms/doors?facilityId=${encodeURIComponent(selectedFacilityId)}`
          : "/api/vms/doors";
      const doorsRes = await fetch(doorsUrl);
      if (!doorsRes.ok) throw new Error("Gagal memuat data pintu fasilitas.");
      const doorsData = await doorsRes.json();
      if (!doorsData.ok || !Array.isArray(doorsData.doors)) {
        throw new Error(doorsData.error?.message || "Format data pintu tidak valid.");
      }
      return doorsData.doors;
    },
    initialData: selectedFacilityId === "all" ? doors : undefined,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const isRefreshing = isVisitsFetching || isDoorsFetching;

  // Manual refresh trigger
  const handleManualRefresh = useCallback(async () => {
    try {
      await Promise.all([refetchVisits(), refetchDoors()]);
      toast.success("Daftar tamu dan status pintu berhasil diperbarui.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyegarkan data.";
      setNotification({ type: "error", message });
      toast.error(message);
    }
  }, [refetchVisits, refetchDoors]);

  // Checkout Mutation with automatic query cache invalidation
  const checkoutMutation = useMutation({
    mutationFn: async ({
      visit,
      isForced,
      reason,
      operatorUserId,
      operatorName,
    }: {
      visit: ActiveVisitSummary;
      isForced: boolean;
      reason: string;
      operatorUserId: string;
      operatorName: string;
    }) => {
      setActionLoadingId(visit.visitId);
      const res = await fetch(`/api/vms/active-visits/${visit.visitId}/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorUserId,
          operatorName,
          isForced,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error?.message ||
            data.errors?.reason ||
            (isForced
              ? "Gagal mengeksekusi check-out paksa."
              : "Gagal menyelesaikan kunjungan tamu."),
        );
      }
      return { data, visit, isForced, reason };
    },
    onSuccess: ({ data, visit, isForced, reason }) => {
      queryClient.invalidateQueries({ queryKey: ["active-visits"] });

      if (isForced) {
        const receipt =
          data.visit?.appointRecordId ||
          data.auditEvent?.appointRecordIdRevoked ||
          visit.appointRecordId ||
          visit.visitId.slice(0, 8).toUpperCase();
        const message = `Check-out paksa berhasil dilakukan untuk ${visit.visitor.fullName}. Alasan tercatat: "${reason}". Hak akses perangkat dicabut seketika. Bukti Mesin: #${receipt}.`;
        setNotification({ type: "warning", message });
        toast.warning(message);
      } else {
        const receipt = (visit.visitId || "").slice(0, 8).toUpperCase();
        const message = `Kunjungan ${visit.visitor.fullName} berhasil diselesaikan. Hak akses pada perangkat pintu fisik telah dicabut otomatis. Bukti Gateway: #${receipt}.`;
        setNotification({ type: "success", message });
        toast.success(message);
      }
    },
    onError: (err: Error) => {
      const message = err.message || "Gagal memproses check-out tamu.";
      setNotification({ type: "error", message });
      toast.error(message);
    },
    onSettled: () => {
      setActionLoadingId(null);
    },
  });

  // Revoke Emergency Access Mutation with automatic query cache invalidation
  const revokeEmergencyAccessMutation = useMutation({
    mutationFn: async ({
      visit,
      grant,
    }: {
      visit: ActiveVisitSummary;
      grant: EmergencyAccessGrant;
    }) => {
      setActionLoadingId(grant.id);
      const res = await fetch(
        `/api/vms/active-visits/${visit.visitId}/emergency-access/${grant.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operatorUserId: "sec-officer-01",
            operatorName: "Security Supervisor",
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error?.message || "Gagal mencabut izin akses darurat.");
      }
      return { visit, grant };
    },
    onSuccess: ({ visit, grant }) => {
      queryClient.invalidateQueries({ queryKey: ["active-visits"] });
      const message = `Izin akses darurat pintu ${grant.doorNames?.join(", ") || "terkait"} untuk ${visit.visitor.fullName} berhasil dicabut.`;
      setNotification({ type: "success", message });
      toast.success(message);
    },
    onError: (err: Error) => {
      const message = err.message || "Gagal mencabut izin akses darurat.";
      setNotification({ type: "error", message });
      toast.error(message);
    },
    onSettled: () => {
      setActionLoadingId(null);
    },
  });

  // Handle Normal Check-out
  const handleNormalCheckOut = useCallback(
    (visit: ActiveVisitSummary) => {
      if (
        typeof window !== "undefined" &&
        window.confirm &&
        !window.confirm(
          `Apakah Anda yakin ingin menyelesaikan kunjungan (check-out) untuk ${visit.visitor.fullName}? Hak akses pintu turnstile akan segera dicabut.`,
        )
      ) {
        return;
      }

      checkoutMutation.mutate({
        visit,
        isForced: false,
        reason: "Penyelesaian kunjungan normal",
        operatorUserId: "sec-operator-01",
        operatorName: "Security Frontdesk",
      });
    },
    [checkoutMutation],
  );

  // Open Force Check-out Modal
  const openForceCheckOutModal = useCallback((visit: ActiveVisitSummary) => {
    setForceVisit(visit);
  }, []);

  // Submit Force Check-out
  const handleConfirmForceCheckOut = (reason: string) => {
    if (!forceVisit) return;

    setIsForceSubmitting(true);
    checkoutMutation.mutate(
      {
        visit: forceVisit,
        isForced: true,
        reason,
        operatorUserId: "sec-officer-99",
        operatorName: "Security Supervisor",
      },
      {
        onSettled: () => {
          setIsForceSubmitting(false);
          setForceVisit(null);
        },
      },
    );
  };

  // Handle Revoke Emergency Access
  const handleRevokeEmergencyAccess = useCallback(
    (visit: ActiveVisitSummary, grant: EmergencyAccessGrant) => {
      const confirmed =
        typeof window !== "undefined" && window.confirm
          ? window.confirm(
              `Apakah Anda yakin ingin mencabut izin akses darurat pintu ${grant.doorNames?.join(", ") || "terkait"} untuk ${visit.visitor.fullName}? Tindakan ini langsung berlaku seketika.`,
            )
          : true;

      if (!confirmed) return;

      revokeEmergencyAccessMutation.mutate({ visit, grant });
    },
    [revokeEmergencyAccessMutation],
  );

  // Filtered visits based on facility and status tab
  const tabFilteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Facility filter
      if (selectedFacilityId !== "all" && v.facility.id !== selectedFacilityId) {
        return false;
      }

      // Status tab
      if (activeTab === "overstay") return v.isOverstay;
      if (activeTab === "quota") {
        return (
          v.isQuotaExceeded ||
          (v.tapQuotaMode === "limited" && v.maxTaps > 0 && v.tapCount >= v.maxTaps - 1)
        );
      }
      if (activeTab === "normal") return !v.isOverstay && !v.isQuotaExceeded;

      return true;
    });
  }, [visits, selectedFacilityId, activeTab]);

  // Statistics calculation
  const stats = useMemo(() => {
    const relevantVisits =
      selectedFacilityId !== "all"
        ? visits.filter((v) => v.facility.id === selectedFacilityId)
        : visits;

    const total = relevantVisits.length;
    const overstay = relevantVisits.filter((v) => v.isOverstay).length;
    const quota = relevantVisits.filter(
      (v) =>
        v.isQuotaExceeded ||
        (v.tapQuotaMode === "limited" && v.maxTaps > 0 && v.tapCount >= v.maxTaps - 1),
    ).length;
    const normal = Math.max(0, total - overstay);
    return { total, overstay, quota, normal };
  }, [visits, selectedFacilityId]);

  // Table Columns
  const columns = useMemo(
    () =>
      createActiveVisitColumns({
        doors: doorsList,
        actionLoadingId,
        onGrantEmergency: (v) => setEmergencyVisit(v),
        onNormalCheckOut: handleNormalCheckOut,
        onForceCheckOut: openForceCheckOutModal,
        onRevokeEmergencyAccess: handleRevokeEmergencyAccess,
      }),
    [
      doorsList,
      actionLoadingId,
      handleNormalCheckOut,
      openForceCheckOutModal,
      handleRevokeEmergencyAccess,
    ],
  );

  return (
    <div className="space-y-6">
      {/* Action / Refresh Bar */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="ks-btn inline-flex items-center gap-1.5 rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ks-ink)] shadow-xs hover:bg-[var(--ks-paper)] disabled:opacity-50 cursor-pointer transition-colors"
        >
          {isRefreshing ? "Menyegarkan..." : "↻ Segarkan Daftar Tamu Aktif"}
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-start justify-between rounded-lg p-4 text-xs ${
            notification.type === "success"
              ? "border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/10 text-[var(--ks-ink)]"
              : notification.type === "warning"
                ? "border border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)] font-medium"
                : "border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/10 text-[var(--ks-vermilion)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 text-[var(--ks-muted)] hover:text-[var(--ks-ink)] rounded-md cursor-pointer transition-colors"
            aria-label="Tutup notifikasi"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Canonical Summary KPI Cards */}
      <UiKpiGrid>
        <UiKpiCard
          label="Total Tamu di Gedung"
          value={stats.total}
          description="Tamu aktif di dalam"
          variant="default"
          isSelected={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        />

        <UiKpiCard
          label="Status Normal"
          value={stats.normal}
          description="Sesuai jadwal & kuota"
          variant="normal"
          indicator="patina"
          isSelected={activeTab === "normal"}
          onClick={() => setActiveTab("normal")}
        />

        <UiKpiCard
          label="Peringatan Overstay"
          value={stats.overstay}
          description="Melewati batas toleransi"
          variant="overstay"
          indicator={stats.overstay > 0 ? "vermilion" : null}
          isSelected={activeTab === "overstay"}
          onClick={() => setActiveTab("overstay")}
        />

        <UiKpiCard
          label="Peringatan Kuota Tap"
          value={stats.quota}
          description="Mendekati / capai batas"
          variant="quota"
          indicator={stats.quota > 0 ? "amber" : null}
          isSelected={activeTab === "quota"}
          onClick={() => setActiveTab("quota")}
        />
      </UiKpiGrid>

      {/* Facility & Tab Filter Toolbar */}
      <UiFilterToolbar
        facilitySlot={
          <div className="min-w-[200px]">
            <label htmlFor="facilityFilter" className="sr-only">
              Saring Berdasarkan Gedung
            </label>
            <select
              id="facilityFilter"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
            >
              <option value="all">Semua Gedung Fasilitas</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.timezone})
                </option>
              ))}
            </select>
          </div>
        }
        actionsSlot={
          <div className="flex items-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[var(--ks-ink)] text-[var(--ks-paper-raised)]"
                    : "text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Canonical Headless Data Table */}
      <UiDataTable
        columns={columns}
        data={tabFilteredVisits}
        searchPlaceholder="Cari nama tamu, tuan rumah, atau nomor kunjungan..."
        showSearch={true}
        enableSorting={true}
        enablePagination={true}
        pageSize={10}
        {...tableUrlState.tableProps}
        emptyState={
          <div className="rounded-xl border border-dashed border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] text-xl font-bold font-mono">
              0
            </div>
            <h3 className="mt-3 text-sm font-semibold text-[var(--ks-ink)]">
              {visits.length === 0
                ? "Tidak Ada Tamu Aktif di Dalam Gedung"
                : "Tidak Ada Tamu Aktif Sesuai Saringan"}
            </h3>
            <p className="mt-1 text-xs text-[var(--ks-muted)]">
              {visits.length === 0
                ? "Seluruh tamu telah selesai berkunjung atau belum melakukan check-in."
                : "Coba sesuaikan kata kunci pencarian, pemilihan fasilitas gedung, atau tab penyaring."}
            </p>
          </div>
        }
      />

      {/* Force Check-out Modal */}
      <ForceCheckoutModal
        key={`${forceVisit?.visitId ?? "none"}-${Boolean(forceVisit)}`}
        visit={forceVisit}
        isOpen={Boolean(forceVisit)}
        isSubmitting={isForceSubmitting}
        onClose={() => setForceVisit(null)}
        onConfirm={handleConfirmForceCheckOut}
      />

      {/* Emergency Access Escalation Modal */}
      {emergencyVisit && (
        <EmergencyAccessModal
          key={`${emergencyVisit.visitId}-${emergencyVisit.emergencyGrants?.length ?? 0}`}
          visit={emergencyVisit}
          doors={doorsList}
          onClose={() => setEmergencyVisit(null)}
          onSuccess={(grant, message) => {
            queryClient.invalidateQueries({ queryKey: ["active-visits"] });
            setNotification({
              type: "success",
              message,
            });
            toast.success(message);
            setEmergencyVisit(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * ActiveMonitoringClient with automatic VmsProviders boundary wrapping
 * when mounted outside of a QueryClientProvider (e.g. in standalone renderToStaticMarkup).
 */
export function ActiveMonitoringClient(props: ActiveMonitoringClientProps) {
  const contextClient = useContext(QueryClientContext);

  if (!contextClient) {
    return (
      <VmsProviders>
        <ActiveMonitoringClientInner {...props} />
      </VmsProviders>
    );
  }

  return <ActiveMonitoringClientInner {...props} />;
}
