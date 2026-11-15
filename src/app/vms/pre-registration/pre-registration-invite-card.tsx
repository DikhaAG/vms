"use client";

import React from "react";
import { UiBadge, UiButton, UiCard } from "@/components/vms/ui";

export interface PreRegistrationInviteCardProps {
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
}

export function PreRegistrationInviteCard({
  inviteUrl,
  copied,
  onCopy,
}: PreRegistrationInviteCardProps) {
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${inviteUrl}`
      : inviteUrl;

  return (
    <UiCard
      aria-label="Tautan Pendaftaran Mandiri Tamu"
      className="border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 p-5 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ks-ink)] text-xs font-bold text-[var(--ks-paper-raised)]">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </span>
          <h2 className="text-sm font-bold text-[var(--ks-ink)]">
            Tautan Pendaftaran Mandiri Berhasil Dibuat
          </h2>
        </div>
        <UiBadge variant="default" showDot={false}>
          Satu Kali Pakai • Memiliki Batas Waktu
        </UiBadge>
      </div>

      <p className="mt-2 text-xs text-[var(--ks-text)]">
        Bagikan tautan ini kepada tamu Anda. Tamu dapat membukanya melalui
        smartphone atau laptop untuk memeriksa jadwal, mengisi data diri, dan
        mengunggah foto selfie biometrik sebelum tiba di lokasi.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          readOnly
          aria-label="Tautan Pendaftaran Mandiri Tamu"
          value={fullUrl}
          className="flex-1 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3 py-2 font-mono text-xs text-[var(--ks-ink)] shadow-xs focus:border-[var(--ks-edge)] focus:outline-hidden"
        />
        <div className="flex gap-2">
          <UiButton
            type="button"
            variant="primary"
            size="sm"
            onClick={onCopy}
          >
            {copied ? "Berhasil Disalin!" : "Salin Tautan"}
          </UiButton>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            className="ks-btn inline-flex items-center justify-center font-semibold rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] px-3.5 py-1.5 text-xs sm:text-sm min-h-9 shadow-xs"
          >
            Buka Portal
          </a>
        </div>
      </div>
    </UiCard>
  );
}
