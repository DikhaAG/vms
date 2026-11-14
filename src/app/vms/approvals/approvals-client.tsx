"use client";

import { useId, useState } from "react";
import type { Facility, Visit } from "@/lib/vms/vms-contract";
import {
  CERTIFICATE_TYPE_LABELS,
  VISIT_REASON_LABELS,
} from "@/lib/vms/vms-contract";
import type { ApprovalAction } from "@/lib/vms/approval-contract";

interface ApprovalsClientProps {
  facilities: Facility[];
  initialPendingVisits: Visit[];
  initialEscalatedVisits: Visit[];
}

export function ApprovalsClient({
  facilities,
  initialPendingVisits,
  initialEscalatedVisits,
}: ApprovalsClientProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "escalated">("pending");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");
  const [approverRole, setApproverRole] = useState<"Host Approver" | "Security Officer">(
    "Host Approver",
  );

  const [pendingVisits, setPendingVisits] = useState<Visit[]>(initialPendingVisits);
  const [escalatedVisits, setEscalatedVisits] = useState<Visit[]>(initialEscalatedVisits);
  const [decidedVisits, setDecidedVisits] = useState<Visit[]>([]);

  // Action states
  const [submittingVisitId, setSubmittingVisitId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Rejection modal
  const [rejectionTarget, setRejectionTarget] = useState<Visit | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const facilityFilterId = useId();
  const approverPersonaId = useId();
  const commentInputId = useId();

  // Filter lists based on facility
  const filteredPending = pendingVisits.filter(
    (v) => selectedFacilityId === "all" || v.facilityId === selectedFacilityId,
  );
  const filteredEscalated = escalatedVisits.filter(
    (v) => selectedFacilityId === "all" || v.facilityId === selectedFacilityId,
  );

  async function handleDecision(
    visit: Visit,
    action: ApprovalAction,
    comment?: string,
  ) {
    setSubmittingVisitId(visit.id);
    setNotification(null);

    try {
      const response = await fetch(`/api/vms/approvals/${visit.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment,
          approverId:
            approverRole === "Security Officer" ? "sec-officer-01" : "mgr-host-01",
          approverName:
            approverRole === "Security Officer"
              ? "Chief Security Officer"
              : "Department Manager",
          approverRole,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          json.error?.message || `Failed to ${action} visit (${response.status})`,
        );
      }

      const updatedVisit: Visit = json.data.visit;

      // Remove from current queue and add to decided
      setPendingVisits((prev) => prev.filter((v) => v.id !== visit.id));
      setEscalatedVisits((prev) => prev.filter((v) => v.id !== visit.id));
      setDecidedVisits((prev) => [updatedVisit, ...prev]);

      // Close modal if open
      setRejectionTarget(null);
      setRejectionComment("");
      setRejectionError(null);

      const actionText = action === "approve" ? "disetujui" : "ditolak";
      setNotification({
        type: "success",
        message: `Pengajuan kunjungan untuk ${visit.visitorFamilyName} ${visit.visitorGivenName} berhasil ${actionText}.`,
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kendala yang tidak terduga.",
      });
    } finally {
      setSubmittingVisitId(null);
    }
  }

  function openRejectionModal(visit: Visit) {
    setRejectionTarget(visit);
    setRejectionComment("");
    setRejectionError(null);
  }

  function handleConfirmReject() {
    if (!rejectionTarget) return;
    const trimmed = rejectionComment.trim();
    if (!trimmed) {
      setRejectionError("Rejection reason comment is mandatory.");
      return;
    }
    handleDecision(rejectionTarget, "reject", trimmed);
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          role="alert"
          className={`flex items-start justify-between rounded-lg p-4 text-sm font-medium ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-4 text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Bar: Filters & Persona */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label
              htmlFor={facilityFilterId}
              className="block text-xs font-medium text-neutral-600 mb-1"
            >
              Saring Gedung:
            </label>
            <select
              id={facilityFilterId}
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="all">Semua Gedung Fasilitas ({facilities.length})</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.timezone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={approverPersonaId}
              className="block text-xs font-medium text-neutral-600 mb-1"
            >
              Peran Penyetuju:
            </label>
            <select
              id={approverPersonaId}
              value={approverRole}
              onChange={(e) =>
                setApproverRole(
                  e.target.value as "Host Approver" | "Security Officer",
                )
              }
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="Host Approver">Pejabat Penyetuju (Tuan Rumah)</option>
              <option value="Security Officer">Petugas Keamanan (Satpam)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Antrean Aktif:</span>
          <span className="font-semibold text-neutral-900">
            {filteredPending.length} Menunggu Persetujuan
          </span>
          <span>&bull;</span>
          <span className="font-semibold text-rose-600">
            {filteredEscalated.length} Eskalasi Daftar Pantauan
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6" aria-label="Approval Queues">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === "pending"
                ? "border-neutral-950 text-neutral-950"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
          >
            <span>Menunggu Persetujuan Normal</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "pending"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {filteredPending.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("escalated")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === "escalated"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-neutral-500 hover:border-rose-300 hover:text-rose-600"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 text-rose-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>Eskalasi Daftar Pantauan</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "escalated"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {filteredEscalated.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Main Queue List */}
      <div className="space-y-4">
        {activeTab === "pending" && (
          <>
            {filteredPending.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
                <p className="text-sm font-medium text-neutral-900">
                  Tidak Ada Kunjungan Menunggu Persetujuan
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Seluruh jadwal kunjungan untuk fasilitas ini telah selesai diproses.
                </p>
              </div>
            ) : (
              filteredPending.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  isSubmitting={submittingVisitId === visit.id}
                  onApprove={() => handleDecision(visit, "approve")}
                  onReject={() => openRejectionModal(visit)}
                />
              ))
            )}
          </>
        )}

        {activeTab === "escalated" && (
          <>
            {filteredEscalated.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
                <p className="text-sm font-medium text-neutral-900">
                  Tidak Ada Eskalasi Daftar Pantauan
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Tidak ada tamu yang teridentifikasi dalam Daftar Pantauan Keamanan (Monitoring List).
                </p>
              </div>
            ) : (
              filteredEscalated.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  isSubmitting={submittingVisitId === visit.id}
                  isEscalated
                  onApprove={() => handleDecision(visit, "approve")}
                  onReject={() => openRejectionModal(visit)}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Decided History Section */}
      {decidedVisits.length > 0 && (
        <div className="mt-12 pt-8 border-t border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">
            Kunjungan yang Baru Saja Diputuskan Sesi Ini ({decidedVisits.length})
          </h2>
          <div className="space-y-3">
            {decidedVisits.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] ${
                      v.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {v.status}
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {v.visitorFamilyName} {v.visitorGivenName}
                  </span>
                  <span className="text-neutral-500">({v.facilityName})</span>
                  {v.approvalRecord?.comment && (
                    <span className="italic text-neutral-600">
                      &ldquo;{v.approvalRecord.comment}&rdquo;
                    </span>
                  )}
                </div>
                <div className="text-neutral-500">
                  By {v.approvalRecord?.approverName} ({v.approvalRecord?.approverRole})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {rejectionTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-950">
                Reject Visit Request
              </h3>
              <p className="mt-1 text-xs text-neutral-600">
                Provide a mandatory reason for rejecting this visit for{" "}
                <strong className="text-neutral-900">
                  {rejectionTarget.visitorFamilyName} {rejectionTarget.visitorGivenName}
                </strong>
                . This comment is recorded in the permanent audit trail.
              </p>
            </div>

            <div>
              <label
                htmlFor={commentInputId}
                className="block text-xs font-medium text-neutral-700 mb-1"
              >
                Rejection Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                id={commentInputId}
                rows={3}
                value={rejectionComment}
                onChange={(e) => {
                  setRejectionComment(e.target.value);
                  if (rejectionError) setRejectionError(null);
                }}
                placeholder="e.g. Host traveling, incorrect facility selected, or prohibited entry..."
                className={`w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 ${
                  rejectionError
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                    : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900"
                }`}
              />
              {rejectionError && (
                <p className="mt-1 text-xs text-rose-600">{rejectionError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectionTarget(null);
                  setRejectionComment("");
                  setRejectionError(null);
                }}
                disabled={submittingVisitId !== null}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submittingVisitId !== null}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50"
              >
                {submittingVisitId ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VisitCardProps {
  visit: Visit;
  isSubmitting: boolean;
  isEscalated?: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function VisitCard({
  visit,
  isSubmitting,
  isEscalated = false,
  onApprove,
  onReject,
}: VisitCardProps) {
  const certificateLabel =
    visit.certificateType !== undefined
      ? CERTIFICATE_TYPE_LABELS[visit.certificateType] || "ID"
      : "ID";

  const reasonLabel =
    visit.visitReasonType !== undefined
      ? VISIT_REASON_LABELS[visit.visitReasonType] || "General"
      : "General";

  return (
    <div
      className={`rounded-xl border p-5 transition shadow-2xs ${
        isEscalated
          ? "border-rose-300 bg-rose-50/30 ring-1 ring-rose-200"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      }`}
    >
      {/* Blacklist Alert Header */}
      {isEscalated && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-100/70 p-3 text-xs text-rose-900">
          <svg
            className="h-5 w-5 shrink-0 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px] text-rose-800">
              Peringatan: Tamu Teridentifikasi Dalam Daftar Pantauan Keamanan
            </span>
            <p className="mt-0.5">
              {visit.monitoringListFlag?.reason ||
                "Nomor identitas tamu cocok dengan daftar pantauan keamanan aktif."}
            </p>
            {visit.monitoringListFlag?.matches &&
              visit.monitoringListFlag.matches.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-medium text-rose-700">
                  <span>
                    Nomor Identitas Cocok:{" "}
                    <code>{visit.monitoringListFlag.matches[0].certificateNo}</code>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Kategori: {visit.monitoringListFlag.matches[0].type || "Prohibited"}
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* Face Photo / Avatar Preview */}
        <div className="shrink-0">
          {visit.facePhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={visit.facePhoto}
              alt={`${visit.visitorFamilyName} ${visit.visitorGivenName}`}
              className="h-20 w-20 rounded-xl object-cover ring-1 ring-neutral-300 shadow-2xs"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-neutral-100 ring-1 ring-neutral-200 text-neutral-400 font-semibold text-lg">
              {visit.visitorFamilyName?.charAt(0) || "V"}
              {visit.visitorGivenName?.charAt(0) || ""}
            </div>
          )}
        </div>

        {/* Visit Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-neutral-950">
                {visit.visitorGivenName} {visit.visitorFamilyName}
              </h3>
              <p className="text-xs text-neutral-500">
                {certificateLabel}:{" "}
                <span className="font-mono font-medium text-neutral-700">
                  {visit.certificateNo || "Tidak dicantumkan"}
                </span>
                {visit.visitorPhone && (
                  <>
                    {" "}
                    &bull; <span>{visit.visitorPhone}</span>
                  </>
                )}
                {visit.visitorEmail && (
                  <>
                    {" "}
                    &bull; <span>{visit.visitorEmail}</span>
                  </>
                )}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isEscalated
                  ? "bg-rose-100 text-rose-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {isEscalated ? "ESKALASI KEAMANAN" : "MENUNGGU PERSETUJUAN"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-neutral-600">
            <div>
              <span className="font-medium text-neutral-700">Gedung:</span>{" "}
              {visit.facilityName}
            </div>
            <div>
              <span className="font-medium text-neutral-700">Tuan Rumah:</span>{" "}
              {visit.hostName || "Belum ditentukan"}{" "}
              {visit.hostId && (
                <span className="text-neutral-400">({visit.hostId})</span>
              )}
            </div>
            <div>
              <span className="font-medium text-neutral-700">Jadwal Kunjungan:</span>{" "}
              <span className="font-mono text-neutral-800">
                {visit.scheduledStartTimeFacility} &rarr;{" "}
                {visit.scheduledEndTimeFacility}
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Keperluan:</span>{" "}
              {reasonLabel}
              {visit.visitReasonDetail && ` - ${visit.visitReasonDetail}`}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={isSubmitting}
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition disabled:opacity-50"
        >
          {isSubmitting ? "Memproses..." : "Tolak Kunjungan"}
        </button>

        <button
          type="button"
          onClick={onApprove}
          disabled={isSubmitting}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${
            isEscalated
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-neutral-900 hover:bg-neutral-800"
          }`}
        >
          {isSubmitting
            ? "Mengesahkan..."
            : isEscalated
              ? "Abaikan Peringatan & Setujui"
              : "Setujui Kunjungan"}
        </button>
      </div>
    </div>
  );
}
