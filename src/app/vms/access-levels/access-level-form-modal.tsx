"use client";

import { useState, useEffect, useRef, useId } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import type { FacilityDoor } from "@/lib/vms/checkout-contract";
import {
  TIME_SCHEDULE_LABELS,
  TIME_SCHEDULE_TEMPLATES,
  type AccessLevel,
  type TimeScheduleTemplateId,
} from "@/lib/vms/access-level-contract";
import { idDict } from "@/lib/vms/i18n/id";

const COMMON_FLOOR_PRESETS = ["B1", "1F", "2F", "3F", "4F", "5F"];

export interface AccessLevelFormData {
  facilityId: string;
  name: string;
  description: string;
  timeScheduleId: TimeScheduleTemplateId;
  doors: string[]; // Authoritative doorIndexCodes
  floors: string[];
  isDefault: boolean;
}

export interface AccessLevelFormModalProps {
  isOpen: boolean;
  editingLevel: AccessLevel | null;
  facilities: Facility[];
  availableDoors: FacilityDoor[];
  defaultFacilityId?: string;
  isSyncingDoors: boolean;
  isSubmitting: boolean;
  formErrors: Record<string, string>;
  onClose: () => void;
  onSyncDoors: () => Promise<void>;
  onSave: (data: AccessLevelFormData) => Promise<void>;
}

export function AccessLevelFormModal({
  isOpen,
  editingLevel,
  facilities,
  availableDoors,
  defaultFacilityId,
  isSyncingDoors,
  isSubmitting,
  formErrors: externalFormErrors,
  onClose,
  onSyncDoors,
  onSave,
}: AccessLevelFormModalProps) {
  const formId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  const [targetFacilityId, setTargetFacilityId] = useState(() => {
    if (editingLevel) return editingLevel.facilityId;
    return defaultFacilityId && defaultFacilityId !== "all"
      ? defaultFacilityId
      : facilities[0]?.id || "fac-jakarta";
  });
  const [name, setName] = useState(() => editingLevel?.name ?? "");
  const [description, setDescription] = useState(
    () => editingLevel?.description ?? "",
  );
  const [timeScheduleId, setTimeScheduleId] = useState<TimeScheduleTemplateId>(
    () => editingLevel?.timeScheduleId ?? 2,
  );
  const [doors, setDoors] = useState<string[]>(() => {
    if (editingLevel) return [...editingLevel.doors];
    const firstPerimeter = availableDoors.find((d) => d.isPerimeter);
    return firstPerimeter ? [firstPerimeter.doorIndexCode] : [];
  });
  const [doorSearchQuery, setDoorSearchQuery] = useState("");
  const [floors, setFloors] = useState<string[]>(() =>
    editingLevel?.floors ? [...editingLevel.floors] : ["1F"],
  );
  const [newFloorInput, setNewFloorInput] = useState("");
  const [isDefault, setIsDefault] = useState(() =>
    Boolean(editingLevel?.isDefault),
  );
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Keyboard navigation: Escape key closes modal & Tab focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mergedErrors = { ...localErrors, ...externalFormErrors };

  const displayedAvailableDoors = availableDoors
    .filter(
      (d) =>
        !targetFacilityId ||
        !d.facilityId ||
        d.facilityId === targetFacilityId ||
        d.facilityId === "fac-main-01",
    )
    .filter((d) => {
      if (!doorSearchQuery.trim()) return true;
      const q = doorSearchQuery.toLowerCase();
      return (
        d.doorName.toLowerCase().includes(q) ||
        d.doorIndexCode.toLowerCase().includes(q)
      );
    });

  const handleToggleDoor = (doorIndexCode: string) => {
    setDoors((prev) =>
      prev.includes(doorIndexCode)
        ? prev.filter((code) => code !== doorIndexCode)
        : [...prev, doorIndexCode],
    );
  };

  const handleRemoveDoor = (doorIndexCode: string) => {
    setDoors((prev) => prev.filter((code) => code !== doorIndexCode));
  };

  const handleToggleFloor = (floor: string) => {
    setFloors((prev) =>
      prev.includes(floor) ? prev.filter((f) => f !== floor) : [...prev, floor],
    );
  };

  const handleAddCustomFloor = () => {
    const val = newFloorInput.trim();
    if (!val) return;
    if (!floors.includes(val)) {
      setFloors((prev) => [...prev, val]);
    }
    setNewFloorInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Nama kelompok hak akses wajib diisi.";
    }
    if (doors.length === 0) {
      errors.doors = "Pilih minimal satu pintu fisik HikCentral.";
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    setLocalErrors({});
    await onSave({
      facilityId: targetFacilityId,
      name: name.trim(),
      description: description.trim(),
      timeScheduleId,
      doors,
      floors,
      isDefault,
    });
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessLevelModalTitle"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
          <h2
            id="accessLevelModalTitle"
            className="text-base font-bold text-neutral-950 dark:text-white"
          >
            {editingLevel
              ? "Ubah Kelompok Hak Akses"
              : "Buat Kelompok Hak Akses Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 text-lg leading-none"
            aria-label="Tutup form modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={`${formId}-target-facility`}
              className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
            >
              Gedung / Lokasi Fasilitas *
            </label>
            <select
              id={`${formId}-target-facility`}
              value={targetFacilityId}
              onChange={(e) => setTargetFacilityId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.timezone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${formId}-name`}
              className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
            >
              Nama Kelompok Hak Akses * (maks 32 karakter)
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              maxLength={32}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Pintu Putar Lobi & Lantai 1"
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-white dark:bg-slate-800 shadow-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                mergedErrors.name
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500"
              }`}
            />
            {mergedErrors.name ? (
              <p className="mt-1 text-xs text-rose-600">{mergedErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${formId}-desc`}
              className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
            >
              Deskripsi (maks 128 karakter)
            </label>
            <input
              id={`${formId}-desc`}
              type="text"
              maxLength={128}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="cth. Izin masuk standar gerbang lobi dan pintu putar resepsionis"
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-schedule`}
              className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
            >
              Template Jadwal Waktu Akses *
            </label>
            <select
              id={`${formId}-schedule`}
              value={timeScheduleId}
              onChange={(e) =>
                setTimeScheduleId(
                  Number(e.target.value) as TimeScheduleTemplateId,
                )
              }
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            >
              {TIME_SCHEDULE_TEMPLATES.map((tmpl) => (
                <option key={tmpl} value={tmpl}>
                  {idDict.timeSchedules[tmpl] ?? TIME_SCHEDULE_LABELS[tmpl]}
                </option>
              ))}
            </select>
          </div>

          {/* Authoritative Doors Selection from HikCentral */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300">
                Daftar Pintu Fisik Server HikCentral * (minimal 1 pintu)
              </label>
              <button
                type="button"
                onClick={onSyncDoors}
                disabled={isSyncingDoors}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
              >
                <span>{isSyncingDoors ? "⏳" : "🔄"}</span>
                {isSyncingDoors ? "Menyinkronkan..." : "Sinkronkan Pintu"}
              </button>
            </div>

            {/* Selected Doors Badges */}
            <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-neutral-300 dark:border-slate-700 p-2 min-h-[38px] bg-neutral-50/50 dark:bg-slate-800/40">
              {doors.length === 0 ? (
                <span className="text-xs text-neutral-400">
                  Belum ada pintu yang dipilih. Pilih pintu dari daftar di bawah.
                </span>
              ) : (
                doors.map((doorCode) => {
                  const matchedDoor = availableDoors.find(
                    (d) =>
                      d.doorIndexCode === doorCode || d.doorName === doorCode,
                  );
                  const label = matchedDoor ? matchedDoor.doorName : doorCode;
                  const code = matchedDoor
                    ? matchedDoor.doorIndexCode
                    : doorCode;
                  return (
                    <span
                      key={doorCode}
                      className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 dark:bg-blue-600 px-2 py-0.5 text-xs text-white"
                    >
                      <span>{label}</span>
                      <span className="text-[10px] text-neutral-300 dark:text-blue-200">
                        #{code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoor(doorCode)}
                        className="text-neutral-400 hover:text-white"
                        aria-label={`Hapus ${label}`}
                      >
                        &times;
                      </button>
                    </span>
                  );
                })
              )}
            </div>
            {mergedErrors.doors ? (
              <p className="mt-1 text-xs text-rose-600">{mergedErrors.doors}</p>
            ) : null}

            {/* Door Checklist Box */}
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={doorSearchQuery}
                onChange={(e) => setDoorSearchQuery(e.target.value)}
                placeholder="Cari pintu gedung..."
                className="w-full rounded-md border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />

              <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-neutral-100 dark:divide-slate-700/50">
                {displayedAvailableDoors.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-neutral-500 dark:text-slate-400">
                      Belum ada pintu terdaftar dari HikCentral.
                    </p>
                    <button
                      type="button"
                      onClick={onSyncDoors}
                      disabled={isSyncingDoors}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-neutral-900 dark:bg-blue-600 px-2.5 py-1 text-xs font-medium text-white shadow-xs hover:bg-neutral-800 dark:hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSyncingDoors
                        ? "Menyinkronkan..."
                        : "Sinkronkan Sekarang"}
                    </button>
                  </div>
                ) : (
                  displayedAvailableDoors.map((door) => {
                    const isChecked =
                      doors.includes(door.doorIndexCode) ||
                      doors.includes(door.doorName);
                    return (
                      <label
                        key={door.doorIndexCode}
                        className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition hover:bg-neutral-50 dark:hover:bg-slate-700/40 ${
                          isChecked ? "bg-blue-50/60 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              handleToggleDoor(door.doorIndexCode)
                            }
                            className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {door.doorName}
                            </span>
                            <span className="ml-1.5 text-[10px] text-neutral-400">
                              #{door.doorIndexCode}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {door.isPerimeter ? (
                            <span className="rounded-sm bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-medium">
                              Perimeter
                            </span>
                          ) : (
                            <span className="rounded-sm bg-neutral-100 dark:bg-slate-700 text-neutral-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px]">
                              Interior
                            </span>
                          )}
                          <span className="rounded-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px]">
                            {door.accessType === "SINGLE_DIRECTION_IN"
                              ? "1-Arah In"
                              : "2-Arah"}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Floors Management */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300">
              Akses Lantai Lift (Opsional)
            </label>
            <div className="mt-1 flex flex-wrap gap-1">
              {COMMON_FLOOR_PRESETS.map((fl) => {
                const active = floors.includes(fl);
                return (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => handleToggleFloor(fl)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {fl}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newFloorInput}
                onChange={(e) => setNewFloorInput(e.target.value)}
                placeholder="Lantai khusus (cth. Atap, Mezanin)..."
                className="flex-1 rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCustomFloor}
                className="rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700"
              >
                Tambah Lantai
              </button>
            </div>
          </div>

          {/* Default Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id={`${formId}-is-default`}
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label
              htmlFor={`${formId}-is-default`}
              className="text-xs font-medium text-neutral-700 dark:text-slate-300"
            >
              Jadikan kelompok hak akses standar untuk tamu baru
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? "Menyimpan..."
                : editingLevel
                  ? "Simpan Perubahan"
                  : "Buat Hak Akses"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
