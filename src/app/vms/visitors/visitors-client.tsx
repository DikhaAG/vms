"use client";

import { useState } from "react";
import Image from "next/image";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import { CERTIFICATE_TYPE_LABELS } from "@/lib/vms/vms-contract";

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
    "User requested personal data erasure under PDP compliance",
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
          message: data.error?.message || "Failed to update profile.",
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
          ? `Profile for ${updatedProfile.fullName} soft-deleted under PDP compliance.`
          : `Profile for ${updatedProfile.fullName} successfully restored.`,
      });

      setSelectedForDelete(null);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Total Tracked Profiles</p>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{profiles.length}</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Retained in VMS application database
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <p className="text-xs font-medium text-emerald-800">
            Active Profiles (Auto-fill Ready)
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{activeCount}</p>
          <p className="mt-1 text-[11px] text-emerald-700">
            One-click returning visitor recognition
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <p className="text-xs font-medium text-amber-800">
            Soft-Deleted / PDP Archived
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-950">{deletedCount}</p>
          <p className="mt-1 text-[11px] text-amber-700">
            Excluded from auto-fill; audit log retained
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID number, phone, or email..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <span>Show Soft-Deleted (PDP Archived)</span>
        </label>
      </div>

      {/* Profiles Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-xs font-semibold text-neutral-900">
              <tr>
                <th className="px-4 py-3">Visitor</th>
                <th className="px-4 py-3">Identity (KTP/ID)</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-center">Visits</th>
                <th className="px-4 py-3">PDP Compliance Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                    No visitor profiles found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className={`transition hover:bg-neutral-50/50 ${
                      profile.isDeleted ? "bg-neutral-50/30 opacity-75" : ""
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
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                            {profile.givenName?.[0] || profile.fullName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-neutral-900">
                            {profile.fullName}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            {profile.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-neutral-900">
                        {CERTIFICATE_TYPE_LABELS[profile.certificateType] || "ID"}
                      </p>
                      <p className="font-mono text-xs text-neutral-600">
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
                      <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-800">
                        {profile.visitCount ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {profile.isDeleted ? (
                        <div>
                          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                            Soft-Deleted / Archived
                          </span>
                          {profile.deletionReason && (
                            <p className="mt-1 text-[11px] text-neutral-500 max-w-[200px] truncate" title={profile.deletionReason}>
                              {profile.deletionReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          Active (PDP Stored)
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {profile.isDeleted ? (
                        <button
                          type="button"
                          disabled={loadingId === profile.id}
                          onClick={() => handleSoftDelete(profile.id, false)}
                          className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-xs hover:bg-neutral-50 transition disabled:opacity-50"
                        >
                          {loadingId === profile.id ? "Restoring..." : "Restore"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingId === profile.id}
                          onClick={() => setSelectedForDelete(profile)}
                          className="inline-flex items-center rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-xs hover:bg-red-100 transition disabled:opacity-50"
                        >
                          Soft-Delete
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900">
              Soft-Delete Visitor Profile
            </h3>

            <p className="text-xs text-neutral-600">
              Archive biometric record and personal data for{" "}
              <strong className="text-neutral-900">
                {selectedForDelete.fullName}
              </strong>{" "}
              (ID: {selectedForDelete.certificateNo}). This disables automatic returning
              visitor recognition while preserving historical audit logs.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Compliance / Erasure Reason
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForDelete(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
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
                  ? "Archiving..."
                  : "Confirm Soft-Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
