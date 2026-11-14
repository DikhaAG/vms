"use client";

import { useState, useMemo } from "react";
import type { Facility, PreRegistrationMode, StubScenario } from "@/lib/vms/vms-contract";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
  DoorAccessType,
  VisitLastSeenDoor,
} from "@/lib/vms/checkout-contract";
import { isEmergencyGrantActive } from "@/lib/vms/checkout-contract";

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
  const [selectedDoorCodes, setSelectedDoorCodes] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [operatorUserId, setOperatorUserId] = useState("sec-officer-01");
  const [operatorName, setOperatorName] = useState("Security Officer");
  const [isEmergencySubmitting, setIsEmergencySubmitting] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);

  // Testing mode toggle
  const [mode, setMode] = useState<PreRegistrationMode>("stub");
  const [stubScenario, setStubScenario] = useState<StubScenario>("success");

  // Notification banners
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

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

  // Handle Simulate Door Tap
  const handleSimulateTap = async (visit: ActiveVisitSummary) => {
    setActionLoadingId(visit.visitId);
    setNotification(null);

    try {
      const res = await fetch(`/api/vms/active-visits/${visit.visitId}/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-turnstile-main",
          doorName: "Main Entrance SpeedGate",
          direction: "in",
          mode,
          stubScenario,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.errors?._global || "Failed to record door tap.");
      }

      if (data.autoCheckedOut) {
        setNotification({
          type: "warning",
          message: `🚨 Tap Quota Exhausted (${data.tapCount}/${data.maxTaps})! ${visit.visitor.fullName} was automatically checked out and terminal permissions have been revoked across all physical controllers.`,
        });
        // Remove visit from active on-premise list
        setVisits((prev) => prev.filter((v) => v.visitId !== visit.visitId));
      } else {
        const remainingText =
          data.remainingTaps !== undefined ? ` (${data.remainingTaps} remaining)` : "";
        setNotification({
          type: "success",
          message: `✓ Door tap recorded for ${visit.visitor.fullName}. Cumulative taps: ${data.tapCount}${remainingText}.`,
        });
        // Update local visit tap count
        setVisits((prev) =>
          prev.map((v) =>
            v.visitId === visit.visitId
              ? {
                  ...v,
                  tapCount: data.tapCount,
                  isQuotaExceeded: data.isQuotaExceeded,
                }
              : v,
          ),
        );
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to record door tap.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Normal Check-out
  const handleNormalCheckOut = async (visit: ActiveVisitSummary) => {
    if (!confirm(`Are you sure you want to check out ${visit.visitor.fullName}? This will revoke door turnstile access immediately.`)) {
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
          reason: "Normal visit completion",
          mode,
          stubScenario,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to check out visitor.");
      }

      setNotification({
        type: "success",
        message: `✓ ${visit.visitor.fullName} successfully checked out. Access privileges revoked on physical hardware.`,
      });

      // Remove from active visits
      setVisits((prev) => prev.filter((v) => v.visitId !== visit.visitId));
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to check out visitor.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Force Check-out Modal
  const openForceCheckOutModal = (visit: ActiveVisitSummary) => {
    setForceVisit(visit);
    setForceReason(visit.isOverstay ? `Overstay grace period exceeded by ${visit.overstayMinutes} minutes` : "");
  };

  // Submit Force Check-out
  const handleConfirmForceCheckOut = async () => {
    if (!forceVisit) return;
    if (!forceReason.trim()) {
      alert("Please specify a security reason for forced check-out.");
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
          mode,
          stubScenario,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.errors?.reason || "Failed to force check-out visitor.");
      }

      setNotification({
        type: "warning",
        message: `⚠️ Force check-out completed for ${forceVisit.visitor.fullName}. Reason logged: "${forceReason.trim()}". Hardware permissions revoked.`,
      });

      // Remove from active visits
      setVisits((prev) => prev.filter((v) => v.visitId !== forceVisit.visitId));
      setForceVisit(null);
      setForceReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to execute force check-out.");
    } finally {
      setIsForceSubmitting(false);
    }
  };

  // Open Emergency Access Modal
  const openEmergencyAccessModal = (visit: ActiveVisitSummary) => {
    setEmergencyVisit(visit);
    setSelectedDoorCodes([]);
    setDurationHours(1);
    setEmergencyReason("");
    setOperatorUserId("sec-officer-01");
    setOperatorName("Security Officer");
    setEmergencyError(null);
  };

  const closeEmergencyAccessModal = () => {
    setEmergencyVisit(null);
    setSelectedDoorCodes([]);
    setEmergencyReason("");
    setEmergencyError(null);
  };

  const handleToggleDoorSelection = (doorCode: string) => {
    setSelectedDoorCodes((prev) =>
      prev.includes(doorCode) ? prev.filter((c) => c !== doorCode) : [...prev, doorCode],
    );
  };

  const availableEmergencyDoors = useMemo(() => {
    if (!emergencyVisit) return [];
    return doorsList.filter(
      (door) => !door.facilityId || door.facilityId === emergencyVisit.facility.id,
    );
  }, [doorsList, emergencyVisit]);

  const handleConfirmEmergencyAccess = async () => {
    if (!emergencyVisit) return;
    setEmergencyError(null);

    if (selectedDoorCodes.length === 0) {
      setEmergencyError("Please select at least one physical door.");
      return;
    }

    if (emergencyReason.trim().length < 10) {
      setEmergencyError("Business justification reason must be at least 10 characters.");
      return;
    }

    if (!operatorUserId.trim()) {
      setEmergencyError("Authorizing operator User ID is required.");
      return;
    }

    const selectedDoors = (doorsList || []).filter((d) =>
      selectedDoorCodes.includes(d.doorIndexCode),
    );
    const selectedDoorNames = selectedDoors.map((d) => d.doorName);

    setIsEmergencySubmitting(true);
    try {
      const res = await fetch(
        `/api/vms/active-visits/${emergencyVisit.visitId}/emergency-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCodes: selectedDoorCodes,
            doorNames: selectedDoorNames,
            durationHours,
            reason: emergencyReason.trim(),
            grantedByUserId: operatorUserId.trim(),
            grantedByName: operatorName.trim() || undefined,
            mode,
            stubScenario,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.errors?._global ||
          data.errors?.reason ||
          data.errors?.doorIndexCodes ||
          data.error?.message ||
          "Failed to grant emergency access.";
        setEmergencyError(msg);
        return;
      }

      setNotification({
        type: "success",
        message: `✓ Emergency access to ${selectedDoorNames.join(", ")} granted for ${emergencyVisit.visitor.fullName} (${durationHours}h).`,
      });

      if (data.grant) {
        setVisits((prev) =>
          prev.map((v) => {
            if (v.visitId !== emergencyVisit.visitId) return v;
            const currentGrants = v.emergencyGrants || [];
            return {
              ...v,
              emergencyGrants: [...currentGrants, data.grant],
            };
          }),
        );
      }

      closeEmergencyAccessModal();
    } catch (err) {
      setEmergencyError(
        err instanceof Error ? err.message : "Network error granting emergency access.",
      );
    } finally {
      setIsEmergencySubmitting(false);
    }
  };

  const handleRevokeEmergencyAccess = async (
    visit: ActiveVisitSummary,
    grant: EmergencyAccessGrant,
  ) => {
    const confirmed =
      typeof window !== "undefined" && window.confirm
        ? window.confirm(
            `Are you sure you want to revoke emergency access to ${grant.doorNames?.join(", ") || "doors"} for ${visit.visitor.fullName}? This takes effect immediately.`,
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
            mode,
            stubScenario,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to revoke emergency access.");
      }

      setNotification({
        type: "success",
        message: `✓ Emergency access to ${grant.doorNames?.join(", ") || "doors"} revoked for ${visit.visitor.fullName}.`,
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
        message: err instanceof Error ? err.message : "Failed to revoke emergency access.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation / API Mode Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-900">HikCentral Execution Mode:</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PreRegistrationMode)}
            className="rounded border border-neutral-300 bg-white px-2 py-1 font-medium text-neutral-800"
          >
            <option value="stub">Stub Mode (Local Simulation)</option>
            <option value="live">Live Client Mode (HikCentral Artemis Gateway)</option>
          </select>
          {mode === "stub" && (
            <select
              value={stubScenario}
              onChange={(e) => setStubScenario(e.target.value as StubScenario)}
              className="rounded border border-neutral-300 bg-white px-2 py-1 font-medium text-neutral-800"
            >
              <option value="success">Scenario: Success (200 code=0)</option>
              <option value="auth-error">Scenario: Auth Error (0x00072002)</option>
              <option value="network-error">Scenario: Network Offline (ECONNREFUSED)</option>
            </select>
          )}
        </div>
        <button
          onClick={refreshVisits}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "↻ Refresh On-Premise List"}
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
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
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
            Total On-Premise
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight">{stats.total}</span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "all" ? "text-neutral-400" : "text-neutral-500"}`}>
            Checked-in guests
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
            Normal Status
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
            {stats.normal}
          </span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "normal" ? "text-emerald-100" : "text-neutral-500"}`}>
            Within window & quota
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
              Overstay Alerts
            </span>
            {stats.overstay > 0 && activeTab !== "overstay" && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <span className={`mt-1 text-2xl font-bold tracking-tight ${activeTab === "overstay" ? "text-white" : "text-rose-700"}`}>
            {stats.overstay}
          </span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "overstay" ? "text-rose-100" : "text-rose-600"}`}>
            Past grace period
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
            Quota Warnings
          </span>
          <span className={`mt-1 text-2xl font-bold tracking-tight ${activeTab === "quota" ? "text-white" : "text-amber-800"}`}>
            {stats.quota}
          </span>
          <span className={`mt-0.5 text-[11px] ${activeTab === "quota" ? "text-amber-100" : "text-amber-700"}`}>
            Near / reached quota
          </span>
        </button>
      </div>

      {/* Facility & Search Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="min-w-[200px]">
            <label htmlFor="facilityFilter" className="sr-only">
              Filter by Facility
            </label>
            <select
              id="facilityFilter"
              value={selectedFacilityId}
              onChange={(e) => handleFacilityChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
            >
              <option value="all">All Facilities</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.timezone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[240px]">
            <label htmlFor="visitorSearch" className="sr-only">
              Search visitors
            </label>
            <input
              id="visitorSearch"
              type="search"
              placeholder="Search visitor name, host, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Tab Badges */}
        <div className="flex items-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0">
          {(["all", "normal", "overstay", "quota"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                activeTab === tab
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {tab}
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
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">No active visitors match filters</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {visits.length === 0
              ? "There are currently no checked-in visitors on-premise."
              : "Try adjusting your search query, facility selection, or active filter tab."}
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
                              ⚡ Fast-Track
                            </span>
                          )}
                        </h2>
                        {visit.visitorGroupName && (
                          <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200 mt-0.5">
                            👥 Group: {visit.visitorGroupName}
                          </span>
                        )}
                        <p className="text-xs text-neutral-500">
                          {visit.visitor.phone || visit.visitor.email || "No contact info"}
                          {visit.visitor.certificateNo && ` • ID: ${visit.visitor.certificateNo}`}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      {visit.isOverstay ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 animate-pulse">
                          ⚠️ {visit.overstayMinutes}m Overstay
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          ✓ On Schedule
                        </span>
                      )}

                      {visit.appointRecordId && (
                        <span className="text-[10px] font-mono text-neutral-400">
                          HC: {visit.appointRecordId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-y border-neutral-100 py-3">
                    <div>
                      <span className="text-neutral-400">Facility:</span>{" "}
                      <span className="font-semibold text-neutral-800">{visit.facility.name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Host:</span>{" "}
                      <span className="font-semibold text-neutral-800">{visit.host?.name || "Lobby Walk-in"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Checked-in:</span>{" "}
                      <span className="font-semibold text-neutral-800">{checkInFormatted}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Scheduled Departure:</span>{" "}
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
                        <span className="text-neutral-500 font-medium">📍 Current Location:</span>
                        <span className="font-semibold text-neutral-900">
                          {visit.lastSeenDoor.doorName || visit.lastSeenDoor.doorIndexCode}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          ({visit.lastSeenDoor.direction === "in" ? "Entry" : "Exit"} at{" "}
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
                          Dual-Direction
                        </span>
                      )}
                      {doorAccessType === "SINGLE_DIRECTION_IN" && (
                        <span
                          data-testid="directionality-badge-single"
                          className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200"
                        >
                          Single-Direction In
                        </span>
                      )}
                    </div>
                  )}

                  {/* Movement Breadcrumbs */}
                  {visit.movementBreadcrumbs && visit.movementBreadcrumbs.length > 0 && (
                    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-2.5">
                      <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 flex items-center gap-1">
                        <span>🧭 Movement Breadcrumbs</span>
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
                                  ({isImplicit ? "Implicit Exit" : crumb.direction === "in" ? "Entry" : "Exit"})
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
                            ? `${Math.floor(minsRemaining / 60)}h ${minsRemaining % 60}m remaining`
                            : `${minsRemaining}m remaining`;

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
                                  <span>🚨 Emergency Access:</span>
                                  <span>{grant.doorNames?.join(", ") || grant.doorIndexCodes?.join(", ")}</span>
                                </span>
                                {isActive && (
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                    {remainingLabel}
                                  </span>
                                )}
                                {isRevoked && (
                                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                    Revoked
                                  </span>
                                )}
                                {isExpired && !isRevoked && (
                                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                    Expired
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-600">
                                <span className="font-medium">Reason:</span> {grant.reason} •{" "}
                                <span className="font-medium">Expires:</span> {expiryFormatted} •{" "}
                                <span className="font-medium">By:</span> {grant.grantedByName || grant.grantedByUserId}
                              </p>
                            </div>

                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleRevokeEmergencyAccess(visit, grant)}
                                disabled={actionLoadingId === grant.id}
                                className="inline-flex items-center rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 active:bg-rose-100 disabled:opacity-50"
                              >
                                {actionLoadingId === grant.id ? "Revoking..." : "Revoke Access"}
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
                        <span>Turnstile Entry Taps:</span>
                      </span>
                      <span className="font-mono text-neutral-800 font-medium">
                        {visit.tapQuotaMode === "limited" ? (
                          <>
                            <strong className={visit.tapCount >= visit.maxTaps ? "text-rose-600" : "text-neutral-900"}>
                              {visit.tapCount}
                            </strong>{" "}
                            / {visit.maxTaps} Taps{" "}
                            {visit.tapCount >= visit.maxTaps ? (
                              <span className="text-rose-600 font-bold">(Exhausted)</span>
                            ) : (
                              <span className="text-neutral-400">
                                ({visit.maxTaps - visit.tapCount} left)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-emerald-700 font-semibold">
                            {visit.tapCount} Taps (Unlimited)
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
                    <button
                      onClick={() => handleSimulateTap(visit)}
                      disabled={isLoading}
                      title="Simulate turnstile badge tap against HikCentral acs/v1/door/events"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
                    >
                      <span>🚪 Simulate Door Tap (+1)</span>
                    </button>

                    {canGrantEmergency && (
                      <button
                        onClick={() => openEmergencyAccessModal(visit)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 active:bg-amber-200 disabled:opacity-50"
                      >
                        <span>🚨 Grant Emergency Access</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNormalCheckOut(visit)}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
                    >
                      {isLoading ? "Processing..." : "Check-out"}
                    </button>

                    <button
                      onClick={() => openForceCheckOutModal(visit)}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 active:bg-rose-200 disabled:opacity-50"
                    >
                      Force Check-out
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
                <span className="text-rose-600">⚠️</span> Force Check-out Visitor
              </h3>
              <button
                onClick={() => setForceVisit(null)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-neutral-50 p-3 text-xs">
                <p className="font-bold text-neutral-900">{forceVisit.visitor.fullName}</p>
                <p className="text-neutral-600">
                  Facility: {forceVisit.facility.name} • Host: {forceVisit.host?.name || "N/A"}
                </p>
                {forceVisit.isOverstay && (
                  <p className="mt-1 font-bold text-rose-700">
                    Overstay: {forceVisit.overstayMinutes} minutes past scheduled departure
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="securityReason" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Security Check-out Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="securityReason"
                  rows={3}
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  placeholder="Specify why visitor is being force checked out..."
                  className="w-full rounded-lg border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-rose-600 focus:outline-hidden"
                />
              </div>

              {/* Quick preset chips */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-neutral-500">Quick reasons:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Overstay grace period policy breach",
                    "Security escort off premises",
                    "Building closing / operational curfew",
                    "Unauthorized zone entry detected",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForceReason(preset)}
                      className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-200"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-900 border border-amber-200">
                <strong>Hardware Effect:</strong> Revokes all RFID turnstile cards, face recognition, and dynamic QR passes across physical access controllers immediately.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={() => setForceVisit(null)}
                disabled={isForceSubmitting}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmForceCheckOut}
                disabled={isForceSubmitting || !forceReason.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {isForceSubmitting ? "Revoking..." : "Revoke Access & Force Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Access Escalation Modal */}
      {emergencyVisit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergencyAccessTitle"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3
                id="emergencyAccessTitle"
                className="text-base font-bold text-neutral-900 flex items-center gap-2"
              >
                <span className="text-amber-600">🚨</span> Grant Time-Bounded Emergency Access
              </h3>
              <button
                type="button"
                onClick={closeEmergencyAccessModal}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Visitor summary */}
              <div className="rounded-lg bg-neutral-50 p-3 text-xs border border-neutral-100">
                <p className="font-bold text-neutral-900">{emergencyVisit.visitor.fullName}</p>
                <p className="text-neutral-600">
                  Facility: {emergencyVisit.facility.name} • Host: {emergencyVisit.host?.name || "N/A"}
                </p>
                <p className="text-neutral-500 mt-0.5">
                  Visit ID: <code className="font-mono text-[11px]">{emergencyVisit.visitId}</code>
                </p>
              </div>

              {/* Structured error banner */}
              {emergencyError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 flex items-start justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>⚠️ {emergencyError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmergencyError(null)}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Door Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Select Physical Doors <span className="text-rose-600">*</span>
                  <span className="ml-1 text-[11px] font-normal text-neutral-500">
                    (Filtered for {emergencyVisit.facility.name})
                  </span>
                </label>
                {availableEmergencyDoors.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-2 bg-neutral-50 rounded border">
                    No doors configured for this facility.
                  </p>
                ) : (
                  <div
                    data-testid="emergency-door-list"
                    className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 p-2"
                  >
                    {availableEmergencyDoors.map((door) => {
                      const isSelected = selectedDoorCodes.includes(door.doorIndexCode);
                      return (
                        <label
                          key={door.doorIndexCode}
                          className={`flex items-center justify-between rounded-md p-2 text-xs transition cursor-pointer ${
                            isSelected
                              ? "bg-amber-50/80 border border-amber-300"
                              : "hover:bg-neutral-50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleDoorSelection(door.doorIndexCode)}
                              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <p className="font-semibold text-neutral-900">{door.doorName}</p>
                              <p className="font-mono text-[10px] text-neutral-400">
                                {door.doorIndexCode}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              door.accessType === "DUAL_DIRECTION"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {door.accessType === "DUAL_DIRECTION"
                              ? "Dual-Direction"
                              : "Single-Direction In"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedDoorCodes.length > 0 && (
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {selectedDoorCodes.length} door{selectedDoorCodes.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Escalation Duration <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2" data-testid="duration-options">
                  {[1, 2, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setDurationHours(hrs)}
                      className={`rounded-lg border py-2 text-xs font-semibold transition ${
                        durationHours === hrs
                          ? "border-amber-600 bg-amber-600 text-white shadow-2xs"
                          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {hrs} Hour{hrs > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Justification Reason */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="emergencyReason" className="text-xs font-semibold text-neutral-800">
                    Business Justification <span className="text-rose-600">*</span>
                  </label>
                  <span
                    className={`text-[11px] ${
                      emergencyReason.trim().length >= 10
                        ? "text-emerald-600 font-semibold"
                        : "text-neutral-400"
                    }`}
                  >
                    {emergencyReason.trim().length}/10 min chars
                  </span>
                </div>
                <textarea
                  id="emergencyReason"
                  rows={3}
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Explain why temporary access escalation is required (min 10 chars)..."
                  className="w-full rounded-lg border border-neutral-300 p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-amber-600 focus:outline-hidden"
                />

                {/* Quick preset chips */}
                <div className="mt-1.5 space-y-1">
                  <span className="text-[10px] font-medium text-neutral-500">Quick reasons:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Urgent IT server room maintenance",
                      "Critical HVAC/electrical equipment repair",
                      "Vendor physical diagnostic investigation",
                      "Escorted contractor emergency access",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEmergencyReason(preset)}
                        className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-200"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Operator Information */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="operatorUserId" className="block text-xs font-semibold text-neutral-800 mb-1">
                    Authorizing Operator ID <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="operatorUserId"
                    type="text"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={operatorUserId}
                    onChange={(e) => setOperatorUserId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label htmlFor="operatorName" className="block text-xs font-semibold text-neutral-800 mb-1">
                    Operator Name
                  </label>
                  <input
                    id="operatorName"
                    type="text"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-900 border border-amber-200">
                <strong>Hardware Synchronization:</strong> Temporary door permissions will be synced immediately to HikCentral physical controllers and automatically expire after {durationHours} hour{durationHours > 1 ? "s" : ""}, or upon check-out.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={closeEmergencyAccessModal}
                disabled={isEmergencySubmitting}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmergencyAccess}
                disabled={isEmergencySubmitting}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
              >
                {isEmergencySubmitting ? "Granting Access..." : "Grant Emergency Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
