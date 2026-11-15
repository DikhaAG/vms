"use client";

import React from "react";
import Image from "next/image";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import {
  CERTIFICATE_TYPE_LABELS,
  type CertificateType,
} from "@/lib/vms/vms-contract";
import { idDict } from "@/lib/vms/i18n/id";
import { UiModal, UiButton, UiBadge } from "@/components/vms/ui";

export interface VisitorDetailsModalProps {
  isOpen: boolean;
  profile: VisitorProfile | null;
  onClose: () => void;
  onSoftDelete?: (profile: VisitorProfile) => void;
  onRestore?: (profileId: string) => void;
}

export function VisitorDetailsModal({
  isOpen,
  profile,
  onClose,
  onSoftDelete,
  onRestore,
}: VisitorDetailsModalProps) {
  if (!profile) return null;

  const certLabel = profile.certificateType
    ? (idDict.certificateTypes[profile.certificateType as CertificateType] ??
      CERTIFICATE_TYPE_LABELS[profile.certificateType as CertificateType])
    : "Identitas";

  return (
    <UiModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rincian & Arsip Profil Tamu"
      description="Informasi identitas biometrik dan kepatuhan privasi data PDP"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {profile.isDeleted ? (
              <UiButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  onRestore?.(profile.id);
                  onClose();
                }}
              >
                Pulihkan Status Aktif
              </UiButton>
            ) : (
              <UiButton
                variant="danger"
                size="sm"
                onClick={() => {
                  onSoftDelete?.(profile);
                  onClose();
                }}
              >
                Hapus PDP (Soft-Delete)
              </UiButton>
            )}
          </div>
          <UiButton variant="secondary" size="md" onClick={onClose}>
            Tutup
          </UiButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Avatar and Basic Profile */}
        <div className="flex items-center gap-4 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)]/50 p-3.5">
          {profile.facePhoto ? (
            <Image
              src={profile.facePhoto}
              alt={profile.fullName}
              width={56}
              height={56}
              className="rounded-full object-cover border border-[var(--ks-rule-subtle)]"
              unoptimized
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] text-lg font-bold text-[var(--ks-ink)]">
              {profile.givenName?.[0] || profile.fullName[0]}
            </div>
          )}
          <div>
            <h4 className="text-base font-semibold text-[var(--ks-ink)]">
              {profile.fullName}
            </h4>
            <p className="text-xs font-mono text-[var(--ks-muted)]">
              ID Profil: {profile.id}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {profile.isDeleted ? (
                <UiBadge variant="warning" label="Arsip Terhapus Halus" />
              ) : (
                <UiBadge variant="normal" label="Profil Aktif Terdaftar" />
              )}
            </div>
          </div>
        </div>

        {/* Identity & Contact Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-3">
            <span className="text-[var(--ks-muted)] font-medium">
              Jenis Identitas
            </span>
            <p className="mt-0.5 font-semibold text-[var(--ks-ink)]">
              {certLabel}
            </p>
          </div>

          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-3">
            <span className="text-[var(--ks-muted)] font-medium">
              Nomor Tanda Pengenal
            </span>
            <p className="mt-0.5 font-mono font-semibold text-[var(--ks-ink)]">
              {profile.certificateNo}
            </p>
          </div>

          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-3">
            <span className="text-[var(--ks-muted)] font-medium">
              Nomor Telepon
            </span>
            <p className="mt-0.5 font-mono text-[var(--ks-ink)]">
              {profile.phone || "-"}
            </p>
          </div>

          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-3">
            <span className="text-[var(--ks-muted)] font-medium">
              Alamat Email
            </span>
            <p className="mt-0.5 text-[var(--ks-ink)]">
              {profile.email || "-"}
            </p>
          </div>

          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-3">
            <span className="text-[var(--ks-muted)] font-medium">
              Total Riwayat Kunjungan
            </span>
            <p className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--ks-ink)]">
              {profile.visitCount ?? 0} kali
            </p>
          </div>

          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-3">
            <span className="text-[var(--ks-muted)] font-medium">
              Tanggal Pembuatan
            </span>
            <p className="mt-0.5 font-mono text-[var(--ks-ink)]">
              {profile.createdAtUtc
                ? new Date(profile.createdAtUtc).toLocaleDateString("id-ID")
                : "-"}
            </p>
          </div>
        </div>

        {/* Deletion / Compliance Reason */}
        {profile.isDeleted && profile.deletionReason && (
          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-amber)]/30 bg-[var(--ks-amber)]/10 p-3 text-xs">
            <span className="font-semibold text-[var(--ks-ink)]">
              Catatan Kepatuhan PDP / Alasan Pengarsipan:
            </span>
            <p className="mt-1 text-[var(--ks-text)]">
              {profile.deletionReason}
            </p>
          </div>
        )}
      </div>
    </UiModal>
  );
}
