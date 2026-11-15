"use client";

import { useState, useMemo, useRef } from "react";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
} from "@/lib/vms/checkout-contract";
import { idDict } from "@/lib/vms/i18n/id";
import { useModalFocusTrap } from "@/components/vms/use-modal-focus-trap";

export interface EmergencyAccessModalProps {
  visit: ActiveVisitSummary | null;
  doors: FacilityDoor[];
  onClose: () => void;
  onSuccess: (grant: EmergencyAccessGrant, notificationMessage: string) => void;
}

export function EmergencyAccessModal({
  visit,
  doors,
  onClose,
  onSuccess,
}: EmergencyAccessModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedDoorCodes, setSelectedDoorCodes] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [operatorUserId, setOperatorUserId] = useState("sec-officer-01");
  const [operatorName, setOperatorName] = useState("Petugas Keamanan");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalFocusTrap({
    ref: modalRef,
    isOpen: Boolean(visit),
    onClose,
  });

  const availableDoors = useMemo(() => {
    if (!visit) return [];
    return (doors || []).filter(
      (door) => !door.facilityId || door.facilityId === visit.facility.id,
    );
  }, [doors, visit]);

  if (!visit) return null;

  const handleToggleDoor = (doorCode: string) => {
    setSelectedDoorCodes((prev) =>
      prev.includes(doorCode)
        ? prev.filter((c) => c !== doorCode)
        : [...prev, doorCode],
    );
  };

  const selectedDoors = (doors || []).filter((d) =>
    selectedDoorCodes.includes(d.doorIndexCode),
  );
  const selectedDoorNames = selectedDoors.map((d) => d.doorName);

  const handlePreConfirm = () => {
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

    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    setError(null);
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
        setIsConfirming(false);
        return;
      }

      const receiptId = (data.grant?.id || "").slice(0, 8);
      const summaryMessage = `Izin akses darurat ke ${selectedDoorNames.join(", ")} berhasil diberikan untuk ${visit.visitor.fullName} (${durationHours} jam). Bukti Transaksi Gateway: #${receiptId || "OK"}.`;
      onSuccess(data.grant, summaryMessage);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan jaringan saat menerbitkan izin darurat.",
      );
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergencyAccessTitle"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ks-ink)]/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-[var(--ks-text)]">
        <div className="flex items-center justify-between border-b border-[var(--ks-rule-subtle)] pb-3">
          <h3
            id="emergencyAccessTitle"
            className="text-base font-bold text-[var(--ks-ink)] flex items-center gap-2"
          >
            <span className="text-[var(--ks-kinpaku)]">🛡️</span>
            Izin Akses Pintu Darurat Sementara
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ks-muted)] hover:text-[var(--ks-ink)] transition-colors cursor-pointer"
            aria-label="Tutup dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-[var(--ks-vermilion)]/10 p-3 text-xs text-[var(--ks-vermilion)] border border-[var(--ks-vermilion)]/30 font-medium"
          >
            {error}
          </div>
        )}

        {isConfirming ? (
          /* Confirmation Screen */
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/10 p-4 text-xs text-[var(--ks-ink)]">
              <h4 className="font-bold flex items-center gap-1.5 text-sm text-[var(--ks-vermilion)]">
                <span>⚠️</span> Konfirmasi Pembukaan Akses Pintu Fisik
              </h4>
              <p className="mt-2 leading-relaxed">
                Tindakan ini akan <strong>langsung mengirimkan sinyal kontrol hardware</strong> ke server HikCentral untuk mengizinkan akses pintu fisik bagi <strong>{visit.visitor.fullName}</strong>:
              </p>
              <ul className="mt-2 list-disc list-inside font-semibold space-y-0.5">
                {selectedDoorNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-[var(--ks-muted)]">
                Durasi Akses: {durationHours} Jam • Petugas Penanggung Jawab: {operatorName} ({operatorUserId})
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--ks-rule-subtle)] pt-4">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="ks-btn rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer transition-colors"
              >
                Kembali / Ubah
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="ks-btn rounded-lg bg-[var(--ks-vermilion)] hover:brightness-110 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Mengirim Sinyal Hardware..." : "Ya, Eksekusi Buka Pintu Sekarang"}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Configuration Screen */
          <>
            <div className="mt-4 space-y-4">
              {/* Visitor Summary Banner */}
              <div className="rounded-xl bg-[var(--ks-paper-deep)] p-3 text-xs border border-[var(--ks-rule-subtle)]">
                <p className="font-bold text-[var(--ks-ink)]">
                  {visit.visitor.fullName}
                </p>
                <p className="text-[var(--ks-muted)] mt-0.5">
                  Fasilitas: <span className="font-medium text-[var(--ks-ink)]">{visit.facility.name}</span> • Tuan Rumah: {visit.host?.name || "N/A"}
                </p>
                <p className="text-[11px] text-[var(--ks-muted)] mt-1">
                  Keperluan: {visit.visitReason}
                </p>
              </div>

              {/* Door Selection List */}
              <div>
                <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1.5">
                  Pilih Pintu Fisik yang Dibuka Aksesnya <span className="text-[var(--ks-vermilion)]">*</span>
                </label>
                {availableDoors.length === 0 ? (
                  <p className="text-xs text-[var(--ks-muted)] italic">
                    Tidak ada pintu terdaftar untuk fasilitas ini.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] p-2">
                    {availableDoors.map((door) => {
                      const isSelected = selectedDoorCodes.includes(door.doorIndexCode);
                      return (
                        <label
                          key={door.doorIndexCode}
                          className={`flex items-center justify-between rounded-md p-2 text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)] font-semibold border border-[var(--ks-kinpaku)]/30"
                              : "hover:bg-[var(--ks-paper-deep)] text-[var(--ks-text)] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleDoor(door.doorIndexCode)}
                              className="accent-[var(--ks-kinpaku)]"
                            />
                            <span>{door.doorName}</span>
                          </div>
                          <span className="text-[10px] text-[var(--ks-muted)] font-mono">
                            {door.accessType === "SINGLE_DIRECTION_IN" ? "1-Arah In" : "2-Arah"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Duration Slider / Select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="durationHours" className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)]">
                    Durasi Izin Darurat
                  </label>
                  <span className="text-xs font-bold text-[var(--ks-ink)] font-mono">
                    {durationHours} Jam
                  </span>
                </div>
                <input
                  id="durationHours"
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full accent-[var(--ks-kinpaku)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--ks-muted)] font-mono mt-0.5">
                  <span>1 Jam</span>
                  <span>4 Jam</span>
                  <span>8 Jam</span>
                  <span>12 Jam</span>
                </div>
              </div>

              {/* Justification Reason */}
              <div>
                <label htmlFor="emergencyReason" className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                  Alasan Justifikasi Operasional <span className="text-[var(--ks-vermilion)]">*</span>
                </label>
                <textarea
                  id="emergencyReason"
                  rows={2}
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="cth. Kunjungan darurat perbaikan server dan panel listrik lantai 3..."
                  className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] p-2.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                />
              </div>

              {/* Operator Responsible */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="operatorUserId" className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    ID Petugas Keamanan <span className="text-[var(--ks-vermilion)]">*</span>
                  </label>
                  <input
                    id="operatorUserId"
                    type="text"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={operatorUserId}
                    onChange={(e) => setOperatorUserId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>
                <div>
                  <label htmlFor="operatorName" className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
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
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-[var(--ks-kinpaku)]/10 p-2.5 text-2xs text-[var(--ks-ink)] border border-[var(--ks-kinpaku)]/30">
                <strong>Sinkronisasi Perangkat Pintu:</strong> Izin akses darurat sementara akan disinkronkan ke pengontrol pintu fisik (HikCentral) dan otomatis dicabut setelah {durationHours} jam, atau saat tamu check-out.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--ks-rule-subtle)] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="ks-btn rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] transition-colors cursor-pointer"
              >
                {idDict.common.cancel}
              </button>
              <button
                type="button"
                onClick={handlePreConfirm}
                className="ks-btn rounded-lg bg-[var(--ks-ink)] hover:brightness-110 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ks-paper-raised)] shadow-xs transition-colors cursor-pointer"
              >
                Lanjutkan Otorisasi Pintu
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
