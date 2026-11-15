"use client";

import { useState } from "react";
import Image from "next/image";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import { CERTIFICATE_TYPE_LABELS, type CertificateType } from "@/lib/vms/vms-contract";
import { idDict } from "@/lib/vms/i18n/id";
import {
  UiButton,
  UiCard,
  UiKpiCard,
  UiKpiGrid,
  UiFilterToolbar,
  UiBadge,
  UiModal,
} from "@/components/vms/ui";

interface VisitorsClientProps {
  initialProfiles: VisitorProfile[];
}

export function VisitorsClient({ initialProfiles }: VisitorsClientProps) {
  const [profiles, setProfiles] = useState<VisitorProfile[]>(initialProfiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Soft-delete modal state
  const [selectedForDelete, setSelectedForDelete] = useState<VisitorProfile | null>(
    null,
  );
  const [deleteReason, setDeleteReason] = useState(
    "Permintaan penghapusan data pribadi oleh pemilik identitas sesuai kepatuhan UU PDP",
  );

  const activeCount = profiles.filter((p) => !p.isDeleted).length;
  const deletedCount = profiles.filter((p) => p.isDeleted).length;

  const filteredProfiles = profiles.filter((p) => {
    if (!showDeleted && p.isDeleted) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.certificateNo.toLowerCase().includes(q) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  async function handleSoftDelete(profileId: string, isDeleted: boolean, reason?: string) {
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
          message: data.error?.message || "Gagal memperbarui status profil tamu.",
        });
        return;
      }

      const updatedProfile: VisitorProfile = data.profile;
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? updatedProfile : p)),
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
        message: err instanceof Error ? err.message : "Terjadi gangguan jaringan saat memproses permintaan.",
      });
    } finally {
      setLoadingId(null);
    }
  }

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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <UiFilterToolbar
        searchSlot={
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama, nomor NIK/ID, telepon, atau email..."
              className="w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] bg-[var(--ks-paper)] px-3 py-2 text-xs sm:text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-patina-deep)] focus:outline-hidden"
            />
          </div>
        }
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
      />

      {/* Visitors Profiles Table */}
      <UiCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--ks-text)]">
            <thead className="border-b border-[var(--ks-rule)] bg-[var(--ks-paper)]/60 text-xs font-semibold text-[var(--ks-ink)]">
              <tr>
                <th className="px-4 py-3">Nama Tamu</th>
                <th className="px-4 py-3">Tanda Pengenal (NIK/Paspor)</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3 text-center">Total Kunjungan</th>
                <th className="px-4 py-3">Status Kepatuhan PDP</th>
                <th className="px-4 py-3 text-right">Aksi Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ks-rule-subtle)]">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-[var(--ks-ink)]">
                      {searchQuery
                        ? `Tidak ada profil tamu yang cocok dengan "${searchQuery}".`
                        : "Buku Tamu Masih Kosong"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ks-muted)]">
                      {searchQuery
                        ? "Periksa ejaan kata kunci atau hapus pencarian untuk menampilkan seluruh tamu."
                        : "Data profil dan riwayat kunjungan tamu akan otomatis tercatat di sini setelah pendaftaran diproses."}
                    </p>
                    {searchQuery && (
                      <UiButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="mt-3.5"
                      >
                        Reset Pencarian
                      </UiButton>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className={`transition hover:bg-[var(--ks-paper)]/50 ${
                      profile.isDeleted ? "bg-[var(--ks-paper-deep)]/40 opacity-75" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
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
                          <p className="font-semibold text-[var(--ks-ink)]">
                            {profile.fullName}
                          </p>
                          <p className="text-[11px] font-mono text-[var(--ks-muted)]">
                            {profile.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-[var(--ks-ink)]">
                        {profile.certificateType
                          ? (idDict.certificateTypes[profile.certificateType as CertificateType] ??
                            CERTIFICATE_TYPE_LABELS[profile.certificateType as CertificateType])
                          : "Identitas"}
                      </p>
                      <p className="font-mono text-xs text-[var(--ks-muted)]">
                        {profile.certificateNo}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-xs">
                      {profile.phone && <p className="text-[var(--ks-ink)] font-mono">{profile.phone}</p>}
                      {profile.email && (
                        <p className="text-[var(--ks-muted)]">{profile.email}</p>
                      )}
                      {!profile.phone && !profile.email && (
                        <span className="text-[var(--ks-muted)]">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-block rounded-full bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] px-2 py-0.5 text-xs font-semibold font-mono tabular-nums text-[var(--ks-ink)]">
                        {profile.visitCount ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {profile.isDeleted ? (
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
                        <UiBadge
                          variant="normal"
                          label="Aktif (Tersimpan PDP)"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {profile.isDeleted ? (
                        <UiButton
                          variant="secondary"
                          size="sm"
                          disabled={loadingId === profile.id}
                          isLoading={loadingId === profile.id}
                          onClick={() => handleSoftDelete(profile.id, false)}
                        >
                          Pulihkan
                        </UiButton>
                      ) : (
                        <UiButton
                          variant="danger"
                          size="sm"
                          disabled={loadingId === profile.id}
                          onClick={() => setSelectedForDelete(profile)}
                        >
                          Hapus PDP
                        </UiButton>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </UiCard>

      {/* Confirmation Modal for Soft-Delete */}
      <UiModal
        isOpen={Boolean(selectedForDelete)}
        onClose={() => setSelectedForDelete(null)}
        title="Arsipkan Profil Tamu (Kepatuhan PDP)"
        description={
          selectedForDelete ? (
            <span>
              Arsipkan data biometrik dan data pribadi untuk{" "}
              <strong className="text-[var(--ks-ink)] font-semibold">
                {selectedForDelete.fullName}
              </strong>{" "}
              (No: {selectedForDelete.certificateNo}). Tindakan ini menonaktifkan fitur pengenalan otomatis untuk tamu kembali, dengan tetap menjaga keutuhan log riwayat audit keamanan.
            </span>
          ) : undefined
        }
        footer={
          <>
            <UiButton
              variant="secondary"
              size="md"
              onClick={() => setSelectedForDelete(null)}
            >
              Batal
            </UiButton>
            <UiButton
              variant="danger"
              size="md"
              disabled={loadingId === selectedForDelete?.id}
              isLoading={loadingId === selectedForDelete?.id}
              onClick={() => {
                if (selectedForDelete) {
                  handleSoftDelete(selectedForDelete.id, true, deleteReason);
                }
              }}
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
          />
        </div>
      </UiModal>
    </div>
  );
}
