"use client";

import { useId, useState } from "react";
import type { Facility } from "@/lib/vms/vms-contract";
import {
  TIME_SCHEDULE_LABELS,
  TIME_SCHEDULE_TEMPLATES,
  type AccessLevel,
  type TimeScheduleTemplateId,
} from "@/lib/vms/access-level-contract";

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
    setDescription(level.description);
    setTimeScheduleId(level.timeScheduleId);
    setDoors([...level.doors]);
    setFloors(level.floors ? [...level.floors] : []);
    setIsDefault(level.isDefault);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleAddDoor = (doorToAdd?: string) => {
    const val = (doorToAdd ?? newDoorInput).trim();
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
            setErrorMessage(data.error?.message || "Failed to update access level.");
          }
          setIsSubmitting(false);
          return;
        }

        setAccessLevels((prev) =>
          prev.map((item) => (item.id === editingId ? data.accessLevel : item)),
        );
        setStatusMessage(`Access level '${name}' updated successfully.`);
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
            setErrorMessage(data.error?.message || "Failed to create access level.");
          }
          setIsSubmitting(false);
          return;
        }

        setAccessLevels((prev) => [data.accessLevel, ...prev]);
        setStatusMessage(`Access level '${name}' created successfully.`);
      }

      setIsFormOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error saving access level.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, levelName: string) => {
    if (!confirm(`Are you sure you want to delete access level '${levelName}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vms/access-levels/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error?.message || "Failed to delete access level.");
        return;
      }

      setAccessLevels((prev) => prev.filter((item) => item.id !== id));
      setStatusMessage(`Access level '${levelName}' deleted successfully.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error deleting access level.",
      );
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800"
        >
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Control Bar: Facility Filter and Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`${formId}-facility-filter`}
            className="text-xs font-medium text-neutral-700"
          >
            Facility:
          </label>
          <select
            id={`${formId}-facility-filter`}
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-xs focus:border-neutral-900 focus:outline-hidden"
          >
            <option value="all">All Facilities ({accessLevels.length})</option>
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
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          + Create Access Level
        </button>
      </div>

      {/* Access Level Card List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLevels.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-10 text-center">
            <p className="text-sm font-medium text-neutral-800">
              No access levels found.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Create an access level to bundle doors and schedule templates.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              + Create First Level
            </button>
          </div>
        ) : (
          filteredLevels.map((level) => {
            const fac = facilities.find((f) => f.id === level.facilityId);
            return (
              <div
                key={level.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-neutral-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-bold text-neutral-900">
                      {level.name}
                    </h2>
                    {level.isDefault ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Default
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-neutral-500">
                    {fac?.name ?? level.facilityId}
                  </p>

                  <p className="mt-2 text-xs text-neutral-600 line-clamp-2">
                    {level.description || "No description provided."}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Time Schedule
                      </span>
                      <p className="mt-0.5 font-medium text-neutral-800">
                        {TIME_SCHEDULE_LABELS[level.timeScheduleId] ??
                          `Template ${level.timeScheduleId}`}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          Assigned Doors ({level.doors.length})
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {level.doors.map((door) => (
                          <span
                            key={door}
                            className="inline-flex rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-700"
                          >
                            {door}
                          </span>
                        ))}
                      </div>
                    </div>

                    {level.floors && level.floors.length > 0 ? (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          Elevator Floors ({level.floors.length})
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {level.floors.map((floor) => (
                            <span
                              key={floor}
                              className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                            >
                              {floor}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(level)}
                    className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(level.id, level.name)}
                    className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
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
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-base font-bold text-neutral-950">
                {editingId ? "Edit Access Level" : "Create New Access Level"}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor={`${formId}-target-facility`}
                  className="block text-xs font-medium text-neutral-700"
                >
                  Facility *
                </label>
                <select
                  id={`${formId}-target-facility`}
                  value={targetFacilityId}
                  onChange={(e) => setTargetFacilityId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden"
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
                  className="block text-xs font-medium text-neutral-700"
                >
                  Access Level Name * (max 32 chars)
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
                  placeholder="e.g. Lobby & 1st Floor Turnstiles"
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 shadow-xs focus:outline-hidden ${
                    formErrors.name
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-neutral-300 focus:border-neutral-900"
                  }`}
                />
                {formErrors.name ? (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor={`${formId}-desc`}
                  className="block text-xs font-medium text-neutral-700"
                >
                  Description (max 128 chars)
                </label>
                <input
                  id={`${formId}-desc`}
                  type="text"
                  maxLength={128}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard visitor speedgate and reception turnstiles"
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formId}-schedule`}
                  className="block text-xs font-medium text-neutral-700"
                >
                  Time Schedule Template *
                </label>
                <select
                  id={`${formId}-schedule`}
                  value={timeScheduleId}
                  onChange={(e) =>
                    setTimeScheduleId(
                      Number(e.target.value) as TimeScheduleTemplateId,
                    )
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden"
                >
                  {TIME_SCHEDULE_TEMPLATES.map((tmpl) => (
                    <option key={tmpl} value={tmpl}>
                      {TIME_SCHEDULE_LABELS[tmpl]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doors Management */}
              <div>
                <label className="block text-xs font-medium text-neutral-700">
                  Assigned Doors * (at least 1 door)
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-neutral-300 p-2">
                  {doors.length === 0 ? (
                    <span className="text-xs text-neutral-400">
                      No doors assigned yet. Click a preset or type below.
                    </span>
                  ) : (
                    doors.map((door) => (
                      <span
                        key={door}
                        className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-0.5 text-xs text-white"
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
                  <span className="text-[11px] font-medium text-neutral-500">
                    Quick Presets:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {COMMON_DOOR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddDoor(preset)}
                        className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-700 transition hover:bg-neutral-100"
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
                    placeholder="Custom door name or ID..."
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDoor()}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50"
                  >
                    Add Door
                  </button>
                </div>
              </div>

              {/* Floors Management */}
              <div>
                <label className="block text-xs font-medium text-neutral-700">
                  Elevator Floors (Optional)
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
                            : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
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
                    placeholder="Custom floor (e.g. Roof, Mezzanine)..."
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFloor}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50"
                  >
                    Add Floor
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
                  className="text-xs font-medium text-neutral-800"
                >
                  Set as Default Access Level for visitors in this facility
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : editingId ? "Update Access Level" : "Create Access Level"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
