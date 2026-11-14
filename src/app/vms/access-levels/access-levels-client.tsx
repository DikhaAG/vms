"use client";

import { useId, useState, useEffect } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import type { FacilityDoor } from "@/lib/vms/checkout-contract";
import {
  TIME_SCHEDULE_LABELS,
  type AccessLevel,
} from "@/lib/vms/access-level-contract";
import { idDict } from "@/lib/vms/i18n/id";
import {
  AccessLevelFormModal,
  type AccessLevelFormData,
} from "./access-level-form-modal";

interface AccessLevelsClientProps {
  facilities: Facility[];
  initialAccessLevels: AccessLevel[];
  initialDoors?: FacilityDoor[];
}

export function AccessLevelsClient({
  facilities,
  initialAccessLevels,
  initialDoors = [],
}: AccessLevelsClientProps) {
  const formId = useId();
  const [accessLevels, setAccessLevels] =
    useState<AccessLevel[]>(initialAccessLevels);
  const [availableDoors, setAvailableDoors] =
    useState<FacilityDoor[]>(initialDoors);
  const [isSyncingDoors, setIsSyncingDoors] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");
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

  // Filtered access levels
  const filteredLevels =
    selectedFacilityId === "all"
      ? accessLevels
      : accessLevels.filter((l) => l.facilityId === selectedFacilityId);

  const handleSyncDoors = async () => {
    setIsSyncingDoors(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/vms/sync/doors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId:
            selectedFacilityId !== "all" ? selectedFacilityId : undefined,
        }),
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
          className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300"
        >
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs font-medium text-rose-800 dark:text-rose-300"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Control Bar: Facility Filter, Door Sync, and Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`${formId}-facility-filter`}
            className="text-xs font-medium text-neutral-700 dark:text-slate-300"
          >
            Lokasi Gedung:
          </label>
          <select
            id={`${formId}-facility-filter`}
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-slate-200 shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
          >
            <option value="all">
              Semua Lokasi Fasilitas ({accessLevels.length})
            </option>
            {facilities.map((fac) => {
              const count = accessLevels.filter(
                (l) => l.facilityId === fac.id,
              ).length;
              return (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncDoors}
            disabled={isSyncingDoors}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-slate-200 shadow-xs transition hover:bg-neutral-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <span aria-hidden="true">{isSyncingDoors ? "⏳" : "🔄"}</span>
            {isSyncingDoors
              ? "Menyinkronkan Pintu..."
              : "Sinkronkan Pintu dari Server HikCentral"}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 dark:hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            + Tambah Hak Akses Pintu
          </button>
        </div>
      </div>

      {/* Access Level Card List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLevels.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-neutral-300 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/40 p-10 text-center">
            <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200">
              {availableDoors.length === 0
                ? "Belum Ada Pintu Fisik yang Terdaftar"
                : "Tidak ada kelompok hak akses yang ditemukan"}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
              {availableDoors.length === 0
                ? "Klik tombol 'Sinkronkan Pintu dari Server HikCentral' untuk menarik data pintu dari gateway gedung."
                : "Buat kelompok hak akses untuk menggabungkan izin pintu dan template jadwal waktu kunjungan."}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 dark:hover:bg-blue-700"
            >
              + Buat Hak Akses Pertama
            </button>
          </div>
        ) : (
          filteredLevels.map((level) => {
            const fac = facilities.find((f) => f.id === level.facilityId);
            return (
              <div
                key={level.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:border-neutral-300 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {level.name}
                    </h2>
                    {level.isDefault ? (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Standar
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                    {fac?.name ?? level.facilityId}
                  </p>

                  <p className="mt-2 text-xs text-neutral-600 dark:text-slate-300 line-clamp-2">
                    {level.description || "Tidak ada deskripsi tambahan."}
                  </p>

                  <div className="mt-4 space-y-3 border-t border-neutral-100 dark:border-slate-800 pt-3">
                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-slate-400">
                        Jadwal Waktu Akses:
                      </span>
                      <p className="text-xs font-semibold text-neutral-800 dark:text-slate-200">
                        {idDict.timeSchedules[level.timeScheduleId] ??
                          TIME_SCHEDULE_LABELS[level.timeScheduleId]}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-slate-400">
                        Pintu Diberikan ({level.doors.length}):
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {level.doors.length === 0 ? (
                          <span className="text-xs text-neutral-400 italic">
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
                                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-neutral-800 dark:text-slate-300"
                              >
                                <span>{displayName}</span>
                                {doorObj ? (
                                  <span className="text-[9px] text-neutral-400">
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
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-slate-400">
                          Akses Lantai Lift ({level.floors.length}):
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {level.floors.map((floor) => (
                            <span
                              key={floor}
                              className="inline-flex rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
                            >
                              {floor}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(level)}
                    className="rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(level.id, level.name)}
                    className="rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Hapus
                  </button>
                </div>
              </div>
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
        defaultFacilityId={selectedFacilityId}
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
