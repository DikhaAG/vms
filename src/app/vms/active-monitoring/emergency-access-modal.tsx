"use client";

import { useState, useMemo } from "react";
import type { PreRegistrationMode, StubScenario } from "@/lib/vms/vms-contract";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
} from "@/lib/vms/checkout-contract";
import { idDict } from "@/lib/vms/i18n/id";

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
  const [operatorName, setOperatorName] = useState("Petugas Keamanan");
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
      setError("Silakan pilih minimal satu pintu fisik.");
      return;
    }

    if (emergencyReason.trim().length < 10) {
      setError("Alasan justifikasi operasional minimal harus 10 karakter.");
      return;
    }

    if (!operatorUserId.trim()) {
      setError("ID Petugas Keamanan penanggung jawab wajib diisi.");
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
          "Gagal menerbitkan izin akses darurat.";
        setError(msg);
        return;
      }

      const summaryMessage = `✓ Izin akses darurat ke ${selectedDoorNames.join(", ")} berhasil diberikan untuk ${visit.visitor.fullName} (${durationHours} jam).`;
      onSuccess(data.grant, summaryMessage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan jaringan saat menerbitkan izin darurat.",
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
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
          <h3
            id="emergencyAccessTitle"
            className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2"
          >
            <span className="text-amber-600 dark:text-amber-400">🚨</span> Izin Akses Pintu Darurat Sementara
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-bold p-1 rounded-lg"
            aria-label="Tutup dialog"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Visitor summary */}
          <div className="rounded-lg bg-neutral-50 dark:bg-slate-800/60 p-3 text-xs border border-neutral-100 dark:border-slate-700/60">
            <p className="font-bold text-neutral-900 dark:text-white">{visit.visitor.fullName}</p>
            <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">
              Gedung: {visit.facility.name} • Tuan Rumah: {visit.host?.name || "N/A"}
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              ID Kunjungan: <code className="font-mono text-[11px]">{visit.visitId}</code>
            </p>
          </div>

          {/* Structured error banner */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 p-3 text-xs text-rose-900 dark:text-rose-200 flex items-start justify-between gap-2"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <span>⚠️ {error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 dark:text-rose-400"
              >
                ✕
              </button>
            </div>
          )}

          {/* Door Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              Pilih Pintu Fisik <span className="text-rose-600">*</span>
              <span className="ml-1 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                (Tersaring untuk {visit.facility.name})
              </span>
            </label>
            {availableDoors.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-2 bg-neutral-50 dark:bg-slate-800 rounded border border-neutral-200 dark:border-slate-700">
                Belum ada pintu yang dikonfigurasi untuk gedung ini.
              </p>
            ) : (
              <div
                data-testid="emergency-door-list"
                className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-slate-800 p-2"
              >
                {availableDoors.map((door) => {
                  const isSelected = selectedDoorCodes.includes(door.doorIndexCode);
                  return (
                    <label
                      key={door.doorIndexCode}
                      className={`flex items-center justify-between rounded-md p-2 text-xs transition cursor-pointer ${
                        isSelected
                          ? "bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700"
                          : "hover:bg-neutral-50 dark:hover:bg-slate-800 border border-transparent"
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
                          <p className="font-semibold text-neutral-900 dark:text-white">{door.doorName}</p>
                          <p className="font-mono text-[10px] text-neutral-400">
                            {door.doorIndexCode}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          door.accessType === "DUAL_DIRECTION"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {door.accessType === "DUAL_DIRECTION"
                          ? "Pintu Dua Arah"
                          : "Pintu Masuk Saja"}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {selectedDoorCodes.length > 0 && (
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                {selectedDoorCodes.length} pintu fisik dipilih
              </p>
            )}
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              Durasi Izin Akses Darurat <span className="text-rose-600">*</span>
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
                      : "border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {hrs} Jam
                </button>
              ))}
            </div>
          </div>

          {/* Justification Reason */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="emergencyReason" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Alasan Justifikasi Operasional <span className="text-rose-600">*</span>
              </label>
              <span
                className={`text-[11px] ${
                  emergencyReason.trim().length >= 10
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-neutral-400"
                }`}
              >
                {emergencyReason.trim().length}/10 min karakter
              </span>
            </div>
            <textarea
              id="emergencyReason"
              rows={3}
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              placeholder="Jelaskan alasan mengapa eskalasi akses darurat diperlukan (min 10 karakter)..."
              className="w-full rounded-lg border border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-amber-600 focus:outline-hidden"
            />

            {/* Quick preset chips */}
            <div className="mt-1.5 space-y-1">
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">Pilihan Cepat:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  "Pemeliharaan darurat ruang server TI",
                  "Perbaikan mendesak sistem pendingin/kelistrikan",
                  "Pemeriksaan fisik diagnostik perangkat vendor",
                  "Akses darurat kontraktor dengan pendampingan",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setEmergencyReason(preset)}
                    className="rounded border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
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
              <label htmlFor="operatorUserId" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                ID Petugas Keamanan <span className="text-rose-600">*</span>
              </label>
              <input
                id="operatorUserId"
                type="text"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={operatorUserId}
                onChange={(e) => setOperatorUserId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-1.5 text-xs text-neutral-900 focus:border-amber-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="operatorName" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Nama Petugas Keamanan
              </label>
              <input
                id="operatorName"
                type="text"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-1.5 text-xs text-neutral-900 focus:border-amber-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
            <strong>Sinkronisasi Perangkat Pintu:</strong> Izin akses darurat sementara akan disinkronkan ke pengontrol pintu fisik (HikCentral) dan otomatis dicabut setelah {durationHours} jam, atau saat tamu check-out.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
          >
            {idDict.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Menyinkronkan Akses..." : "Berikan Izin Akses Darurat"}
          </button>
        </div>
      </div>
    </div>
  );
}
