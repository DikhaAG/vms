"use client";

import { useState, useMemo } from "react";
import type { PreRegistrationMode, StubScenario } from "@/lib/vms/vms-contract";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
} from "@/lib/vms/checkout-contract";

export interface EmergencyAccessModalProps {
  visit: ActiveVisitSummary | null;
  doors: FacilityDoor[];
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  onClose: () => void;
  onSuccess: (grant: EmergencyAccessGrant, notificationMessage: string) => void;
}

export function EmergencyAccessModal({
  visit,
  doors,
  mode = "stub",
  stubScenario = "success",
  onClose,
  onSuccess,
}: EmergencyAccessModalProps) {
  const [selectedDoorCodes, setSelectedDoorCodes] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [operatorUserId, setOperatorUserId] = useState("sec-officer-01");
  const [operatorName, setOperatorName] = useState("Security Officer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableDoors = useMemo(() => {
    if (!visit) return [];
    return (doors || []).filter(
      (door) => !door.facilityId || door.facilityId === visit.facility.id,
    );
  }, [doors, visit]);

  if (!visit) return null;

  const handleToggleDoor = (doorCode: string) => {
    setSelectedDoorCodes((prev) =>
      prev.includes(doorCode) ? prev.filter((c) => c !== doorCode) : [...prev, doorCode],
    );
  };

  const handleConfirm = async () => {
    setError(null);

    if (selectedDoorCodes.length === 0) {
      setError("Please select at least one physical door.");
      return;
    }

    if (emergencyReason.trim().length < 10) {
      setError("Business justification reason must be at least 10 characters.");
      return;
    }

    if (!operatorUserId.trim()) {
      setError("Authorizing operator User ID is required.");
      return;
    }

    const selectedDoors = (doors || []).filter((d) =>
      selectedDoorCodes.includes(d.doorIndexCode),
    );
    const selectedDoorNames = selectedDoors.map((d) => d.doorName);

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/vms/active-visits/${visit.visitId}/emergency-access`,
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
        setError(msg);
        return;
      }

      const summaryMessage = `✓ Emergency access to ${selectedDoorNames.join(", ")} granted for ${visit.visitor.fullName} (${durationHours}h).`;
      onSuccess(data.grant, summaryMessage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error granting emergency access.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Visitor summary */}
          <div className="rounded-lg bg-neutral-50 p-3 text-xs border border-neutral-100">
            <p className="font-bold text-neutral-900">{visit.visitor.fullName}</p>
            <p className="text-neutral-600">
              Facility: {visit.facility.name} • Host: {visit.host?.name || "N/A"}
            </p>
            <p className="text-neutral-500 mt-0.5">
              Visit ID: <code className="font-mono text-[11px]">{visit.visitId}</code>
            </p>
          </div>

          {/* Structured error banner */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 flex items-start justify-between gap-2"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <span>⚠️ {error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
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
                (Filtered for {visit.facility.name})
              </span>
            </label>
            {availableDoors.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-2 bg-neutral-50 rounded border">
                No doors configured for this facility.
              </p>
            ) : (
              <div
                data-testid="emergency-door-list"
                className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 p-2"
              >
                {availableDoors.map((door) => {
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
                          onChange={() => handleToggleDoor(door.doorIndexCode)}
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
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmitting ? "Granting Access..." : "Grant Emergency Access"}
          </button>
        </div>
      </div>
    </div>
  );
}
