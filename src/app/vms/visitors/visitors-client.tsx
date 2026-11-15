"use client";

import React, { useState, useMemo, useCallback } from "react";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import {
  UiKpiCard,
  UiKpiGrid,
  UiDataTable,
  useTableUrlState,
  UiButton,
} from "@/components/vms/ui";
import { createVisitorColumns, type Visitor } from "./columns";
import { SoftDeleteModal } from "./soft-delete-modal";
import { VisitorDetailsModal } from "./visitor-details-modal";

export interface VisitorsClientProps {
  initialProfiles: VisitorProfile[];
}

export function VisitorsClient({ initialProfiles }: VisitorsClientProps) {
  const [profiles, setProfiles] = useState<VisitorProfile[]>(initialProfiles);
  const [showDeleted, setShowDeleted] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Soft-delete modal state
  const [selectedForDelete, setSelectedForDelete] =
    useState<VisitorProfile | null>(null);

  // Visitor inspection modal state
  const [inspectedProfile, setInspectedProfile] =
    useState<VisitorProfile | null>(null);

  // nuqs URL synchronization hook (?q=..., ?page=..., ?sort=..., ?order=...)
  const urlState = useTableUrlState({
    searchKey: "q",
    pageKey: "page",
    pageSizeKey: "pageSize",
    sortKey: "sort",
    orderKey: "order",
    defaultPageSize: 10,
    defaultSort: [{ id: "fullName", desc: false }],
  });

  const activeCount = profiles.filter((p) => !p.isDeleted).length;
  const deletedCount = profiles.filter((p) => p.isDeleted).length;

  const displayProfiles = useMemo(() => {
    if (showDeleted) return profiles;
    return profiles.filter((p) => !p.isDeleted);
  }, [profiles, showDeleted]);

  const handleSoftDelete = useCallback(
    async (profileId: string, isDeleted: boolean, reason?: string) => {
      setLoadingId(profileId);
      setFeedback(null);

      try {
        const res = await fetch(`/api/vms/visitors/${profileId}/soft-delete`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDeleted, reason }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          setFeedback({
            type: "error",
            message:
              data.error?.message || "Gagal memperbarui status profil tamu.",
          });
          return;
        }

        const updatedProfile: VisitorProfile = data.profile;
        setProfiles((prev) =>
          prev.map((p) => (p.id === profileId ? updatedProfile : p))
        );

        // If currently inspected, update modal state
        setInspectedProfile((prev) =>
          prev?.id === profileId ? updatedProfile : prev
        );

        setFeedback({
          type: "success",
          message: isDeleted
            ? `Profil untuk ${updatedProfile.fullName} berhasil diarsipkan (soft-delete) sesuai UU PDP.`
            : `Profil untuk ${updatedProfile.fullName} berhasil dipulihkan kembali ke status aktif.`,
        });

        setSelectedForDelete(null);
      } catch (err) {
        setFeedback({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Terjadi gangguan jaringan saat memproses permintaan.",
        });
      } finally {
        setLoadingId(null);
      }
    },
    []
  );

  const columns = useMemo(
    () =>
      createVisitorColumns({
        loadingId,
        onSoftDelete: (profile) => setSelectedForDelete(profile),
        onRestore: (profileId) => handleSoftDelete(profileId, false),
        onInspect: (profile) => setInspectedProfile(profile),
      }),
    [loadingId, handleSoftDelete]
  );

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <UiKpiGrid className="grid-cols-1 sm:grid-cols-3">
        <UiKpiCard
          label="Total Basis Data Tamu"
          value={profiles.length}
          description="Tersimpan aman dalam basis data aplikasi VMS"
          indicator="neutral"
        />

        <UiKpiCard
          label="Profil Aktif (Siap Auto-fill)"
          value={activeCount}
          description="Pengenalan 1-klik untuk tamu yang datang kembali"
          indicator="patina"
        />

        <UiKpiCard
          label="Arsip PDP / Terhapus Halus"
          value={deletedCount}
          description="Dikecualikan dari auto-fill; log audit tetap terjaga"
          indicator="amber"
        />
      </UiKpiGrid>

      {feedback && (
        <div
          role="status"
          className={`flex items-start justify-between rounded-[var(--ks-radius-md)] p-4 text-xs ${
            feedback.type === "success"
              ? "border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/10 text-[var(--ks-ink)]"
              : "border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/10 text-[var(--ks-vermilion)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-[var(--ks-muted)] hover:text-[var(--ks-ink)] rounded-md cursor-pointer transition-colors"
            aria-label="Tutup notifikasi"
          >
            <svg
              className="w-4 h-4"
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
      )}

      {/* Canonical Headless Data Table */}
      <UiDataTable<Visitor>
        columns={columns}
        data={displayProfiles}
        showSearch
        searchPlaceholder="Cari berdasarkan nama, nomor NIK/ID, telepon, atau email..."
        actionsSlot={
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[var(--ks-ink)]">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded-[var(--ks-radius-xs)] border-[var(--ks-rule)] text-[var(--ks-ink)] focus:ring-[var(--ks-patina)] accent-[var(--ks-ink)]"
            />
            <span>Tampilkan Arsip Terhapus (Kepatuhan PDP)</span>
          </label>
        }
        enableSorting
        enablePagination
        pageSize={10}
        enableGlobalFilter
        {...urlState.tableProps}
        rowClassName={(row) =>
          row.isDeleted ? "bg-[var(--ks-paper-deep)]/40 opacity-75" : ""
        }
        emptyState={
          <div className="flex flex-col items-center justify-center gap-1.5 py-4">
            <p className="text-sm font-semibold text-[var(--ks-ink)]">
              {urlState.globalFilter
                ? `Tidak ada profil tamu yang cocok dengan "${urlState.globalFilter}".`
                : "Buku Tamu Masih Kosong"}
            </p>
            <p className="text-xs text-[var(--ks-muted)]">
              {urlState.globalFilter
                ? "Periksa ejaan kata kunci atau hapus pencarian untuk menampilkan seluruh tamu."
                : "Data profil dan riwayat kunjungan tamu akan otomatis tercatat di sini setelah pendaftaran diproses."}
            </p>
            {urlState.globalFilter ? (
              <UiButton
                variant="secondary"
                size="sm"
                onClick={() => urlState.setGlobalFilter("")}
                className="mt-3.5"
              >
                Reset Pencarian
              </UiButton>
            ) : null}
          </div>
        }
      />

      {/* Soft-Delete Modal */}
      <SoftDeleteModal
        isOpen={Boolean(selectedForDelete)}
        profile={selectedForDelete}
        isLoading={loadingId === selectedForDelete?.id}
        onClose={() => setSelectedForDelete(null)}
        onConfirm={(reason) => {
          if (selectedForDelete) {
            handleSoftDelete(selectedForDelete.id, true, reason);
          }
        }}
      />

      {/* Visitor Details & Inspection Modal */}
      <VisitorDetailsModal
        isOpen={Boolean(inspectedProfile)}
        profile={inspectedProfile}
        onClose={() => setInspectedProfile(null)}
        onSoftDelete={(profile) => {
          setInspectedProfile(null);
          setSelectedForDelete(profile);
        }}
        onRestore={(profileId) => handleSoftDelete(profileId, false)}
      />
    </div>
  );
}
