"use client";

import { useId, useState, useEffect } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import {
  TIME_SCHEDULE_LABELS,
  TIME_SCHEDULE_TEMPLATES,
  type AccessLevel,
  type TimeScheduleTemplateId,
} from "@/lib/vms/access-level-contract";
import { idDict } from "@/lib/vms/i18n/id";

interface AccessLevelsClientProps {
  facilities: Facility[];
  initialAccessLevels: AccessLevel[];
}

const COMMON_DOOR_PRESETS = [
  "Lobby Main SpeedGate A",
  "Lobby Main SpeedGate B",
  "Visitor Turnstile 01",
  "3F Elevator Lobby Door",
  "Executive Boardroom",
  "DC Server Room 01",
  "Basement AirLock",
  "Lab Wing Sliding Door",
  "Loading Gate 01",
];

const COMMON_FLOOR_PRESETS = ["B1", "1F", "2F", "3F", "4F", "5F"];

export function AccessLevelsClient({
  facilities,
  initialAccessLevels,
}: AccessLevelsClientProps) {
  const formId = useId();
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>(initialAccessLevels);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isFormOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFormOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen]);

  // Form Fields
  const [targetFacilityId, setTargetFacilityId] = useState(
    facilities[0]?.id ?? "fac-jakarta",
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeScheduleId, setTimeScheduleId] =
    useState<TimeScheduleTemplateId>(2);
  const [doors, setDoors] = useState<string[]>([]);
  const [newDoorInput, setNewDoorInput] = useState("");
  const [floors, setFloors] = useState<string[]>([]);
  const [newFloorInput, setNewFloorInput] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered access levels
  const filteredLevels =
    selectedFacilityId === "all"
      ? accessLevels
      : accessLevels.filter((l) => l.facilityId === selectedFacilityId);

  const openCreateModal = () => {
    setEditingId(null);
    setTargetFacilityId(
      selectedFacilityId !== "all"
        ? selectedFacilityId
        : facilities[0]?.id ?? "fac-jakarta",
    );
    setName("");
    setDescription("");
    setTimeScheduleId(2);
    setDoors(["Lobby Main SpeedGate A"]);
    setFloors(["1F"]);
    setIsDefault(false);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (level: AccessLevel) => {
    setEditingId(level.id);
    setTargetFacilityId(level.facilityId);
    setName(level.name);
    setDescription(level.description || "");
    setTimeScheduleId(level.timeScheduleId);
    setDoors([...level.doors]);
    setFloors(level.floors ? [...level.floors] : []);
    setIsDefault(Boolean(level.isDefault));
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleAddDoor = (doorToAdd?: string) => {
    const val = (doorToAdd || newDoorInput).trim();
    if (!val) return;
    if (!doors.includes(val)) {
      setDoors([...doors, val]);
    }
    if (!doorToAdd) {
      setNewDoorInput("");
    }
  };

  const handleRemoveDoor = (doorToRemove: string) => {
    setDoors(doors.filter((d) => d !== doorToRemove));
  };

  const handleToggleFloor = (floor: string) => {
    if (floors.includes(floor)) {
      setFloors(floors.filter((f) => f !== floor));
    } else {
      setFloors([...floors, floor]);
    }
  };

  const handleAddCustomFloor = () => {
    const val = newFloorInput.trim();
    if (!val) return;
    if (!floors.includes(val)) {
      setFloors([...floors, val]);
    }
    setNewFloorInput("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});
    setErrorMessage(null);
    setStatusMessage(null);

    const payload = {
      facilityId: targetFacilityId,
      name,
      description,
      timeScheduleId,
      doors,
      floors,
      isDefault,
    };

    try {
      if (editingId) {
        // PUT update
        const res = await fetch(`/api/vms/access-levels/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (data.error?.fieldErrors) {
            setFormErrors(data.error.fieldErrors);
          } else {
            setErrorMessage(data.error?.message || "Gagal memperbarui kelompok hak akses.");
          }
          setIsSubmitting(false);
          return;
        }

        setAccessLevels((prev) =>
          prev.map((item) => (item.id === editingId ? data.accessLevel : item)),
        );
        setStatusMessage(`Kelompok hak akses '${name}' berhasil diperbarui.`);
      } else {
        // POST create
        const res = await fetch("/api/vms/access-levels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (data.error?.fieldErrors) {
            setFormErrors(data.error.fieldErrors);
          } else {
            setErrorMessage(data.error?.message || "Gagal membuat kelompok hak akses.");
          }
          setIsSubmitting(false);
          return;
        }

        setAccessLevels((prev) => [data.accessLevel, ...prev]);
        setStatusMessage(`Kelompok hak akses '${name}' berhasil ditambahkan.`);
      }

      setIsFormOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi gangguan jaringan saat menyimpan hak akses.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, levelName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kelompok hak akses '${levelName}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vms/access-levels/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error?.message || "Gagal menghapus kelompok hak akses.");
        return;
      }

      setAccessLevels((prev) => prev.filter((item) => item.id !== id));
      setStatusMessage(`Kelompok hak akses '${levelName}' berhasil dihapus.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi gangguan jaringan saat menghapus hak akses.",
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

      {/* Control Bar: Facility Filter and Create Button */}
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
            <option value="all">Semua Lokasi Fasilitas ({accessLevels.length})</option>
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

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 dark:hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          + Tambah Hak Akses Pintu
        </button>
      </div>

      {/* Access Level Card List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLevels.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-neutral-300 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/40 p-10 text-center">
            <p className="text-sm font-medium text-neutral-800 dark:text-slate-200">
              Tidak ada kelompok hak akses yang ditemukan.
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
              Buat kelompok hak akses untuk menggabungkan izin pintu dan template jadwal waktu kunjungan.
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

                  <div className="mt-4 space-y-2 border-t border-neutral-100 dark:border-slate-800 pt-3 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                        Jadwal Waktu Akses
                      </span>
                      <p className="mt-0.5 font-medium text-neutral-800 dark:text-slate-200">
                        {idDict.timeSchedules[level.timeScheduleId] ??
                          TIME_SCHEDULE_LABELS[level.timeScheduleId] ??
                          `Template ${level.timeScheduleId}`}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                          Pintu Diberikan ({level.doors.length})
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {level.doors.map((door) => (
                          <span
                            key={door}
                            className="inline-flex rounded-md bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-neutral-700 dark:text-slate-300"
                          >
                            {door}
                          </span>
                        ))}
                      </div>
                    </div>

                    {level.floors && level.floors.length > 0 ? (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                          Akses Lantai Lift ({level.floors.length})
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

      {/* Create / Edit Modal */}
      {isFormOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                {editingId ? "Ubah Kelompok Hak Akses" : "Buat Kelompok Hak Akses Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
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
                    formErrors.name
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500"
                  }`}
                />
                {formErrors.name ? (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>
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

              {/* Doors Management */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300">
                  Daftar Pintu Fisik * (minimal 1 pintu)
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-neutral-300 dark:border-slate-700 p-2">
                  {doors.length === 0 ? (
                    <span className="text-xs text-neutral-400">
                      Belum ada pintu yang dipilih. Klik preset di bawah atau ketik nama pintu.
                    </span>
                  ) : (
                    doors.map((door) => (
                      <span
                        key={door}
                        className="inline-flex items-center gap-1 rounded-md bg-neutral-900 dark:bg-blue-600 px-2 py-0.5 text-xs text-white"
                      >
                        {door}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoor(door)}
                          className="text-neutral-400 hover:text-white"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
                {formErrors.doors ? (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.doors}</p>
                ) : null}

                {/* Common Presets */}
                <div className="mt-2">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-slate-400">
                    Preset Pilihan Cepat:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {COMMON_DOOR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddDoor(preset)}
                        className="rounded-md border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] text-neutral-700 dark:text-slate-300 transition hover:bg-neutral-100 dark:hover:bg-slate-700"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Door Input */}
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={newDoorInput}
                    onChange={(e) => setNewDoorInput(e.target.value)}
                    placeholder="Ketik nama pintu atau kode pintu..."
                    className="flex-1 rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDoor()}
                    className="rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700"
                  >
                    Tambah Pintu
                  </button>
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
                  className="text-xs font-medium text-neutral-800 dark:text-slate-200"
                >
                  Tetapkan sebagai Hak Akses Standar untuk tamu di gedung ini
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-neutral-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : editingId ? "Perbarui Hak Akses" : "Simpan Hak Akses Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
