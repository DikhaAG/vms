"use client";

import { useState } from "react";
import Image from "next/image";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import { CERTIFICATE_TYPE_LABELS, type CertificateType } from "@/lib/vms/vms-contract";
import { idDict } from "@/lib/vms/i18n/id";

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
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-neutral-500 dark:text-slate-400">Total Basis Data Tamu</p>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{profiles.length}</p>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-slate-400">
            Tersimpan aman dalam basis data aplikasi VMS
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-5 shadow-xs">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
            Profil Aktif (Siap Auto-fill)
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">{activeCount}</p>
          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
            Pengenalan 1-klik untuk tamu yang datang kembali
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-5 shadow-xs">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Arsip PDP / Terhapus Halus
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-950 dark:text-amber-100">{deletedCount}</p>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
            Dikecualikan dari auto-fill; log audit tetap terjaga
          </p>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama, nomor NIK/ID, telepon, atau email..."
            className="w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-neutral-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <span>Tampilkan Arsip Terhapus (Kepatuhan PDP)</span>
        </label>
      </div>

      {/* Profiles Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-slate-300">
            <thead className="border-b border-neutral-200 dark:border-slate-800 bg-neutral-50/75 dark:bg-slate-800/60 text-xs font-semibold text-neutral-900 dark:text-white">
              <tr>
                <th className="px-4 py-3">Nama Tamu</th>
                <th className="px-4 py-3">Tanda Pengenal (NIK/Paspor)</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3 text-center">Total Kunjungan</th>
                <th className="px-4 py-3">Status Kepatuhan PDP</th>
                <th className="px-4 py-3 text-right">Aksi Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-slate-400">
                    Tidak ada profil tamu yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className={`transition hover:bg-neutral-50/50 dark:hover:bg-slate-800/40 ${
                      profile.isDeleted ? "bg-neutral-50/30 dark:bg-slate-900/40 opacity-75" : ""
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
                            className="rounded-full object-cover border border-neutral-200"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 dark:bg-slate-700 text-xs font-bold text-neutral-700 dark:text-slate-200">
                            {profile.givenName?.[0] || profile.fullName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {profile.fullName}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {profile.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                        {profile.certificateType ? (idDict.certificateTypes[profile.certificateType as CertificateType] ?? CERTIFICATE_TYPE_LABELS[profile.certificateType as CertificateType]) : "Identitas"}
                      </p>
                      <p className="font-mono text-xs text-neutral-600 dark:text-slate-400">
                        {profile.certificateNo}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-xs">
                      {profile.phone && <p>{profile.phone}</p>}
                      {profile.email && (
                        <p className="text-neutral-400">{profile.email}</p>
                      )}
                      {!profile.phone && !profile.email && (
                        <span className="text-neutral-400">&mdash;</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-block rounded-full bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-neutral-800 dark:text-slate-200">
                        {profile.visitCount ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {profile.isDeleted ? (
                        <div>
                          <span className="inline-block rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
                            Terhapus Halus / Diarsipkan
                          </span>
                          {profile.deletionReason && (
                            <p className="mt-1 text-[11px] text-neutral-500 dark:text-slate-400 max-w-[200px] truncate" title={profile.deletionReason}>
                              {profile.deletionReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          Aktif (Tersimpan PDP)
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {profile.isDeleted ? (
                        <button
                          type="button"
                          disabled={loadingId === profile.id}
                          onClick={() => handleSoftDelete(profile.id, false)}
                          className="inline-flex items-center rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-slate-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        >
                          {loadingId === profile.id ? "Memulihkan..." : "Pulihkan"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingId === profile.id}
                          onClick={() => setSelectedForDelete(profile)}
                          className="inline-flex items-center rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 shadow-xs hover:bg-red-100 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                        >
                          Hapus PDP
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Soft-Delete */}
      {selectedForDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Arsipkan Profil Tamu (Kepatuhan PDP)
            </h3>

            <p className="text-xs text-neutral-600 dark:text-slate-300">
              Arsipkan data biometrik dan data pribadi untuk{" "}
              <strong className="text-neutral-900 dark:text-white">
                {selectedForDelete.fullName}
              </strong>{" "}
              (No: {selectedForDelete.certificateNo}). Tindakan ini menonaktifkan fitur pengenalan otomatis untuk tamu kembali, dengan tetap menjaga keutuhan log riwayat audit keamanan.
            </p>

            <div>
              <label
                htmlFor="complianceDeleteReason"
                className="block text-xs font-semibold text-neutral-700 dark:text-slate-300"
              >
                Alasan Kepatuhan / Permintaan Penghapusan Data
              </label>
              <textarea
                id="complianceDeleteReason"
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForDelete(null)}
                className="rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loadingId === selectedForDelete.id}
                onClick={() =>
                  handleSoftDelete(selectedForDelete.id, true, deleteReason)
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
              >
                {loadingId === selectedForDelete.id
                  ? "Mengarsipkan..."
                  : "Konfirmasi Hapus PDP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
