"use client";

import React, { useState } from "react";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import { UiModal, UiButton } from "@/components/vms/ui";

export interface SoftDeleteModalProps {
  isOpen: boolean;
  profile: VisitorProfile | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function SoftDeleteModal({
  isOpen,
  profile,
  isLoading = false,
  onClose,
  onConfirm,
}: SoftDeleteModalProps) {
  const [deleteReason, setDeleteReason] = useState(
    "Permintaan penghapusan data pribadi oleh pemilik identitas sesuai kepatuhan UU PDP"
  );

  return (
    <UiModal
      isOpen={isOpen}
      onClose={onClose}
      title="Arsipkan Profil Tamu (Kepatuhan PDP)"
      description={
        profile ? (
          <span>
            Arsipkan data biometrik dan data pribadi untuk{" "}
            <strong className="text-[var(--ks-ink)] font-semibold">
              {profile.fullName}
            </strong>{" "}
            (No: {profile.certificateNo}). Tindakan ini menonaktifkan fitur
            pengenalan otomatis untuk tamu kembali, dengan tetap menjaga keutuhan
            log riwayat audit keamanan.
          </span>
        ) : undefined
      }
      footer={
        <>
          <UiButton
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </UiButton>
          <UiButton
            variant="danger"
            size="md"
            disabled={isLoading || !profile}
            isLoading={isLoading}
            onClick={() => onConfirm(deleteReason)}
          >
            Konfirmasi Hapus PDP
          </UiButton>
        </>
      }
    >
      <div>
        <label
          htmlFor="complianceDeleteReason"
          className="block text-xs font-semibold text-[var(--ks-ink)]"
        >
          Alasan Kepatuhan / Permintaan Penghapusan Data
        </label>
        <textarea
          id="complianceDeleteReason"
          rows={3}
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] bg-[var(--ks-paper)] p-2.5 text-xs text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-patina-deep)] focus:outline-hidden"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
    </UiModal>
  );
}
