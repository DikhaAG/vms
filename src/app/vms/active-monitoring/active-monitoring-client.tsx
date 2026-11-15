"use client";

import { useState, useMemo, useRef } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
  DoorAccessType,
  VisitLastSeenDoor,
} from "@/lib/vms/checkout-contract";
import { isEmergencyGrantActive } from "@/lib/vms/checkout-contract";
import { useModalFocusTrap } from "@/components/vms/use-modal-focus-trap";
import { EmergencyAccessModal } from "./emergency-access-modal";

export interface ActiveMonitoringClientProps {
  facilities: Facility[];
  initialVisits: ActiveVisitSummary[];
  doors?: FacilityDoor[];
}

type FilterTab = "all" | "normal" | "overstay" | "quota";

export function ActiveMonitoringClient({
  facilities,
  initialVisits,
  doors = [],
}: ActiveMonitoringClientProps) {
  const [visits, setVisits] = useState<ActiveVisitSummary[]>(initialVisits);
  const [doorsList, setDoorsList] = useState<FacilityDoor[]>(doors);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Force check-out modal state
  const [forceVisit, setForceVisit] = useState<ActiveVisitSummary | null>(null);
  const [forceReason, setForceReason] = useState("");
  const [isForceSubmitting, setIsForceSubmitting] = useState(false);

  // Emergency Access modal state
  const [emergencyVisit, setEmergencyVisit] = useState<ActiveVisitSummary | null>(null);

  // Notification banners
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const forceModalRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap({
    ref: forceModalRef,
    isOpen: Boolean(forceVisit),
    onClose: () => {
      setForceVisit(null);
      setForceReason("");
    },
  });

  // Helper to resolve door access directionality
  const resolveDoorAccessType = (
    lastSeenDoor: VisitLastSeenDoor | undefined,
    availableDoors: FacilityDoor[],
  ): DoorAccessType | undefined => {
    if (lastSeenDoor?.accessType) {
      return lastSeenDoor.accessType;
    }
    if (lastSeenDoor?.doorIndexCode) {
      const match = availableDoors.find((d) => d.doorIndexCode === lastSeenDoor.doorIndexCode);
      return match?.accessType;
    }
    return undefined;
  };

  const refreshVisits = async () => {
    setIsRefreshing(true);
    try {
      const url =
        selectedFacilityId !== "all"
          ? `/api/vms/active-visits?facilityId=${encodeURIComponent(selectedFacilityId)}`
          : "/api/vms/active-visits";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load active visits");
      const data = await res.json();
      if (data.ok && Array.isArray(data.activeVisits)) {
        setVisits(data.activeVisits);
      }

      // Refresh doors
      const doorsUrl =
        selectedFacilityId !== "all"
          ? `/api/vms/doors?facilityId=${encodeURIComponent(selectedFacilityId)}`
          : "/api/vms/doors";
      const doorsRes = await fetch(doorsUrl);
      if (doorsRes.ok) {
        const doorsData = await doorsRes.json();
        if (doorsData.ok && Array.isArray(doorsData.doors)) {
          setDoorsList(doorsData.doors);
        }
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Error refreshing visits.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Facility filter handler
  const handleFacilityChange = async (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    setIsRefreshing(true);
    try {
      const url =
        facilityId !== "all"
          ? `/api/vms/active-visits?facilityId=${encodeURIComponent(facilityId)}`
          : "/api/vms/active-visits";
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && Array.isArray(data.activeVisits)) {
        setVisits(data.activeVisits);
      }

      // Refresh doors for facility
      const doorsUrl =
        facilityId !== "all"
          ? `/api/vms/doors?facilityId=${encodeURIComponent(facilityId)}`
          : "/api/vms/doors";
      const doorsRes = await fetch(doorsUrl);
      if (doorsRes.ok) {
        const doorsData = await doorsRes.json();
        if (doorsData.ok && Array.isArray(doorsData.doors)) {
          setDoorsList(doorsData.doors);
        }
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Error filtering facility.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Facility filter
      if (selectedFacilityId !== "all" && v.facility.id !== selectedFacilityId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.visitor.fullName.toLowerCase().includes(q);
        const matchesHost = v.host?.name?.toLowerCase().includes(q) ?? false;
        const matchesId = v.visitId.toLowerCase().includes(q);
        const matchesCert = v.visitor.certificateNo?.toLowerCase().includes(q) ?? false;
        const matchesGroup = v.visitorGroupName?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesHost && !matchesId && !matchesCert && !matchesGroup) {
          return false;
        }
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
  }, [visits, selectedFacilityId, searchQuery, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = visits.length;
    const overstay = visits.filter((v) => v.isOverstay).length;
    const quota = visits.filter(
      (v) =>
        v.isQuotaExceeded ||
        (v.tapQuotaMode === "limited" && v.maxTaps > 0 && v.tapCount >= v.maxTaps - 1),
    ).length;
    const normal = Math.max(0, total - overstay);
    return { total, overstay, quota, normal };
  }, [visits]);

  // Handle Normal Check-out
  const handleNormalCheckOut = async (visit: ActiveVisitSummary) => {
    if (!confirm(`Apakah Anda yakin ingin menyelesaikan kunjungan (check-out) untuk ${visit.visitor.fullName}? Hak akses pintu turnstile akan segera dicabut.`)) {
      return;
    }

    setActionLoadingId(visit.visitId);
    setNotification(null);

    try {
      const res = await fetch(`/api/vms/active-visits/${visit.visitId}/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorUserId: "sec-operator-01",
          operatorName: "Security Frontdesk",
          isForced: false,
          reason: "Penyelesaian kunjungan normal",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal menyelesaikan kunjungan tamu.");
      }

      const receipt = (visit.visitId || "").slice(0, 8).toUpperCase();
      setNotification({
        type: "success",
        message: `Kunjungan ${visit.visitor.fullName} berhasil diselesaikan. Hak akses pada perangkat pintu fisik telah dicabut otomatis. Bukti Gateway: #${receipt}.`,
      });

      // Remove from active visits
      setVisits((prev) => prev.filter((v) => v.visitId !== visit.visitId));
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menyelesaikan kunjungan tamu.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Force Check-out Modal
  const openForceCheckOutModal = (visit: ActiveVisitSummary) => {
    setForceVisit(visit);
    setForceReason(visit.isOverstay ? `Batas waktu toleransi kunjungan (grace period) terlewati ${visit.overstayMinutes} menit` : "");
  };

  // Submit Force Check-out
  const handleConfirmForceCheckOut = async () => {
    if (!forceVisit) return;
    if (!forceReason.trim()) {
      alert("Harap cantumkan alasan keamanan untuk melakukan check-out paksa.");
      return;
    }

    setIsForceSubmitting(true);
    try {
      const res = await fetch(`/api/vms/active-visits/${forceVisit.visitId}/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorUserId: "sec-officer-99",
          operatorName: "Security Supervisor",
          isForced: true,
          reason: forceReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.errors?.reason || "Gagal mengeksekusi check-out paksa.");
      }

      const receipt =
        data.visit?.appointRecordId ||
        data.auditEvent?.appointRecordIdRevoked ||
        forceVisit.appointRecordId ||
        forceVisit.visitId.slice(0, 8).toUpperCase();
      setNotification({
        type: "warning",
        message: `Check-out paksa berhasil dilakukan untuk ${forceVisit.visitor.fullName}. Alasan tercatat: "${forceReason.trim()}". Hak akses perangkat dicabut seketika. Bukti Mesin: #${receipt}.`,
      });

      // Remove from active visits
      setVisits((prev) => prev.filter((v) => v.visitId !== forceVisit.visitId));
      setForceVisit(null);
      setForceReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengeksekusi check-out paksa.");
    } finally {
      setIsForceSubmitting(false);
    }
  };

  // Open Emergency Access Modal
  const openEmergencyAccessModal = (visit: ActiveVisitSummary) => {
    setEmergencyVisit(visit);
  };

  const handleRevokeEmergencyAccess = async (
    visit: ActiveVisitSummary,
    grant: EmergencyAccessGrant,
  ) => {
    const confirmed =
      typeof window !== "undefined" && window.confirm
        ? window.confirm(
            `Apakah Anda yakin ingin mencabut izin akses darurat pintu ${grant.doorNames?.join(", ") || "terkait"} untuk ${visit.visitor.fullName}? Tindakan ini langsung berlaku seketika.`,
          )
        : true;

    if (!confirmed) return;

    setActionLoadingId(grant.id);
    setNotification(null);

    try {
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
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to revoke emergency access.");
      }

      setNotification({
        type: "success",
        message: `Izin akses darurat pintu ${grant.doorNames?.join(", ") || "terkait"} untuk ${visit.visitor.fullName} berhasil dicabut.`,
      });

      setVisits((prev) =>
        prev.map((v) => {
          if (v.visitId !== visit.visitId) return v;
          const updatedGrants = (v.emergencyGrants || []).map((g) =>
            g.id === grant.id
              ? { ...g, status: "REVOKED" as const, revokedAtUtc: new Date().toISOString() }
              : g,
          );
          return {
            ...v,
            emergencyGrants: updatedGrants,
          };
        }),
      );
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal mencabut izin akses darurat.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action / Refresh Bar */}
      <div className="flex items-center justify-end">
        <button
          onClick={refreshVisits}
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex flex-col rounded-xl border p-4 text-left transition cursor-pointer ${
            activeTab === "all"
              ? "border-[var(--ks-ink)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] shadow-sm"
              : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:border-[var(--ks-rule)]"
          }`}
        >
          <span className={`text-2xs font-bold uppercase tracking-[0.08em] ${activeTab === "all" ? "text-[var(--ks-paper)]/70" : "text-[var(--ks-muted)]"}`}>
            Total Tamu di Gedung
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums">{stats.total}</span>
          <span className={`mt-0.5 text-2xs ${activeTab === "all" ? "text-[var(--ks-paper)]/60" : "text-[var(--ks-muted)]"}`}>
            Tamu aktif di dalam
          </span>
        </button>

        <button
          onClick={() => setActiveTab("normal")}
          className={`flex flex-col rounded-xl border p-4 text-left transition cursor-pointer ${
            activeTab === "normal"
              ? "border-[var(--ks-patina)] bg-[var(--ks-patina)] text-white shadow-sm"
              : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:border-[var(--ks-patina)]/40"
          }`}
        >
          <span className={`text-2xs font-bold uppercase tracking-[0.08em] ${activeTab === "normal" ? "text-emerald-100" : "text-[var(--ks-patina)]"}`}>
            Status Normal
          </span>
          <span className={`mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums ${activeTab === "normal" ? "text-white" : "text-[var(--ks-patina)]"}`}>
            {stats.normal}
          </span>
          <span className={`mt-0.5 text-2xs ${activeTab === "normal" ? "text-emerald-100" : "text-[var(--ks-muted)]"}`}>
            Sesuai jadwal &amp; kuota
          </span>
        </button>

        <button
          onClick={() => setActiveTab("overstay")}
          className={`flex flex-col rounded-xl border p-4 text-left transition cursor-pointer ${
            activeTab === "overstay"
              ? "border-[var(--ks-vermilion)] bg-[var(--ks-vermilion)] text-white shadow-sm"
              : stats.overstay > 0
                ? "border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/10 text-[var(--ks-ink)] hover:border-[var(--ks-vermilion)]"
                : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:border-[var(--ks-vermilion)]/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-2xs font-bold uppercase tracking-[0.08em] ${activeTab === "overstay" ? "text-rose-100" : "text-[var(--ks-vermilion)]"}`}>
              Peringatan Overstay
            </span>
            {stats.overstay > 0 && activeTab !== "overstay" && (
              <span className="flex h-2 w-2 rounded-full ks-led-vermilion" />
            )}
          </div>
          <span className={`mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums ${activeTab === "overstay" ? "text-white" : "text-[var(--ks-vermilion)]"}`}>
            {stats.overstay}
          </span>
          <span className={`mt-0.5 text-2xs ${activeTab === "overstay" ? "text-rose-100" : "text-[var(--ks-vermilion)]"}`}>
            Melewati batas toleransi
          </span>
        </button>

        <button
          onClick={() => setActiveTab("quota")}
          className={`flex flex-col rounded-xl border p-4 text-left transition cursor-pointer ${
            activeTab === "quota"
              ? "border-[var(--ks-kinpaku)] bg-[var(--ks-kinpaku)] text-[var(--ks-ink)] shadow-sm"
              : stats.quota > 0
                ? "border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 text-[var(--ks-ink)] hover:border-[var(--ks-kinpaku)]"
                : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:border-[var(--ks-kinpaku)]/30"
          }`}
        >
          <span className={`text-2xs font-bold uppercase tracking-[0.08em] ${activeTab === "quota" ? "text-[var(--ks-ink)]" : "text-[var(--ks-ink)]"}`}>
            Peringatan Kuota Tap
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums text-[var(--ks-ink)]">
            {stats.quota}
          </span>
          <span className={`mt-0.5 text-2xs ${activeTab === "quota" ? "text-[var(--ks-ink)]/70" : "text-[var(--ks-muted)]"}`}>
            Mendekati / capai batas
          </span>
        </button>
      </div>

      {/* Facility & Search Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="min-w-[200px]">
            <label htmlFor="facilityFilter" className="sr-only">
              Saring Berdasarkan Gedung
            </label>
            <select
              id="facilityFilter"
              value={selectedFacilityId}
              onChange={(e) => handleFacilityChange(e.target.value)}
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

          <div className="flex-1 min-w-[240px]">
            <label htmlFor="visitorSearch" className="sr-only">
              Cari data tamu
            </label>
            <input
              id="visitorSearch"
              type="search"
              placeholder="Cari nama tamu, tuan rumah, atau nomor kunjungan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-xs text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
            />
          </div>
        </div>

        {/* Tab Badges */}
        <div className="flex items-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0">
          {[
            { id: "all", label: "Semua" },
            { id: "normal", label: "Normal" },
            { id: "overstay", label: "Overstay" },
            { id: "quota", label: "Kuota" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
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
      </div>

      {/* Active Visitors List */}
      {filteredVisits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] text-xl font-bold font-mono">
            0
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[var(--ks-ink)]">
            {visits.length === 0 ? "Tidak Ada Tamu Aktif di Dalam Gedung" : "Tidak Ada Tamu Aktif Sesuai Saringan"}
          </h3>
          <p className="mt-1 text-xs text-[var(--ks-muted)]">
            {visits.length === 0
              ? "Seluruh tamu telah selesai berkunjung atau belum melakukan check-in."
              : "Coba sesuaikan kata kunci pencarian, pemilihan fasilitas gedung, atau tab penyaring."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredVisits.map((visit) => {
            const isLoading = actionLoadingId === visit.visitId;
            const tapRatio =
              visit.tapQuotaMode === "limited" && visit.maxTaps > 0
                ? Math.min(100, Math.round((visit.tapCount / visit.maxTaps) * 100))
                : 0;

            const checkInFormatted = new Date(visit.checkInTimeUtc).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const scheduledEndFormatted = new Date(visit.scheduledEndTimeUtc).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            const doorAccessType = resolveDoorAccessType(visit.lastSeenDoor, doorsList);
            const canGrantEmergency =
              visit.status === "CHECKED_IN" || visit.status === "OVERSTAY" || visit.isOverstay;

            return (
              <div
                key={visit.visitId}
                className={`flex flex-col justify-between rounded-xl border p-5 shadow-xs transition bg-[var(--ks-paper-raised)] ${
                  visit.isOverstay
                    ? "border-[var(--ks-vermilion)]/50 ring-1 ring-[var(--ks-vermilion)]/30"
                    : visit.isQuotaExceeded
                      ? "border-[var(--ks-kinpaku)]/50 ring-1 ring-[var(--ks-kinpaku)]/30"
                      : "border-[var(--ks-rule-subtle)] hover:border-[var(--ks-rule)]"
                }`}
              >
                <div>
                  {/* Header: Visitor Info & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {visit.visitor.photo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={
                            visit.visitor.photo.startsWith("data:")
                              ? visit.visitor.photo
                              : `data:image/jpeg;base64,${visit.visitor.photo}`
                          }
                          alt={visit.visitor.fullName}
                          className="h-12 w-12 rounded-full object-cover border border-[var(--ks-rule-subtle)] shadow-xs"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] text-xs font-bold text-[var(--ks-ink)] border border-[var(--ks-rule-subtle)]">
                          {visit.visitor.givenName[0]}
                          {visit.visitor.familyName[0]}
                        </div>
                      )}
                      <div>
                        <h2 className="text-base font-bold text-[var(--ks-ink)] flex flex-wrap items-center gap-2">
                          <span>{visit.visitor.fullName}</span>
                          <span className="text-[11px] font-normal text-[var(--ks-muted)]">
                            ({visit.visitReason})
                          </span>
                          {visit.isFastTrack && (
                            <span
                              data-testid="fast-track-badge"
                              className="inline-flex items-center gap-1 rounded-full border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-[var(--ks-patina)]"
                            >
                              Masuk Otomatis Tanpa Antre
                            </span>
                          )}
                        </h2>
                        {visit.visitorGroupName && (
                          <span className="inline-block rounded-md border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-2xs font-semibold text-[var(--ks-ink)] mt-0.5">
                            Rombongan: {visit.visitorGroupName}
                          </span>
                        )}
                        <p className="text-xs text-[var(--ks-muted)]">
                          {visit.visitor.phone || visit.visitor.email || "Tanpa data kontak"}
                          {visit.visitor.certificateNo && ` • No. Identitas: ${visit.visitor.certificateNo}`}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      {visit.isOverstay ? (
                        <span className="inline-flex items-center rounded-full border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--ks-vermilion)]">
                          {visit.overstayMinutes}m Overstay
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--ks-patina)]">
                          Sesuai Jadwal
                        </span>
                      )}

                      {visit.appointRecordId && (
                        <span className="text-3xs font-mono text-[var(--ks-muted)]">
                          HC: {visit.appointRecordId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-y border-[var(--ks-rule-subtle)] py-3">
                    <div>
                      <span className="text-[var(--ks-muted)]">Gedung:</span>{" "}
                      <span className="font-semibold text-[var(--ks-ink)]">{visit.facility.name}</span>
                    </div>
                    <div>
                      <span className="text-[var(--ks-muted)]">Karyawan Tuan Rumah:</span>{" "}
                      <span className="font-semibold text-[var(--ks-ink)]">{visit.host?.name || "Tamu Datang Langsung (Walk-in)"}</span>
                    </div>
                    <div>
                      <span className="text-[var(--ks-muted)]">Waktu Masuk:</span>{" "}
                      <span className="font-semibold text-[var(--ks-ink)] font-mono">{checkInFormatted}</span>
                    </div>
                    <div>
                      <span className="text-[var(--ks-muted)]">Jadwal Keluar:</span>{" "}
                      <span className={`font-semibold font-mono ${visit.isOverstay ? "text-[var(--ks-vermilion)]" : "text-[var(--ks-ink)]"}`}>
                        {scheduledEndFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Location & Directionality */}
                  {visit.lastSeenDoor && (
                    <div
                      data-testid="visitor-last-seen-door"
                      className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-[var(--ks-paper-deep)] px-3 py-2 text-xs border border-[var(--ks-rule-subtle)]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--ks-muted)] font-medium">Lokasi Terakhir:</span>
                        <span className="font-semibold text-[var(--ks-ink)]">
                          {visit.lastSeenDoor.doorName || visit.lastSeenDoor.doorIndexCode}
                        </span>
                        <span className="text-[11px] text-[var(--ks-muted)]">
                          ({visit.lastSeenDoor.direction === "in" ? "Masuk" : "Keluar"} pada{" "}
                          {new Date(visit.lastSeenDoor.tappedAtUtc).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })})
                        </span>
                      </div>
                      {doorAccessType === "DUAL_DIRECTION" && (
                        <span
                          data-testid="directionality-badge-dual"
                          className="inline-flex items-center rounded-full border border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] px-2.5 py-0.5 text-2xs font-semibold text-[var(--ks-ink)]"
                        >
                          Pintu Dua Arah
                        </span>
                      )}
                      {doorAccessType === "SINGLE_DIRECTION_IN" && (
                        <span
                          data-testid="directionality-badge-single"
                          className="inline-flex items-center rounded-full border border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/20 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-[var(--ks-ink)]"
                        >
                          Pintu Masuk Saja
                        </span>
                      )}
                    </div>
                  )}

                  {/* Movement Breadcrumbs */}
                  {visit.movementBreadcrumbs && visit.movementBreadcrumbs.length > 0 && (
                    <div className="mt-3 rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] p-2.5">
                      <div className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1.5 flex items-center gap-1">
                        <span>Riwayat Pergerakan Pintu</span>
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ks-ink)]"
                        data-testid="movement-breadcrumbs"
                      >
                        {visit.movementBreadcrumbs.map((crumb, idx) => {
                          const isImplicit = Boolean(crumb.isImplicit || crumb.implicit);
                          return (
                            <span
                              key={crumb.id || `${crumb.doorIndexCode}-${idx}`}
                              className="inline-flex items-center gap-1.5"
                            >
                              {idx > 0 && <span className="text-[var(--ks-muted)] font-bold">→</span>}
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium border ${
                                  isImplicit
                                    ? "bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)] border-[var(--ks-kinpaku)]/30 font-semibold"
                                    : "bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] border-[var(--ks-rule-subtle)] shadow-2xs"
                                }`}
                              >
                                <span>{crumb.doorName || crumb.doorIndexCode}</span>
                                <span className={isImplicit ? "text-[var(--ks-ink)] font-bold" : "text-[var(--ks-muted)]"}>
                                  ({isImplicit ? "Keluar Otomatis" : crumb.direction === "in" ? "Masuk" : "Keluar"})
                                </span>
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active Emergency Grants */}
                  {visit.emergencyGrants && visit.emergencyGrants.length > 0 && (
                    <div className="mt-3 space-y-1.5" data-testid="emergency-grants-list">
                      {visit.emergencyGrants.map((grant) => {
                        const isActive = isEmergencyGrantActive(grant);
                        const isRevoked = grant.status === "REVOKED";
                        const isExpired = grant.status === "EXPIRED" || (!isActive && !isRevoked);

                        const msRemaining = new Date(grant.expiresAtUtc).getTime() - Date.now();
                        const minsRemaining = Math.max(0, Math.ceil(msRemaining / (60 * 1000)));
                        const remainingLabel =
                          minsRemaining >= 60
                            ? `${Math.floor(minsRemaining / 60)}j ${minsRemaining % 60}m tersisa`
                            : `${minsRemaining}m tersisa`;

                        const expiryFormatted = new Date(grant.expiresAtUtc).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={grant.id}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-2.5 text-xs border ${
                              isActive
                                ? "border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 text-[var(--ks-ink)]"
                                : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] opacity-75"
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--ks-ink)] flex items-center gap-1">
                                  <span>Izin Akses Darurat Sementara:</span>
                                  <span>{grant.doorNames?.join(", ") || grant.doorIndexCodes?.join(", ")}</span>
                                </span>
                                {isActive && (
                                  <span className="rounded-full border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/15 px-2 py-0.5 text-3xs font-bold text-[var(--ks-vermilion)]">
                                    {remainingLabel}
                                  </span>
                                )}
                                {isRevoked && (
                                  <span className="rounded-full border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-3xs font-medium text-[var(--ks-muted)]">
                                    Dicabut
                                  </span>
                                )}
                                {isExpired && !isRevoked && (
                                  <span className="rounded-full border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-3xs font-medium text-[var(--ks-muted)]">
                                    Kedaluwarsa
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[var(--ks-muted)]">
                                <span className="font-medium text-[var(--ks-ink)]">Alasan:</span> {grant.reason} •{" "}
                                <span className="font-medium text-[var(--ks-ink)]">Berakhir:</span> {expiryFormatted} •{" "}
                                <span className="font-medium text-[var(--ks-ink)]">Oleh:</span> {grant.grantedByName || grant.grantedByUserId}
                              </p>
                            </div>

                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleRevokeEmergencyAccess(visit, grant)}
                                disabled={actionLoadingId === grant.id}
                                className="ks-btn inline-flex items-center rounded-md border border-[var(--ks-vermilion)]/40 bg-[var(--ks-paper-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/10 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {actionLoadingId === grant.id ? "Mencabut..." : "Cabut Izin Akses"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Door Tap Quota Tracking */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] flex items-center gap-1">
                        <span>Jatah Buka Pintu (Kuota Tap):</span>
                      </span>
                      <span className="font-mono text-[var(--ks-ink)] font-medium">
                        {visit.tapQuotaMode === "limited" ? (
                          <>
                            <strong className={visit.tapCount >= visit.maxTaps ? "text-[var(--ks-vermilion)]" : "text-[var(--ks-ink)]"}>
                              {visit.tapCount}
                            </strong>{" "}
                            / {visit.maxTaps} Tap{" "}
                            {visit.tapCount >= visit.maxTaps ? (
                              <span className="text-[var(--ks-vermilion)] font-bold">(Habis)</span>
                            ) : (
                              <span className="text-[var(--ks-muted)]">
                                ({visit.maxTaps - visit.tapCount} tersisa)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[var(--ks-patina)] font-semibold">
                            {visit.tapCount} Tap (Bebas / Tanpa Batas)
                          </span>
                        )}
                      </span>
                    </div>

                    {visit.tapQuotaMode === "limited" && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            visit.tapCount >= visit.maxTaps
                              ? "bg-[var(--ks-vermilion)]"
                              : tapRatio >= 75
                                ? "bg-[var(--ks-kinpaku)]"
                                : "bg-[var(--ks-ink)]"
                          }`}
                          style={{ width: `${tapRatio}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ks-rule-subtle)] pt-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {canGrantEmergency && (
                      <button
                        onClick={() => openEmergencyAccessModal(visit)}
                        disabled={isLoading}
                        className="ks-btn inline-flex items-center gap-1.5 rounded-lg border border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/15 px-3 py-1.5 text-xs font-semibold text-[var(--ks-ink)] shadow-2xs hover:brightness-105 active:scale-98 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <span>Izin Akses Darurat</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNormalCheckOut(visit)}
                      disabled={isLoading}
                      className="ks-btn inline-flex items-center rounded-lg bg-[var(--ks-patina)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:brightness-110 active:scale-98 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isLoading ? "Memproses..." : "Check-Out Normal"}
                    </button>

                    <button
                      onClick={() => openForceCheckOutModal(visit)}
                      disabled={isLoading}
                      className="ks-btn inline-flex items-center rounded-lg border border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/20 active:scale-98 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Check-Out Paksa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Force Check-out Modal */}
      {forceVisit && (
        <div
          ref={forceModalRef}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ks-ink)]/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-2xl text-[var(--ks-text)]">
            <div className="flex items-center justify-between border-b border-[var(--ks-rule-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--ks-ink)] flex items-center gap-2">
                Check-Out Paksa Tamu
              </h3>
              <button
                onClick={() => setForceVisit(null)}
                className="text-[var(--ks-muted)] hover:text-[var(--ks-ink)] p-1 rounded-lg cursor-pointer transition-colors"
                aria-label="Tutup dialog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-[var(--ks-paper-deep)] p-3 text-xs border border-[var(--ks-rule-subtle)]">
                <p className="font-bold text-[var(--ks-ink)]">{forceVisit.visitor.fullName}</p>
                <p className="text-[var(--ks-muted)]">
                  Gedung: {forceVisit.facility.name} • Tuan Rumah: {forceVisit.host?.name || "N/A"}
                </p>
                {forceVisit.isOverstay && (
                  <p className="mt-1 font-bold text-[var(--ks-vermilion)]">
                    Kunjungan Melebihi Waktu (Overstay): Melewati jadwal keluar sebesar {forceVisit.overstayMinutes} menit
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="securityReason" className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                  Alasan Keamanan Check-Out Paksa <span className="text-[var(--ks-vermilion)]">*</span>
                </label>
                <textarea
                  id="securityReason"
                  rows={3}
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  placeholder="Cantumkan alasan detail check-out paksa tamu..."
                  className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] p-2.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-vermilion)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-vermilion)]"
                />
              </div>

              {/* Quick preset chips */}
              <div className="space-y-1">
                <span className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)]">Pilihan alasan cepat:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Melewati batas toleransi waktu kunjungan (Overstay)",
                    "Didampingi petugas keamanan meninggalkan gedung",
                    "Jam operasional gedung berakhir (Jam Malam)",
                    "Terdeteksi masuk ke area terlarang / tanpa izin",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForceReason(preset)}
                      className="rounded border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-2xs font-medium text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-[var(--ks-kinpaku)]/10 p-3 text-2xs text-[var(--ks-ink)] border border-[var(--ks-kinpaku)]/30">
                <strong>Dampak Perangkat Fisik:</strong> Langsung mencabut seluruh izin kartu RFID, pencocokan biometrik wajah, dan kode QR dinamis di seluruh controller pintu fisik seketika.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--ks-rule-subtle)] pt-4">
              <button
                type="button"
                onClick={() => setForceVisit(null)}
                disabled={isForceSubmitting}
                className="ks-btn rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmForceCheckOut}
                disabled={isForceSubmitting || !forceReason.trim()}
                className="ks-btn rounded-lg bg-[var(--ks-vermilion)] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-xs hover:brightness-110 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {isForceSubmitting ? "Mencabut izin..." : "Cabut Izin Akses & Eksekusi Check-Out Paksa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Access Escalation Modal */}
      {emergencyVisit && (
        <EmergencyAccessModal
          key={`${emergencyVisit.visitId}-${emergencyVisit.emergencyGrants?.length ?? 0}`}
          visit={emergencyVisit}
          doors={doorsList}
          onClose={() => setEmergencyVisit(null)}
          onSuccess={(grant, message) => {
            setNotification({
              type: "success",
              message,
            });
            setVisits((prev) =>
              prev.map((v) => {
                if (v.visitId !== emergencyVisit.visitId) return v;
                const currentGrants = v.emergencyGrants || [];
                return {
                  ...v,
                  emergencyGrants: [...currentGrants, grant],
                };
              }),
            );
            setEmergencyVisit(null);
          }}
        />
      )}
    </div>
  );
}
