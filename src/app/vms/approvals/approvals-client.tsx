"use client";

import { useId, useState } from "react";
import type { Visit } from "@/lib/vms/vms-contract";
import {
  CERTIFICATE_TYPE_LABELS,
  VISIT_REASON_LABELS,
} from "@/lib/vms/vms-contract";
import type { ApprovalAction } from "@/lib/vms/approval-contract";
import {
  UiButton,
  UiCard,
  UiFilterToolbar,
  UiBadge,
  UiModal,
} from "@/components/vms/ui";

interface ApprovalsClientProps {
  initialPendingVisits: Visit[];
  initialEscalatedVisits: Visit[];
}

export function ApprovalsClient({
  initialPendingVisits,
  initialEscalatedVisits,
}: ApprovalsClientProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "escalated">("pending");
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

  const approverPersonaId = useId();
  const commentInputId = useId();

  // Single-site: the queue is always the whole building.
  const filteredPending = pendingVisits;
  const filteredEscalated = escalatedVisits;

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
      closeRejectionModal();

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

  function closeRejectionModal() {
    setRejectionTarget(null);
    setRejectionComment("");
    setRejectionError(null);
  }

  function handleConfirmReject() {
    if (!rejectionTarget) return;
    const trimmed = rejectionComment.trim();
    if (!trimmed) {
      setRejectionError("Alasan penolakan wajib diisi.");
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
          className={`flex items-start justify-between rounded-[var(--ks-radius-md)] p-4 text-xs sm:text-sm font-medium border ${
            notification.type === "success"
              ? "bg-[var(--ks-patina)]/10 text-[var(--ks-patina-deep)] border-[var(--ks-patina)]/30"
              : "bg-[var(--ks-vermilion)]/10 text-[var(--ks-vermilion)] border-[var(--ks-vermilion)]/30"
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-4 text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Control Bar: Filters & Persona */}
      <UiFilterToolbar
        filterSlot={
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label
                htmlFor={approverPersonaId}
                className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1"
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
                className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs font-medium text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              >
                <option value="Host Approver">Pejabat Penyetuju (Tuan Rumah)</option>
                <option value="Security Officer">Petugas Keamanan (Satpam)</option>
              </select>
            </div>
          </div>
        }
        actionsSlot={
          <div className="flex items-center gap-2 text-xs text-[var(--ks-muted)]">
            <span className="text-2xs uppercase tracking-wider font-semibold">Antrean Aktif:</span>
            <span className="font-semibold text-[var(--ks-ink)]">
              {filteredPending.length} Menunggu Persetujuan
            </span>
            <span>&bull;</span>
            <span className="font-semibold text-[var(--ks-vermilion)]">
              {filteredEscalated.length} Eskalasi Daftar Pantauan
            </span>
          </div>
        }
      />

      {/* Queue Tabs */}
      <div className="border-b border-[var(--ks-rule-subtle)]">
        <nav className="flex space-x-6" aria-label="Approval Queues">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === "pending"
                ? "border-[var(--ks-ink)] text-[var(--ks-ink)]"
                : "border-transparent text-[var(--ks-muted)] hover:border-[var(--ks-rule)] hover:text-[var(--ks-ink)]"
            }`}
          >
            <span>Menunggu Persetujuan Normal</span>
            <span
              className={`rounded-full px-2 py-0.5 text-2xs font-mono font-bold ${
                activeTab === "pending"
                  ? "bg-[var(--ks-ink)] text-[var(--ks-paper-raised)]"
                  : "bg-[var(--ks-paper-deep)] text-[var(--ks-muted)]"
              }`}
            >
              {filteredPending.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("escalated")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === "escalated"
                ? "border-[var(--ks-vermilion)] text-[var(--ks-vermilion)]"
                : "border-transparent text-[var(--ks-muted)] hover:border-[var(--ks-vermilion)]/40 hover:text-[var(--ks-vermilion)]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 text-[var(--ks-vermilion)]"
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
              className={`rounded-full px-2 py-0.5 text-2xs font-mono font-bold ${
                activeTab === "escalated"
                  ? "bg-[var(--ks-vermilion)] text-white"
                  : "bg-[var(--ks-vermilion)]/15 text-[var(--ks-vermilion)]"
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
              <div className="rounded-[var(--ks-radius-md)] border border-dashed border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] text-xl font-bold font-mono">
                  0
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--ks-ink)]">
                  Tidak Ada Permohonan Kunjungan Tertunda
                </p>
                <p className="mt-1 text-xs text-[var(--ks-muted)] max-w-md mx-auto">
                  Seluruh permohonan kunjungan telah disetujui atau ditolak.
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
              <div className="rounded-[var(--ks-radius-md)] border border-dashed border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] text-xl font-bold font-mono">
                  0
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--ks-ink)]">
                  Tidak Ada Eskalasi Daftar Pantauan
                </p>
                <p className="mt-1 text-xs text-[var(--ks-muted)]">
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
        <div className="mt-12 pt-8 border-t border-[var(--ks-rule-subtle)]">
          <h2 className="text-sm font-bold text-[var(--ks-ink)] mb-4">
            Kunjungan yang Baru Saja Diputuskan Sesi Ini ({decidedVisits.length})
          </h2>
          <div className="space-y-3">
            {decidedVisits.map((v) => (
              <div
                key={v.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-4 py-3 text-xs"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <UiBadge status={v.status} />
                  <span className="font-semibold text-[var(--ks-ink)]">
                    {v.visitorFamilyName} {v.visitorGivenName}
                  </span>
                  {v.approvalRecord?.comment && (
                    <span className="italic text-[var(--ks-muted)]">
                      &ldquo;{v.approvalRecord.comment}&rdquo;
                    </span>
                  )}
                </div>
                <div className="text-[var(--ks-muted)] text-2xs">
                  Oleh {v.approvalRecord?.approverName} ({v.approvalRecord?.approverRole})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      <UiModal
        isOpen={Boolean(rejectionTarget)}
        onClose={closeRejectionModal}
        size="md"
        title="Tolak Permohonan Kunjungan"
        description={
          rejectionTarget ? (
            <>
              Berikan alasan wajib penolakan kunjungan untuk{" "}
              <strong className="text-[var(--ks-ink)] font-semibold">
                {rejectionTarget.visitorFamilyName} {rejectionTarget.visitorGivenName}
              </strong>
              . Catatan ini akan dicatat dalam jejak audit permanen.
            </>
          ) : undefined
        }
        footer={
          <>
            <UiButton
              variant="secondary"
              size="sm"
              onClick={closeRejectionModal}
              disabled={submittingVisitId !== null}
            >
              Batal
            </UiButton>
            <UiButton
              variant="danger"
              size="sm"
              onClick={handleConfirmReject}
              disabled={submittingVisitId !== null}
              isLoading={submittingVisitId !== null}
            >
              Konfirmasi Penolakan
            </UiButton>
          </>
        }
      >
        <div>
          <label
            htmlFor={commentInputId}
            className="block text-xs font-bold text-[var(--ks-ink)] mb-1"
          >
            Alasan Penolakan <span className="text-[var(--ks-vermilion)]">*</span>
          </label>
          <textarea
            id={commentInputId}
            rows={3}
            value={rejectionComment}
            onChange={(e) => {
              setRejectionComment(e.target.value);
              if (rejectionError) setRejectionError(null);
            }}
            placeholder="Contoh: Tuan rumah sedang dinas luar, lokasi gedung tidak sesuai, atau akses tidak diizinkan..."
            className={`w-full rounded-[var(--ks-radius-md)] border bg-[var(--ks-paper)] px-3 py-2 text-xs sm:text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:outline-hidden focus:ring-1 ${
              rejectionError
                ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-[var(--ks-vermilion)]"
                : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-kinpaku)] focus:ring-[var(--ks-kinpaku)]"
            }`}
          />
          {rejectionError && (
            <p className="mt-1 text-xs text-[var(--ks-vermilion)] font-medium">
              {rejectionError}
            </p>
          )}
        </div>
      </UiModal>
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
    <UiCard
      className={`p-5 transition shadow-xs ${
        isEscalated
          ? "border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/5 ring-1 ring-[var(--ks-vermilion)]/20"
          : "hover:border-[var(--ks-kinpaku)]/40"
      }`}
    >
      {/* Blacklist Alert Header */}
      {isEscalated && (
        <div className="mb-4 flex items-start gap-3 rounded-[var(--ks-radius-md)] border border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/10 p-3.5 text-xs text-[var(--ks-vermilion)]">
          <svg
            className="h-5 w-5 shrink-0 text-[var(--ks-vermilion)]"
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
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full ks-led-vermilion" />
              <span className="font-bold uppercase tracking-wider text-2xs text-[var(--ks-vermilion)]">
                Peringatan: Tamu Teridentifikasi Dalam Daftar Pantauan Keamanan
              </span>
            </div>
            <p className="mt-1 text-[var(--ks-ink)] font-medium">
              {visit.monitoringListFlag?.reason ||
                "Nomor identitas tamu cocok dengan daftar pantauan keamanan aktif."}
            </p>
            {visit.monitoringListFlag?.matches &&
              visit.monitoringListFlag.matches.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2 text-2xs font-mono font-medium text-[var(--ks-vermilion)]">
                  <span>
                    Nomor Identitas Cocok:{" "}
                    <code className="bg-[var(--ks-paper)] px-1 py-0.5 rounded border border-[var(--ks-vermilion)]/30">
                      {visit.monitoringListFlag.matches[0].certificateNo}
                    </code>
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
              className="h-20 w-20 rounded-[var(--ks-radius-md)] object-cover ring-1 ring-[var(--ks-rule)] shadow-xs"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-[var(--ks-radius-md)] bg-[var(--ks-paper-deep)] ring-1 ring-[var(--ks-rule-subtle)] text-[var(--ks-muted)] font-bold text-lg font-mono">
              {visit.visitorFamilyName?.charAt(0) || "V"}
              {visit.visitorGivenName?.charAt(0) || ""}
            </div>
          )}
        </div>

        {/* Visit Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[var(--ks-ink)]">
                {visit.visitorGivenName} {visit.visitorFamilyName}
              </h3>
              <p className="text-xs text-[var(--ks-muted)]">
                {certificateLabel}:{" "}
                <span className="font-mono font-medium text-[var(--ks-ink)]">
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

            <UiBadge
              variant={isEscalated ? "danger" : "warning"}
              label={isEscalated ? "ESKALASI KEAMANAN" : "MENUNGGU PERSETUJUAN"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-[var(--ks-muted)]">
            <div>
              <span className="font-semibold text-[var(--ks-ink)]">Tuan Rumah:</span>{" "}
              {visit.hostName || "Belum ditentukan"}{" "}
              {visit.hostId && (
                <span className="text-[var(--ks-muted)]/70 font-mono">({visit.hostId})</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-[var(--ks-ink)]">Jadwal Kunjungan:</span>{" "}
              <span className="font-mono text-[var(--ks-ink)]">
                {visit.scheduledStartTimeFacility} &rarr;{" "}
                {visit.scheduledEndTimeFacility}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[var(--ks-ink)]">Keperluan:</span>{" "}
              {reasonLabel}
              {visit.visitReasonDetail && ` - ${visit.visitReasonDetail}`}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-4 border-t border-[var(--ks-rule-subtle)] flex items-center justify-end gap-3">
        <UiButton
          variant="secondary"
          size="sm"
          onClick={onReject}
          disabled={isSubmitting}
          className="text-[var(--ks-vermilion)] hover:text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/10"
        >
          {isSubmitting ? "Memproses..." : "Tolak Kunjungan"}
        </UiButton>

        <UiButton
          variant={isEscalated ? "danger" : "primary"}
          size="sm"
          onClick={onApprove}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Mengesahkan..."
            : isEscalated
              ? "Abaikan Peringatan & Setujui"
              : "Setujui Kunjungan"}
        </UiButton>
      </div>
    </UiCard>
  );
}
