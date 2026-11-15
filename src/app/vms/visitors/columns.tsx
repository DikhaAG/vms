"use client";

import React from "react";
import Image from "next/image";
import { createColumnHelper } from "@tanstack/react-table";
import type { UiTableFeatures, UiTableColumnDef } from "@/components/vms/ui";
import { UiBadge, UiButton } from "@/components/vms/ui";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import {
  CERTIFICATE_TYPE_LABELS,
  type CertificateType,
} from "@/lib/vms/vms-contract";
import { idDict } from "@/lib/vms/i18n/id";

export type Visitor = VisitorProfile;

export function getCertificateTypeLabel(type?: number): string {
  if (!type) return "Identitas";
  return (
    idDict.certificateTypes[type as CertificateType] ??
    CERTIFICATE_TYPE_LABELS[type as CertificateType] ??
    "Identitas"
  );
}

export interface VisitorColumnOptions {
  loadingId?: string | null;
  onSoftDelete: (profile: Visitor) => void;
  onRestore: (profileId: string) => void;
  onInspect?: (profile: Visitor) => void;
}

export function createVisitorColumns({
  loadingId,
  onSoftDelete,
  onRestore,
  onInspect,
}: VisitorColumnOptions): UiTableColumnDef<Visitor>[] {
  const columnHelper = createColumnHelper<UiTableFeatures, Visitor>();

  return [
    columnHelper.accessor("fullName", {
      id: "fullName",
      header: "Nama Tamu",
      enableSorting: true,
      cell: (info) => {
        const profile = info.row.original;
        return (
          <div className="flex items-center gap-3">
            {profile.facePhoto ? (
              <Image
                src={profile.facePhoto}
                alt={profile.fullName}
                width={36}
                height={36}
                className="rounded-full object-cover border border-[var(--ks-rule-subtle)]"
                unoptimized
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] text-xs font-bold text-[var(--ks-ink)]">
                {profile.givenName?.[0] || profile.fullName[0]}
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => onInspect?.(profile)}
                className="text-left font-semibold text-[var(--ks-ink)] hover:text-[var(--ks-gold)] hover:underline cursor-pointer"
                title="Buka rincian identitas tamu"
              >
                {profile.fullName}
              </button>
              <p className="text-[11px] font-mono text-[var(--ks-muted)]">
                {profile.id}
              </p>
            </div>
          </div>
        );
      },
    }),

    columnHelper.accessor("certificateNo", {
      id: "certificateNo",
      header: "Tanda Pengenal (NIK/Paspor)",
      enableSorting: true,
      cell: (info) => {
        const profile = info.row.original;
        return (
          <div>
            <p className="text-xs font-semibold text-[var(--ks-ink)]">
              {getCertificateTypeLabel(profile.certificateType)}
            </p>
            <p className="font-mono text-xs text-[var(--ks-muted)]">
              {profile.certificateNo}
            </p>
          </div>
        );
      },
    }),

    columnHelper.accessor(
      (row) => `${row.phone ?? ""} ${row.email ?? ""}`.trim(),
      {
        id: "contact",
        header: "Kontak",
        enableSorting: false,
        cell: (info) => {
          const profile = info.row.original;
          return (
            <div className="text-xs">
              {profile.phone && (
                <p className="text-[var(--ks-ink)] font-mono">
                  {profile.phone}
                </p>
              )}
              {profile.email && (
                <p className="text-[var(--ks-muted)]">{profile.email}</p>
              )}
              {!profile.phone && !profile.email && (
                <span className="text-[var(--ks-muted)]">-</span>
              )}
            </div>
          );
        },
      }
    ),

    columnHelper.accessor((row) => row.visitCount ?? 0, {
      id: "visitCount",
      header: "Total Kunjungan",
      enableSorting: true,
      cell: (info) => (
        <div className="text-center">
          <span className="inline-block rounded-full bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] px-2 py-0.5 text-xs font-semibold font-mono tabular-nums text-[var(--ks-ink)]">
            {info.getValue()}
          </span>
        </div>
      ),
    }),

    columnHelper.accessor("createdAtUtc", {
      id: "createdAtUtc",
      header: "Tanggal Registrasi",
      enableSorting: true,
      cell: (info) => {
        const dateStr = info.getValue();
        return (
          <span className="font-mono text-xs text-[var(--ks-muted)] tabular-nums">
            {dateStr
              ? new Date(dateStr).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "-"}
          </span>
        );
      },
    }),

    columnHelper.accessor("isDeleted", {
      id: "isDeleted",
      header: "Status Kepatuhan PDP",
      enableSorting: true,
      cell: (info) => {
        const profile = info.row.original;
        return profile.isDeleted ? (
          <div>
            <UiBadge
              variant="warning"
              label="Terhapus Halus / Diarsipkan"
            />
            {profile.deletionReason && (
              <p
                className="mt-1 text-[11px] text-[var(--ks-muted)] max-w-[200px] truncate"
                title={profile.deletionReason}
              >
                {profile.deletionReason}
              </p>
            )}
          </div>
        ) : (
          <UiBadge variant="normal" label="Aktif (Tersimpan PDP)" />
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Aksi Tindakan</div>,
      cell: (info) => {
        const profile = info.row.original;
        const isLoading = loadingId === profile.id;
        return (
          <div className="text-right">
            {profile.isDeleted ? (
              <UiButton
                variant="secondary"
                size="sm"
                disabled={isLoading}
                isLoading={isLoading}
                onClick={() => onRestore(profile.id)}
              >
                Pulihkan
              </UiButton>
            ) : (
              <UiButton
                variant="danger"
                size="sm"
                disabled={isLoading}
                onClick={() => onSoftDelete(profile)}
              >
                Hapus PDP
              </UiButton>
            )}
          </div>
        );
      },
    }),
  ] as unknown as UiTableColumnDef<Visitor>[];
}
