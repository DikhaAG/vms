"use client";

import { useState, useEffect } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import type { FacilityDoor } from "@/lib/vms/checkout-contract";
import {
  TIME_SCHEDULE_LABELS,
  type AccessLevel,
} from "@/lib/vms/access-level-contract";
import { idDict } from "@/lib/vms/i18n/id";
import {
  UiButton,
  UiCard,
  UiBadge,
  UiFilterToolbar,
} from "@/components/vms/ui";
import {
  AccessLevelFormModal,
  type AccessLevelFormData,
} from "./access-level-form-modal";

interface AccessLevelsClientProps {
  facilities?: Facility[];
  initialAccessLevels: AccessLevel[];
  initialDoors?: FacilityDoor[];
}

export function AccessLevelsClient({
  facilities = [],
  initialAccessLevels,
  initialDoors = [],
}: AccessLevelsClientProps) {
  const [accessLevels, setAccessLevels] =
    useState<AccessLevel[]>(initialAccessLevels);
  const [availableDoors, setAvailableDoors] =
    useState<FacilityDoor[]>(initialDoors);
  const [isSyncingDoors, setIsSyncingDoors] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load doors from server on mount if not provided
  useEffect(() => {
    if (availableDoors.length === 0) {
      void (async () => {
        try {
          const res = await fetch("/api/vms/doors");
          const data = await res.json();
          if (data.ok && Array.isArray(data.doors)) {
            setAvailableDoors(data.doors);
          }
        } catch {
          // Silent fallback on initial passive load
        }
      })();
    }
  }, [availableDoors.length]);

  const handleSyncDoors = async () => {
    setIsSyncingDoors(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/vms/sync/doors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(
          data.error?.message ||
            "Gagal menyinkronkan daftar pintu dari server HikCentral.",
        );
        return;
      }

      // Re-fetch authoritative doors list
      const doorsRes = await fetch("/api/vms/doors");
      const doorsData = await doorsRes.json();
      if (doorsData.ok && Array.isArray(doorsData.doors)) {
        setAvailableDoors(doorsData.doors);
      }

      const count = data.totalSynced ?? data.doors?.length ?? 0;
      setStatusMessage(
        `Berhasil menyinkronkan ${count} pintu fisik dari server HikCentral.`,
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan jaringan saat menyinkronkan pintu.",
      );
    } finally {
      setIsSyncingDoors(false);
    }
  };

  const openCreateModal = () => {
    setEditingLevel(null);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (level: AccessLevel) => {
    setEditingLevel(level);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleSaveModal = async (formData: AccessLevelFormData) => {
    setIsSubmitting(true);
    setFormErrors({});
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (editingLevel) {
        // PUT update
        const res = await fetch(`/api/vms/access-levels/${editingLevel.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (data.error?.fieldErrors) {
            setFormErrors(data.error.fieldErrors);
          } else {
            setErrorMessage(
              data.error?.message || "Gagal memperbarui kelompok hak akses.",
            );
          }
          setIsSubmitting(false);
          return;
        }

        setAccessLevels((prev) =>
          prev.map((item) =>
            item.id === editingLevel.id ? data.accessLevel : item,
          ),
        );
        setStatusMessage(
          `Kelompok hak akses '${formData.name}' berhasil diperbarui.`,
        );
      } else {
        // POST create
        const res = await fetch("/api/vms/access-levels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (data.error?.fieldErrors) {
            setFormErrors(data.error.fieldErrors);
          } else {
            setErrorMessage(
              data.error?.message || "Gagal membuat kelompok hak akses.",
            );
          }
          setIsSubmitting(false);
          return;
        }

        setAccessLevels((prev) => [data.accessLevel, ...prev]);
        setStatusMessage(
          `Kelompok hak akses '${formData.name}' berhasil ditambahkan.`,
        );
      }

      setIsFormOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat menyimpan hak akses.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, levelName: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus kelompok hak akses '${levelName}'?`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/vms/access-levels/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(
          data.error?.message || "Gagal menghapus kelompok hak akses.",
        );
        return;
      }

      setAccessLevels((prev) => prev.filter((item) => item.id !== id));
      setStatusMessage(`Kelompok hak akses '${levelName}' berhasil dihapus.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat menghapus hak akses.",
      );
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <div
          role="status"
          className="flex items-start justify-between rounded-[var(--ks-radius-md)] border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/10 p-4 text-xs font-medium text-[var(--ks-ink)]"
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 text-[var(--ks-muted)] hover:text-[var(--ks-ink)] rounded-[var(--ks-radius-sm)] cursor-pointer transition-colors"
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
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start justify-between rounded-[var(--ks-radius-md)] border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/10 p-4 text-xs font-medium text-[var(--ks-vermilion)]"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 text-[var(--ks-muted)] hover:text-[var(--ks-ink)] rounded-[var(--ks-radius-sm)] cursor-pointer transition-colors"
            aria-label="Tutup pesan kesalahan"
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
      ) : null}

      {/* Control Bar: Door Sync and Create Button */}
      <UiFilterToolbar
        actionsSlot={
          <div className="flex flex-wrap items-center gap-2">
            <UiButton
              type="button"
              variant="secondary"
              onClick={handleSyncDoors}
              disabled={isSyncingDoors}
              isLoading={isSyncingDoors}
            >
              <span aria-hidden="true">🔄</span>
              <span>Sinkronkan Pintu dari Server HikCentral</span>
            </UiButton>

            <UiButton
              type="button"
              variant="primary"
              onClick={openCreateModal}
            >
              + Tambah Hak Akses Pintu
            </UiButton>
          </div>
        }
      />

      {/* Access Level Card List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accessLevels.length === 0 ? (
          <div className="col-span-full rounded-[var(--ks-radius-md)] border border-dashed border-[var(--ks-rule)] bg-[var(--ks-paper)]/50 p-10 text-center">
            <p className="text-sm font-semibold text-[var(--ks-ink)]">
              {availableDoors.length === 0
                ? "Belum Ada Pintu Fisik yang Terdaftar"
                : "Tidak ada kelompok hak akses yang ditemukan"}
            </p>
            <p className="mt-1 text-xs text-[var(--ks-muted)] max-w-md mx-auto">
              {availableDoors.length === 0
                ? "Klik tombol 'Sinkronkan Pintu dari Server HikCentral' untuk menarik data pintu dari gateway gedung."
                : "Buat kelompok hak akses untuk menggabungkan izin pintu dan template jadwal waktu kunjungan."}
            </p>
            <UiButton
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="mt-4"
            >
              + Buat Hak Akses Pertama
            </UiButton>
          </div>
        ) : (
          accessLevels.map((level) => {
            return (
              <UiCard
                key={level.id}
                className="flex flex-col justify-between p-5 hover:border-[var(--ks-rule)] transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-bold text-[var(--ks-ink)]">
                      {level.name}
                    </h2>
                    {level.isDefault ? (
                      <UiBadge variant="normal" showDot={false}>
                        Standar
                      </UiBadge>
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs text-[var(--ks-text)] line-clamp-2">
                    {level.description || "Tidak ada deskripsi tambahan."}
                  </p>

                  <div className="mt-4 space-y-3 border-t border-[var(--ks-rule-subtle)] pt-3">
                    <div>
                      <span className="text-2xs font-medium text-[var(--ks-muted)]">
                        Jadwal Waktu Akses:
                      </span>
                      <p className="text-xs font-semibold text-[var(--ks-ink)]">
                        {idDict.timeSchedules[level.timeScheduleId] ??
                          TIME_SCHEDULE_LABELS[level.timeScheduleId]}
                      </p>
                    </div>

                    <div>
                      <span className="text-2xs font-medium text-[var(--ks-muted)]">
                        Pintu Diberikan ({level.doors.length}):
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {level.doors.length === 0 ? (
                          <span className="text-xs text-[var(--ks-muted)] italic">
                            Tidak ada pintu terdaftar
                          </span>
                        ) : (
                          level.doors.map((doorCode) => {
                            const doorObj = availableDoors.find(
                              (d) =>
                                d.doorIndexCode === doorCode ||
                                d.doorName === doorCode,
                            );
                            const displayName = doorObj
                              ? doorObj.doorName
                              : doorCode;
                            return (
                              <span
                                key={doorCode}
                                className="inline-flex items-center gap-1 rounded-[var(--ks-radius-sm)] bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] px-2 py-0.5 text-2xs font-medium text-[var(--ks-ink)]"
                              >
                                <span>{displayName}</span>
                                {doorObj ? (
                                  <span className="text-[9px] text-[var(--ks-muted)]">
                                    #{doorObj.doorIndexCode}
                                  </span>
                                ) : null}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {level.floors && level.floors.length > 0 ? (
                      <div>
                        <span className="text-2xs font-medium text-[var(--ks-muted)]">
                          Akses Lantai Lift ({level.floors.length}):
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {level.floors.map((floor) => (
                            <span
                              key={floor}
                              className="inline-flex rounded-[var(--ks-radius-sm)] bg-[var(--ks-kinpaku)]/15 border border-[var(--ks-kinpaku)]/30 px-2 py-0.5 text-2xs font-semibold text-[var(--ks-ink)]"
                            >
                              {floor}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-[var(--ks-rule-subtle)] pt-3">
                  <UiButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditModal(level)}
                  >
                    Ubah
                  </UiButton>
                  <UiButton
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(level.id, level.name)}
                  >
                    Hapus
                  </UiButton>
                </div>
              </UiCard>
            );
          })
        )}
      </div>

      {/* Extracted Create / Edit Modal Dialog */}
      <AccessLevelFormModal
        key={`${editingLevel?.id ?? "new"}-${isFormOpen}`}
        isOpen={isFormOpen}
        editingLevel={editingLevel}
        facilities={facilities}
        availableDoors={availableDoors}
        isSyncingDoors={isSyncingDoors}
        isSubmitting={isSubmitting}
        formErrors={formErrors}
        onClose={() => setIsFormOpen(false)}
        onSyncDoors={handleSyncDoors}
        onSave={handleSaveModal}
      />
    </div>
  );
}
