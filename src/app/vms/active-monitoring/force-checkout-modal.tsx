"use client";

import React, { useState, useRef } from "react";
import type { ActiveVisitSummary } from "@/lib/vms/checkout-contract";
import { useModalFocusTrap } from "@/components/vms/use-modal-focus-trap";

export interface ForceCheckoutModalProps {
  visit: ActiveVisitSummary | null;
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const FORCE_CHECKOUT_PRESETS = [
  "Melewati batas toleransi waktu kunjungan (Overstay)",
  "Didampingi petugas keamanan meninggalkan gedung",
  "Jam operasional gedung berakhir (Jam Malam)",
  "Terdeteksi masuk ke area terlarang / tanpa izin",
] as const;

export function ForceCheckoutModal({
  visit,
  isOpen,
  isSubmitting = false,
  onClose,
  onConfirm,
}: ForceCheckoutModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState(() =>
    visit?.isOverstay
      ? `Batas waktu toleransi kunjungan (grace period) terlewati ${visit.overstayMinutes} menit`
      : "",
  );

  useModalFocusTrap({
    ref: modalRef,
    isOpen,
    onClose,
  });

  if (!isOpen || !visit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Harap cantumkan alasan keamanan untuk melakukan check-out paksa.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-checkout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ks-ink)]/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-2xl text-[var(--ks-text)]">
        <div className="flex items-center justify-between border-b border-[var(--ks-rule-subtle)] pb-3">
          <h3
            id="force-checkout-title"
            className="text-base font-bold text-[var(--ks-ink)] flex items-center gap-2"
          >
            Check-Out Paksa Tamu
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ks-muted)] hover:text-[var(--ks-ink)] p-1 rounded-lg cursor-pointer transition-colors"
            aria-label="Tutup dialog"
          >
            <svg
              className="w-5 h-5"
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="rounded-lg bg-[var(--ks-paper-deep)] p-3 text-xs border border-[var(--ks-rule-subtle)]">
            <p className="font-bold text-[var(--ks-ink)]">
              {visit.visitor.fullName}
            </p>
            <p className="text-[var(--ks-muted)]">
              Gedung: {visit.facility.name} • Tuan Rumah:{" "}
              {visit.host?.name || "N/A"}
            </p>
            {visit.isOverstay && (
              <p className="mt-1 font-bold text-[var(--ks-vermilion)]">
                Kunjungan Melebihi Waktu (Overstay): Melewati jadwal keluar sebesar{" "}
                {visit.overstayMinutes} menit
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="securityReason"
              className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1"
            >
              Alasan Keamanan Check-Out Paksa{" "}
              <span className="text-[var(--ks-vermilion)]">*</span>
            </label>
            <textarea
              id="securityReason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cantumkan alasan detail check-out paksa tamu..."
              className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] p-2.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-vermilion)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-vermilion)]"
            />
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1">
            <span className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)]">
              Pilihan alasan cepat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FORCE_CHECKOUT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="rounded border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-2xs font-medium text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[var(--ks-kinpaku)]/10 p-3 text-2xs text-[var(--ks-ink)] border border-[var(--ks-kinpaku)]/30">
            <strong>Dampak Perangkat Fisik:</strong> Langsung mencabut seluruh izin
            kartu RFID, pencocokan biometrik wajah, dan kode QR dinamis di
            seluruh controller pintu fisik seketika.
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--ks-rule-subtle)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ks-btn rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="ks-btn rounded-lg bg-[var(--ks-vermilion)] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-xs hover:brightness-110 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {isSubmitting
                ? "Mencabut izin..."
                : "Cabut Izin Akses & Eksekusi Check-Out Paksa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
