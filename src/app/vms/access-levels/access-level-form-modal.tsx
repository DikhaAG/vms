"use client";

import { useState, useRef, useId } from "react";
import type { FacilityDoor } from "@/lib/vms/checkout-contract";
import {
  TIME_SCHEDULE_LABELS,
  TIME_SCHEDULE_TEMPLATES,
  type AccessLevel,
  type TimeScheduleTemplateId,
} from "@/lib/vms/access-level-contract";
import { idDict } from "@/lib/vms/i18n/id";
import { UiModal, UiButton } from "@/components/vms/ui";

const COMMON_FLOOR_PRESETS = ["B1", "1F", "2F", "3F", "4F", "5F"];

export interface AccessLevelFormData {
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
  availableDoors: FacilityDoor[];
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
  availableDoors,
  isSyncingDoors,
  isSubmitting,
  formErrors: externalFormErrors,
  onClose,
  onSyncDoors,
  onSave,
}: AccessLevelFormModalProps) {
  const formId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  if (!isOpen) return null;

  const mergedErrors = { ...localErrors, ...externalFormErrors };

  const displayedAvailableDoors = availableDoors.filter((d) => {
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
      name: name.trim(),
      description: description.trim(),
      timeScheduleId,
      doors,
      floors,
      isDefault,
    });
  };

  return (
    <UiModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        editingLevel
          ? "Ubah Kelompok Hak Akses"
          : "Buat Kelompok Hak Akses Baru"
      }
      closeLabel="Tutup form modal"
      initialFocusRef={nameInputRef}
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="mt-4 space-y-4" id={formId}>
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="block text-xs font-medium text-[var(--ks-muted)]"
          >
            Nama Kelompok Hak Akses * (maks 32 karakter)
          </label>
          <input
            ref={nameInputRef}
            id={`${formId}-name`}
            type="text"
            maxLength={32}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. Pintu Putar Lobi & Lantai 1"
            className={`mt-1 block w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-sm text-[var(--ks-ink)] bg-[var(--ks-paper)] shadow-xs focus:outline-hidden ${
              mergedErrors.name
                ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)]"
                : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-kinpaku)]"
            }`}
          />
          {mergedErrors.name ? (
            <p className="mt-1 text-xs text-[var(--ks-vermilion)]">{mergedErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${formId}-desc`}
            className="block text-xs font-medium text-[var(--ks-muted)]"
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
            className="mt-1 block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs focus:border-[var(--ks-kinpaku)] focus:outline-hidden"
          />
        </div>

        <div>
          <label
            htmlFor={`${formId}-schedule`}
            className="block text-xs font-medium text-[var(--ks-muted)]"
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
            className="mt-1 block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs focus:border-[var(--ks-kinpaku)] focus:outline-hidden"
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
            <span className="block text-xs font-medium text-[var(--ks-muted)]">
              Daftar Pintu Fisik Server HikCentral * (minimal 1 pintu)
            </span>
            <button
              type="button"
              onClick={onSyncDoors}
              disabled={isSyncingDoors}
              className="text-2xs font-semibold text-[var(--ks-patina)] hover:text-[var(--ks-patina-deep)] hover:underline inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <span aria-hidden="true">{isSyncingDoors ? "⏳" : "🔄"}</span>
              <span>{isSyncingDoors ? "Menyinkronkan..." : "Sinkronkan Pintu"}</span>
            </button>
          </div>

          {/* Selected Doors Badges */}
          <div className="mt-1 flex flex-wrap gap-1.5 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] p-2 min-h-[38px] bg-[var(--ks-paper-deep)]">
            {doors.length === 0 ? (
              <span className="text-xs text-[var(--ks-muted)]">
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
                    className="inline-flex items-center gap-1.5 rounded-[var(--ks-radius-sm)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] px-2 py-0.5 text-2xs"
                  >
                    <span>{label}</span>
                    <span className="text-[10px] text-[var(--ks-muted)]">
                      #{code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoor(doorCode)}
                      className="text-[var(--ks-muted)] hover:text-[var(--ks-paper-raised)] cursor-pointer"
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
            <p className="mt-1 text-xs text-[var(--ks-vermilion)]">{mergedErrors.doors}</p>
          ) : null}

          {/* Door Checklist Box */}
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={doorSearchQuery}
              onChange={(e) => setDoorSearchQuery(e.target.value)}
              placeholder="Cari pintu gedung..."
              className="w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-2.5 py-1 text-xs text-[var(--ks-ink)] placeholder-[var(--ks-muted)] focus:outline-hidden focus:border-[var(--ks-kinpaku)]"
            />

            <div className="max-h-48 overflow-y-auto rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] divide-y divide-[var(--ks-rule-subtle)]">
              {displayedAvailableDoors.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-[var(--ks-muted)]">
                    Belum ada pintu terdaftar dari HikCentral.
                  </p>
                  <UiButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onSyncDoors}
                    disabled={isSyncingDoors}
                    isLoading={isSyncingDoors}
                    className="mt-2"
                  >
                    Sinkronkan Sekarang
                  </UiButton>
                </div>
              ) : (
                displayedAvailableDoors.map((door) => {
                  const isChecked =
                    doors.includes(door.doorIndexCode) ||
                    doors.includes(door.doorName);
                  return (
                    <label
                      key={door.doorIndexCode}
                      className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition hover:bg-[var(--ks-paper-deep)] ${
                        isChecked ? "bg-[var(--ks-kinpaku)]/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            handleToggleDoor(door.doorIndexCode)
                          }
                          className="h-4 w-4 rounded-[var(--ks-radius-sm)] border-[var(--ks-rule)] text-[var(--ks-ink)] accent-[var(--ks-ink)] focus:ring-[var(--ks-kinpaku)]"
                        />
                        <div>
                          <span className="font-semibold text-[var(--ks-ink)]">
                            {door.doorName}
                          </span>
                          <span className="ml-1.5 text-[10px] text-[var(--ks-muted)]">
                            #{door.doorIndexCode}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {door.isPerimeter ? (
                          <span className="rounded-[var(--ks-radius-sm)] bg-[var(--ks-patina)]/15 border border-[var(--ks-patina)]/30 text-[var(--ks-patina-deep)] px-1.5 py-0.5 text-2xs font-semibold">
                            Perimeter
                          </span>
                        ) : (
                          <span className="rounded-[var(--ks-radius-sm)] bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] text-[var(--ks-muted)] px-1.5 py-0.5 text-2xs font-medium">
                            Interior
                          </span>
                        )}
                        <span className="rounded-[var(--ks-radius-sm)] bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] text-[var(--ks-muted)] px-1.5 py-0.5 text-2xs font-medium">
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
          <span className="block text-xs font-medium text-[var(--ks-muted)]">
            Akses Lantai Lift (Opsional)
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {COMMON_FLOOR_PRESETS.map((fl) => {
              const active = floors.includes(fl);
              return (
                <button
                  key={fl}
                  type="button"
                  onClick={() => handleToggleFloor(fl)}
                  className={`rounded-[var(--ks-radius-sm)] px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] shadow-xs"
                      : "border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] text-[var(--ks-ink)] hover:bg-[var(--ks-paper)]"
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
              className="flex-1 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] shadow-xs focus:border-[var(--ks-kinpaku)] focus:outline-hidden"
            />
            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCustomFloor}
            >
              Tambah Lantai
            </UiButton>
          </div>
        </div>

        {/* Default Checkbox */}
        <div className="flex items-center gap-2 pt-2">
          <input
            id={`${formId}-is-default`}
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded-[var(--ks-radius-sm)] border-[var(--ks-rule)] text-[var(--ks-ink)] accent-[var(--ks-ink)] focus:ring-[var(--ks-kinpaku)]"
          />
          <label
            htmlFor={`${formId}-is-default`}
            className="text-xs font-medium text-[var(--ks-ink)]"
          >
            Jadikan kelompok hak akses standar untuk tamu baru
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--ks-rule-subtle)] pt-4">
          <UiButton
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Batal
          </UiButton>
          <UiButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
          >
            {editingLevel ? "Simpan Perubahan" : "Buat Hak Akses"}
          </UiButton>
        </div>
      </form>
    </UiModal>
  );
}
