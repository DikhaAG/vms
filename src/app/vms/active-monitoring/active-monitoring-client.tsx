"use client";

import { useState, useMemo, useEffect } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
  DoorAccessType,
  VisitLastSeenDoor,
} from "@/lib/vms/checkout-contract";
import { isEmergencyGrantActive } from "@/lib/vms/checkout-contract";
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

  useEffect(() => {
    if (!forceVisit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setForceVisit(null);
        setForceReason("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [forceVisit]);

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
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-slate-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
        >
          {isRefreshing ? "Menyegarkan..." : "↻ Segarkan Daftar Tamu Aktif"}
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-start justify-between rounded-lg p-4 text-sm ${
            notification.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : notification.type === "warning"
                ? "border border-amber-300 bg-amber-50 text-amber-950 font-medium"
                : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 text-slate-500 hover:text-slate-800 rounded-md cursor-pointer"
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
          className={`flex flex-col rounded-xl border p-4 text-left transition ${
            activeTab === "all"
              ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
              : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300"
          }`}
        >
          <span className={`text-xs font-medium ${activeTab === "all" ? "text-neutral-300" : "text-neutral-500"}`}>
            Total Tamu di Gedung
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums">{stats.total}</span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "all" ? "text-neutral-400" : "text-neutral-500"}`}>
            Tamu aktif di dalam
          </span>
        </button>

        <button
          onClick={() => setActiveTab("normal")}
          className={`flex flex-col rounded-xl border p-4 text-left transition ${
            activeTab === "normal"
              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
              : "border-neutral-200 bg-white text-neutral-900 hover:border-emerald-300"
          }`}
        >
          <span className={`text-xs font-medium ${activeTab === "normal" ? "text-emerald-100" : "text-emerald-700"}`}>
            Status Normal
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300 font-mono tabular-nums">
            {stats.normal}
          </span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "normal" ? "text-emerald-100" : "text-neutral-500"}`}>
            Sesuai jadwal &amp; kuota
          </span>
        </button>

        <button
          onClick={() => setActiveTab("overstay")}
          className={`flex flex-col rounded-xl border p-4 text-left transition ${
            activeTab === "overstay"
              ? "border-rose-600 bg-rose-600 text-white shadow-sm"
              : stats.overstay > 0
                ? "border-rose-300 bg-rose-50 text-neutral-900 hover:border-rose-400"
                : "border-neutral-200 bg-white text-neutral-900 hover:border-rose-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${activeTab === "overstay" ? "text-rose-100" : "text-rose-700"}`}>
              Peringatan Overstay
            </span>
            {stats.overstay > 0 && activeTab !== "overstay" && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500" />
            )}
          </div>
          <span className={`mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums ${activeTab === "overstay" ? "text-white" : "text-rose-700"}`}>
            {stats.overstay}
          </span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "overstay" ? "text-rose-100" : "text-rose-600"}`}>
            Melewati batas toleransi
          </span>
        </button>

        <button
          onClick={() => setActiveTab("quota")}
          className={`flex flex-col rounded-xl border p-4 text-left transition ${
            activeTab === "quota"
              ? "border-amber-600 bg-amber-600 text-white shadow-sm"
              : stats.quota > 0
                ? "border-amber-300 bg-amber-50 text-neutral-900 hover:border-amber-400"
                : "border-neutral-200 bg-white text-neutral-900 hover:border-amber-200"
          }`}
        >
          <span className={`text-xs font-medium ${activeTab === "quota" ? "text-amber-100" : "text-amber-800"}`}>
            Peringatan Kuota Tap
          </span>
          <span className={`mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums ${activeTab === "quota" ? "text-white" : "text-amber-800"}`}>
            {stats.quota}
          </span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "quota" ? "text-amber-100" : "text-amber-700"}`}>
            Mendekati / capai batas
          </span>
        </button>
      </div>

      {/* Facility & Search Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="min-w-[200px]">
            <label htmlFor="facilityFilter" className="sr-only">
              Saring Berdasarkan Gedung
            </label>
            <select
              id="facilityFilter"
              value={selectedFacilityId}
              onChange={(e) => handleFacilityChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
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
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
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
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Visitors List */}
      {filteredVisits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 text-xl font-bold">
            0
          </div>
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">
            {visits.length === 0 ? "Tidak Ada Tamu Aktif di Dalam Gedung" : "Tidak Ada Tamu Aktif Sesuai Saringan"}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
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
                className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition ${
                  visit.isOverstay
                    ? "border-rose-400 ring-1 ring-rose-300"
                    : visit.isQuotaExceeded
                      ? "border-amber-400 ring-1 ring-amber-300"
                      : "border-neutral-200"
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
                          className="h-12 w-12 rounded-full object-cover border border-neutral-200 shadow-xs"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700 border border-neutral-200">
                          {visit.visitor.givenName[0]}
                          {visit.visitor.familyName[0]}
                        </div>
                      )}
                      <div>
                        <h2 className="text-base font-bold text-neutral-950 flex flex-wrap items-center gap-2">
                          <span>{visit.visitor.fullName}</span>
                          <span className="text-[11px] font-normal text-neutral-500">
                            ({visit.visitReason})
                          </span>
                          {visit.isFastTrack && (
                            <span
                              data-testid="fast-track-badge"
                              className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200"
                            >
                              Masuk Otomatis Tanpa Antre
                            </span>
                          )}
                        </h2>
                        {visit.visitorGroupName && (
                          <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200 mt-0.5">
                            Rombongan: {visit.visitorGroupName}
                          </span>
                        )}
                        <p className="text-xs text-neutral-500">
                          {visit.visitor.phone || visit.visitor.email || "Tanpa data kontak"}
                          {visit.visitor.certificateNo && ` • No. Identitas: ${visit.visitor.certificateNo}`}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      {visit.isOverstay ? (
                        <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-300 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                          {visit.overstayMinutes}m Overstay
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          Sesuai Jadwal
                        </span>
                      )}

                      {visit.appointRecordId && (
                        <span className="text-[10px] font-mono text-neutral-500">
                          HC: {visit.appointRecordId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-y border-neutral-100 py-3">
                    <div>
                      <span className="text-neutral-600 dark:text-slate-400">Gedung:</span>{" "}
                      <span className="font-semibold text-neutral-800">{visit.facility.name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600 dark:text-slate-400">Karyawan Tuan Rumah:</span>{" "}
                      <span className="font-semibold text-neutral-800">{visit.host?.name || "Tamu Datang Langsung (Walk-in)"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600 dark:text-slate-400">Waktu Masuk:</span>{" "}
                      <span className="font-semibold text-neutral-800">{checkInFormatted}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600 dark:text-slate-400">Jadwal Keluar:</span>{" "}
                      <span className={`font-semibold ${visit.isOverstay ? "text-rose-700" : "text-neutral-800"}`}>
                        {scheduledEndFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Location & Directionality */}
                  {visit.lastSeenDoor && (
                    <div
                      data-testid="visitor-last-seen-door"
                      className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-neutral-50 px-3 py-2 text-xs border border-neutral-100"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-600 dark:text-slate-400 font-medium">Lokasi Terakhir:</span>
                        <span className="font-semibold text-neutral-900">
                          {visit.lastSeenDoor.doorName || visit.lastSeenDoor.doorIndexCode}
                        </span>
                        <span className="text-[11px] text-neutral-400">
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
                          className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200"
                        >
                          Pintu Dua Arah
                        </span>
                      )}
                      {doorAccessType === "SINGLE_DIRECTION_IN" && (
                        <span
                          data-testid="directionality-badge-single"
                          className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200"
                        >
                          Pintu Masuk Saja
                        </span>
                      )}
                    </div>
                  )}

                  {/* Movement Breadcrumbs */}
                  {visit.movementBreadcrumbs && visit.movementBreadcrumbs.length > 0 && (
                    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-2.5">
                      <div className="text-[11px] font-semibold text-neutral-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <span>Riwayat Pergerakan Pintu</span>
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-800"
                        data-testid="movement-breadcrumbs"
                      >
                        {visit.movementBreadcrumbs.map((crumb, idx) => {
                          const isImplicit = Boolean(crumb.isImplicit || crumb.implicit);
                          return (
                            <span
                              key={crumb.id || `${crumb.doorIndexCode}-${idx}`}
                              className="inline-flex items-center gap-1.5"
                            >
                              {idx > 0 && <span className="text-neutral-400 font-bold">→</span>}
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium border ${
                                  isImplicit
                                    ? "bg-amber-100 text-amber-900 border-amber-300"
                                    : "bg-white text-neutral-800 border-neutral-200 shadow-2xs"
                                }`}
                              >
                                <span>{crumb.doorName || crumb.doorIndexCode}</span>
                                <span className={isImplicit ? "text-amber-800 font-bold" : "text-neutral-500"}>
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
                                ? "border-amber-300 bg-amber-50/90 text-amber-950"
                                : "border-neutral-200 bg-neutral-50 text-neutral-500 opacity-75"
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900 flex items-center gap-1">
                                  <span>Izin Akses Darurat Sementara:</span>
                                  <span>{grant.doorNames?.join(", ") || grant.doorIndexCodes?.join(", ")}</span>
                                </span>
                                {isActive && (
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                    {remainingLabel}
                                  </span>
                                )}
                                {isRevoked && (
                                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                    Dicabut
                                  </span>
                                )}
                                {isExpired && !isRevoked && (
                                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                    Kedaluwarsa
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-600">
                                <span className="font-medium">Alasan:</span> {grant.reason} •{" "}
                                <span className="font-medium">Berakhir:</span> {expiryFormatted} •{" "}
                                <span className="font-medium">Oleh:</span> {grant.grantedByName || grant.grantedByUserId}
                              </p>
                            </div>

                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleRevokeEmergencyAccess(visit, grant)}
                                disabled={actionLoadingId === grant.id}
                                className="inline-flex items-center rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 active:bg-rose-100 disabled:opacity-50"
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
                      <span className="font-semibold text-neutral-700 flex items-center gap-1">
                        <span>Jatah Buka Pintu (Kuota Tap):</span>
                      </span>
                      <span className="font-mono text-neutral-800 font-medium">
                        {visit.tapQuotaMode === "limited" ? (
                          <>
                            <strong className={visit.tapCount >= visit.maxTaps ? "text-rose-600" : "text-neutral-900"}>
                              {visit.tapCount}
                            </strong>{" "}
                            / {visit.maxTaps} Tap{" "}
                            {visit.tapCount >= visit.maxTaps ? (
                              <span className="text-rose-600 font-bold">(Habis)</span>
                            ) : (
                              <span className="text-neutral-400">
                                ({visit.maxTaps - visit.tapCount} tersisa)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-emerald-700 font-semibold">
                            {visit.tapCount} Tap (Bebas / Tanpa Batas)
                          </span>
                        )}
                      </span>
                    </div>

                    {visit.tapQuotaMode === "limited" && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full transition-all duration-300 ${
                            visit.tapCount >= visit.maxTaps
                              ? "bg-rose-600"
                              : tapRatio >= 75
                                ? "bg-amber-500"
                                : "bg-neutral-800"
                          }`}
                          style={{ width: `${tapRatio}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {canGrantEmergency && (
                      <button
                        onClick={() => openEmergencyAccessModal(visit)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 active:bg-amber-200 disabled:opacity-50"
                      >
                        <span>Izin Akses Darurat</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNormalCheckOut(visit)}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
                    >
                      {isLoading ? "Memproses..." : "Check-Out Normal"}
                    </button>

                    <button
                      onClick={() => openForceCheckOutModal(visit)}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 active:bg-rose-200 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                Check-Out Paksa Tamu
              </h3>
              <button
                onClick={() => setForceVisit(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg cursor-pointer"
                aria-label="Tutup dialog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-neutral-50 p-3 text-xs">
                <p className="font-bold text-neutral-900">{forceVisit.visitor.fullName}</p>
                <p className="text-neutral-600">
                  Gedung: {forceVisit.facility.name} • Tuan Rumah: {forceVisit.host?.name || "N/A"}
                </p>
                {forceVisit.isOverstay && (
                  <p className="mt-1 font-bold text-rose-700">
                    Kunjungan Melebihi Waktu (Overstay): Melewati jadwal keluar sebesar {forceVisit.overstayMinutes} menit
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="securityReason" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Alasan Keamanan Check-Out Paksa <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="securityReason"
                  rows={3}
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  placeholder="Cantumkan alasan detail check-out paksa tamu..."
                  className="w-full rounded-lg border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-rose-600 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
                />
              </div>

              {/* Quick preset chips */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-neutral-500">Pilihan alasan cepat:</span>
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
                      className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-200 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-900 border border-amber-200">
                <strong>Dampak Perangkat Fisik:</strong> Langsung mencabut seluruh izin kartu RFID, pencocokan biometrik wajah, dan kode QR dinamis di seluruh controller pintu fisik seketika.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={() => setForceVisit(null)}
                disabled={isForceSubmitting}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmForceCheckOut}
                disabled={isForceSubmitting || !forceReason.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
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
