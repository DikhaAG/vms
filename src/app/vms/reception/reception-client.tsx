"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { HostEmployee, Visit } from "@/lib/vms/vms-contract";
import {
  CERTIFICATE_TYPE_LABELS,
  DEFAULT_SYSTEM_SETTINGS,
  VISIT_REASON_LABELS,
} from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";
import type {
  CheckInPass,
  VerificationMethod,
} from "@/lib/vms/checkin-contract";
import { VERIFICATION_METHODS } from "@/lib/vms/checkin-contract";
import { toJpegDataUri } from "@/lib/vms/face-normalizer";
import { formatInFacilityTimezone } from "@/lib/vms/timezone";
import {
  UiButton,
  UiCard,
  UiKpiCard,
  UiKpiGrid,
  UiFilterToolbar,
  UiBadge,
  UiModal,
} from "@/components/vms/ui";
import { WalkInModal } from "./walk-in-modal";

interface ReceptionClientProps {
  systemTimezone?: string;
  allAccessLevels: AccessLevel[];
  /** Host employees synced from HikCentral; empty until the first host sync. */
  hosts?: HostEmployee[];
  initialVisits: Visit[];
  initialIssuedPass?: CheckInPass | null;
}

export function ReceptionClient({
  systemTimezone = DEFAULT_SYSTEM_SETTINGS.timezone,
  allAccessLevels,
  hosts = [],
  initialVisits,
  initialIssuedPass = null,
}: ReceptionClientProps) {
  const formId = useId();

  const receptionistUser = {
    id: "rec-01",
    name: "Dewi Frontdesk",
    role: "Front-Desk Receptionist",
  };

  // State: Visits & Filter (Single-Site Global)
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"expected" | "checked_in" | "all">(
    "expected",
  );
  const [isSearching, setIsSearching] = useState(false);

  // State: Verification Modal (Check-in Approved Visit)
  const [verifyingVisit, setVerifyingVisit] = useState<Visit | null>(null);
  const [verificationMethod, setVerificationMethod] =
    useState<VerificationMethod>("id_card");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // State: Issued Pass Modal
  const [issuedPass, setIssuedPass] = useState<CheckInPass | null>(
    initialIssuedPass,
  );
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // State: Walk-in Modal (each open bumps the key so the form remounts clean)
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInSession, setWalkInSession] = useState(0);
  const openWalkIn = () => {
    setWalkInSession((n) => n + 1);
    setIsWalkInModalOpen(true);
  };

  // Global search execution
  const fetchVisits = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const qs = params.toString();
      const res = await fetch(
        `/api/vms/check-in/search${qs ? `?${qs}` : ""}`,
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setVisits(data.data);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVisits(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchVisits]);

  // Filtered visits by tab
  const filteredVisits = visits.filter((v) => {
    if (activeTab === "expected") return v.status === "APPROVED";
    if (activeTab === "checked_in") return v.status === "CHECKED_IN";
    return true;
  });

  const countExpected = visits.filter((v) => v.status === "APPROVED").length;
  const countCheckedIn = visits.filter((v) => v.status === "CHECKED_IN").length;
  const countAll = visits.length;

  // Check-in action execution
  const handleConfirmCheckIn = async () => {
    if (!verifyingVisit) return;
    setIsCheckingIn(true);
    setCheckInError(null);
    try {
      const res = await fetch(`/api/vms/check-in/${verifyingVisit.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receptionistUserId: receptionistUser.id,
          receptionistName: receptionistUser.name,
          verificationMethod,
          notes: checkInNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || "Check-in failed.");
      }

      setVerifyingVisit(null);
      setCheckInNotes("");
      setIssuedPass(json.data.pass);
      await fetchVisits(searchQuery);
    } catch (err) {
      setCheckInError(
        err instanceof Error
          ? err.message
          : "An error occurred during check-in.",
      );
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Retry credential sync
  const handleRetrySync = async () => {
    if (!issuedPass?.visitorId) return;
    setIsRetryingSync(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/vms/credentials/retry-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: issuedPass.visitorId,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSyncFeedback(
          "Perintah sinkronisasi ulang berhasil dikirim ke terminal akses pintu.",
        );
        setIssuedPass({
          ...issuedPass,
          credentialSyncStatus: "Applied",
        });
        await fetchVisits(searchQuery);
      } else {
        setSyncFeedback(json.error || "Sinkronisasi ulang gagal.");
      }
    } catch (err) {
      setSyncFeedback(
        err instanceof Error ? err.message : "Gangguan jaringan.",
      );
    } finally {
      setIsRetryingSync(false);
    }
  };

  const formatVisitWindow = (visit: Visit) => {
    const startTime = formatInFacilityTimezone(
      visit.scheduledStartTimeUtc,
      systemTimezone,
      { dateStyle: undefined, timeStyle: "short" },
    );
    const endTime = formatInFacilityTimezone(
      visit.scheduledEndTimeUtc,
      systemTimezone,
      { dateStyle: undefined, timeStyle: "short" },
    );
    return `${startTime} - ${endTime}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Operator Identity & Fast Actions */}
      <UiCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[var(--ks-radius-md)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] font-bold text-sm border border-[var(--ks-rule)] shadow-2xs">
              DF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--ks-ink)] tracking-tight">
                  {receptionistUser.name}
                </span>
                <span className="rounded-[var(--ks-radius-sm)] bg-[var(--ks-paper-deep)] border border-[var(--ks-rule)] px-2 py-0.5 text-2xs font-mono font-medium text-[var(--ks-ink)]">
                  {receptionistUser.id}
                </span>
              </div>
              <p className="text-xs text-[var(--ks-muted)] mt-0.5">
                Terminal Resepsionis Lobi &bull; Zona Waktu:{" "}
                <span className="font-mono font-semibold text-[var(--ks-ink)]">
                  {systemTimezone}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <UiButton
              variant="primary"
              onClick={openWalkIn}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>+ Daftarkan Tamu Datang Langsung (Walk-in)</span>
            </UiButton>
          </div>
        </div>
      </UiCard>

      {/* Summary KPI Cards */}
      <UiKpiGrid className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UiKpiCard
          label="Tamu Diharapkan Hari Ini"
          value={countExpected}
          description="Menunggu verifikasi masuk"
          variant="normal"
          isSelected={activeTab === "expected"}
          onClick={() => setActiveTab("expected")}
        />
        <UiKpiCard
          label="Sedang di Gedung"
          value={countCheckedIn}
          description="Tamu aktif di dalam"
          variant="quota"
          isSelected={activeTab === "checked_in"}
          onClick={() => setActiveTab("checked_in")}
        />
        <UiKpiCard
          label="Semua Kunjungan"
          value={countAll}
          description="Total kedatangan &amp; terjadwal"
          variant="default"
          isSelected={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        />
      </UiKpiGrid>

      {/* Unified Site-Wide Search Filter Toolbar */}
      <UiFilterToolbar
        searchSlot={
          <div className="relative flex-1 min-w-[240px]">
            <label htmlFor={`${formId}-search`} className="sr-only">
              Cari data tamu
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--ks-muted)]">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id={`${formId}-search`}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tamu berdasarkan nama, nomor telepon, nomor identitas, atau kode QR..."
              className="w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] py-2 pl-9 pr-8 text-xs text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[var(--ks-muted)] hover:text-[var(--ks-ink)] cursor-pointer"
                aria-label="Hapus pencarian"
              >
                &times;
              </button>
            )}
          </div>
        }
        actionsSlot={
          <div className="flex items-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0">
            {[
              {
                id: "expected",
                label: "Tamu Diharapkan Hari Ini",
                count: countExpected,
              },
              {
                id: "checked_in",
                label: "Sedang di Gedung",
                count: countCheckedIn,
              },
              { id: "all", label: "Semua Kunjungan", count: countAll },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-[var(--ks-radius-md)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition cursor-pointer flex items-center gap-1.5 ${activeTab === tab.id
                    ? "bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] shadow-xs"
                    : "text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)]"
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs font-mono font-bold ${activeTab === tab.id
                      ? "bg-[var(--ks-paper-raised)]/20 text-[var(--ks-paper-raised)]"
                      : "bg-[var(--ks-paper-deep)] text-[var(--ks-muted)]"
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        }
      />

      {/* Arrival Queue / Visits Display */}
      {isSearching ? (
        <UiCard className="p-12 text-center text-sm text-[var(--ks-muted)]">
          Memuat antrean kedatangan tamu...
        </UiCard>
      ) : filteredVisits.length === 0 ? (
        <div className="rounded-[var(--ks-radius-md)] border border-dashed border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-12 text-center shadow-xs">
          <svg
            className="mx-auto h-10 w-10 text-[var(--ks-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-bold text-[var(--ks-ink)] tracking-tight">
            {searchQuery
              ? "Tidak Ada Tamu Ditemukan"
              : "Belum Ada Kunjungan Terdaftar Hari Ini"}
          </h3>
          <p className="mt-1 text-xs text-[var(--ks-muted)] max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada tamu yang cocok dengan "${searchQuery}". Coba gunakan kata kunci lain atau daftarkan tamu datang langsung (walk-in).`
              : "Buat jadwal kunjungan baru melalui menu Pra-Registrasi atau layani tamu datang langsung (Walk-in)."}
          </p>
          <div className="mt-4">
            <UiButton
              variant="primary"
              size="sm"
              onClick={openWalkIn}
            >
              Daftarkan Tamu Datang Langsung
            </UiButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVisits.map((visit) => {
            const isApproved = visit.status === "APPROVED";
            const isCheckedIn = visit.status === "CHECKED_IN";
            const visitLevelNames = (visit.accessLevelIds ?? [])
              .map(
                (id) => allAccessLevels.find((al) => al.id === id)?.name ?? id,
              )
              .filter(Boolean);

            return (
              <UiCard
                key={visit.id}
                className={`flex flex-col justify-between p-5 transition hover:border-[var(--ks-rule)] ${isCheckedIn
                    ? "border-[var(--ks-kinpaku)]/50 ring-1 ring-[var(--ks-kinpaku)]/30"
                    : isApproved
                      ? "border-[var(--ks-patina)]/50 ring-1 ring-[var(--ks-patina)]/20"
                      : "border-[var(--ks-rule-subtle)]"
                  }`}
              >
                <div>
                  {/* Top Badge & Photo Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {visit.facePhoto ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={toJpegDataUri(visit.facePhoto)}
                          alt={`${visit.visitorGivenName} ${visit.visitorFamilyName}`}
                          className="h-12 w-12 rounded-full object-cover border border-[var(--ks-rule-subtle)] shadow-2xs"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] text-[var(--ks-ink)] font-bold text-sm border border-[var(--ks-rule-subtle)]">
                          {visit.visitorGivenName[0]}
                          {visit.visitorFamilyName[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-[var(--ks-ink)] leading-tight tracking-tight">
                          {visit.visitorGivenName} {visit.visitorFamilyName}
                        </h4>
                        <p className="text-xs text-[var(--ks-muted)] font-mono mt-0.5">
                          {visit.certificateType
                            ? CERTIFICATE_TYPE_LABELS[visit.certificateType]
                            : "ID"}
                          : {visit.certificateNo || "Tidak dicantumkan"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <UiBadge status={visit.status} />
                      {visit.credentialSyncStatus && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-3xs font-mono font-medium border ${visit.credentialSyncStatus === "Applied"
                              ? "bg-[var(--ks-patina)]/10 text-[var(--ks-patina-deep)] border-[var(--ks-patina)]/30"
                              : visit.credentialSyncStatus === "Failed"
                                ? "bg-[var(--ks-vermilion)]/10 text-[var(--ks-vermilion)] border-[var(--ks-vermilion)]/30"
                                : "bg-[var(--ks-amber)]/10 text-[var(--ks-amber-deep)] border-[var(--ks-amber)]/30"
                            }`}
                        >
                          Sync: {visit.credentialSyncStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visit Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-[var(--ks-text)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ks-muted)]">
                        Karyawan Tuan Rumah:
                      </span>
                      <span className="font-semibold text-[var(--ks-ink)]">
                        {visit.hostName || "Tamu Meja Depan"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ks-muted)]">Keperluan:</span>
                      <span className="font-semibold text-[var(--ks-ink)]">
                        {VISIT_REASON_LABELS[visit.visitReasonType]}
                        {visit.visitReasonDetail
                          ? ` (${visit.visitReasonDetail})`
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ks-muted)]">
                        Jadwal ({systemTimezone}):
                      </span>
                      <span className="font-mono text-[var(--ks-ink)] font-semibold">
                        {formatVisitWindow(visit)}
                      </span>
                    </div>
                    {visitLevelNames.length > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--ks-muted)]">
                          Hak Akses:
                        </span>
                        <span className="font-medium text-[var(--ks-ink)] text-right truncate max-w-[190px]">
                          {visitLevelNames.join(", ")}
                        </span>
                      </div>
                    )}
                    {visit.actualCheckInTimeUtc && (
                      <div className="flex items-center justify-between text-[var(--ks-patina-deep)]">
                        <span>Waktu Masuk:</span>
                        <span className="font-mono font-semibold">
                          {formatInFacilityTimezone(
                            visit.actualCheckInTimeUtc,
                            systemTimezone,
                            { dateStyle: undefined, timeStyle: "short" },
                          )}
                        </span>
                      </div>
                    )}
                    {visit.hikCentral?.pinCode && (
                      <div className="flex items-center justify-between bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)] rounded-[var(--ks-radius-md)] px-2 py-1">
                        <span className="text-[var(--ks-muted)]">
                          Kode PIN:
                        </span>
                        <span className="font-mono font-bold tracking-wider text-[var(--ks-ink)]">
                          {visit.hikCentral.pinCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[var(--ks-rule-subtle)] flex gap-2">
                  {isApproved && (
                    <UiButton
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setVerifyingVisit(visit);
                        setCheckInError(null);
                        setCheckInNotes("");
                      }}
                    >
                      Verifikasi &amp; Proses Masuk
                    </UiButton>
                  )}
                  {isCheckedIn && (
                    <UiButton
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setIssuedPass({
                          visitId: visit.id,
                          visitorName: `${visit.visitorGivenName} ${visit.visitorFamilyName}`,
                          visitorFamilyName: visit.visitorFamilyName,
                          visitorGivenName: visit.visitorGivenName,
                          visitorPhone: visit.visitorPhone,
                          visitorEmail: visit.visitorEmail,
                          certificateNo: visit.certificateNo,
                          hostName: visit.hostName,
                          scheduledStartTime: visit.scheduledStartTimeFacility,
                          scheduledEndTime: visit.scheduledEndTimeFacility,
                          actualCheckInTimeUtc:
                            visit.actualCheckInTimeUtc ||
                            new Date().toISOString(),
                          qrCodeImage: visit.hikCentral?.qrCodeImage,
                          pinCode: visit.hikCentral?.pinCode,
                          appointRecordId:
                            visit.hikCentral?.appointRecordId || "",
                          visitorId: visit.hikCentral?.visitorId || "",
                          credentialSyncStatus:
                            visit.credentialSyncStatus || "Applied",
                          accessLevelNames: visitLevelNames,
                        });
                        setSyncFeedback(null);
                      }}
                    >
                      Lihat Lencana Akses
                    </UiButton>
                  )}
                </div>
              </UiCard>
            );
          })}
        </div>
      )}

      {/* Verification & Check-in Modal */}
      <UiModal
        isOpen={Boolean(verifyingVisit)}
        onClose={() => {
          setVerifyingVisit(null);
          setCheckInError(null);
        }}
        title="Verifikasi Identitas Tamu"
        description="Periksa kesesuaian foto dan dokumen identitas fisik sebelum mengaktifkan hak akses pintu."
        size="lg"
        footer={
          <>
            <UiButton
              variant="secondary"
              onClick={() => {
                setVerifyingVisit(null);
                setCheckInError(null);
              }}
              disabled={isCheckingIn}
            >
              Batal
            </UiButton>
            <UiButton
              variant="primary"
              onClick={handleConfirmCheckIn}
              isLoading={isCheckingIn}
            >
              Konfirmasi &amp; Proses Masuk
            </UiButton>
          </>
        }
      >
        {checkInError && (
          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/10 p-3 text-xs text-[var(--ks-vermilion)]">
            {checkInError}
          </div>
        )}
        {verifyingVisit && (
          <>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                {verifyingVisit.facePhoto ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={toJpegDataUri(verifyingVisit.facePhoto)}
                    alt="Foto Tamu"
                    className="h-28 w-28 rounded-[var(--ks-radius-md)] object-cover border-2 border-[var(--ks-patina)] shadow-sm"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-[var(--ks-radius-md)] bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] font-medium text-xs border border-[var(--ks-rule-subtle)]">
                    Tanpa Foto Wajah
                  </div>
                )}
                <span className="mt-1.5 text-3xs font-medium text-[var(--ks-muted)]">
                  {verifyingVisit.facePhoto
                    ? "Biometrik Wajah Terdaftar"
                    : "Hanya Lencana Fisik / Kartu"}
                </span>
              </div>

              <div className="flex-1 space-y-1.5 text-xs text-[var(--ks-text)]">
                <div>
                  <span className="text-[var(--ks-muted)]">Nama Lengkap:</span>
                  <p className="font-bold text-[var(--ks-ink)] text-sm tracking-tight">
                    {verifyingVisit.visitorGivenName}{" "}
                    {verifyingVisit.visitorFamilyName}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--ks-muted)]">
                    Nomor Identitas:
                  </span>
                  <p className="font-mono text-[var(--ks-ink)] font-semibold">
                    {verifyingVisit.certificateType
                      ? CERTIFICATE_TYPE_LABELS[verifyingVisit.certificateType]
                      : "ID"}
                    : {verifyingVisit.certificateNo || "Tidak dicantumkan"}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--ks-muted)]">
                    Karyawan Tuan Rumah:
                  </span>
                  <p className="text-[var(--ks-ink)] font-semibold">
                    {verifyingVisit.hostName || "Tamu Meja Depan"}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--ks-muted)]">
                    Jam Kunjungan ({systemTimezone}):
                  </span>
                  <p className="font-mono text-[var(--ks-ink)] font-semibold">
                    {formatVisitWindow(verifyingVisit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--ks-rule-subtle)] pt-4">
              <span className="block text-xs font-bold text-[var(--ks-ink)] mb-2">
                Metode Verifikasi yang Diterapkan:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {VERIFICATION_METHODS.map((m) => {
                  const methodLabels: Record<string, string> = {
                    id_card: "KTP / Dokumen Fisik",
                    biometric_face: "Biometrik Wajah",
                    escort: "Didampingi Petugas",
                    manual_override: "Izin Khusus / Override",
                  };
                  return (
                    <label
                      key={m}
                      className={`flex items-center gap-2 rounded-[var(--ks-radius-md)] border p-2 cursor-pointer transition ${verificationMethod === m
                          ? "border-[var(--ks-patina-deep)] bg-[var(--ks-patina)]/15 text-[var(--ks-ink)] font-bold shadow-2xs"
                          : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] hover:border-[var(--ks-rule)] text-[var(--ks-text)]"
                        }`}
                    >
                      <input
                        type="radio"
                        name="verificationMethod"
                        value={m}
                        checked={verificationMethod === m}
                        onChange={() => setVerificationMethod(m)}
                        className="text-[var(--ks-patina-deep)] focus:ring-[var(--ks-patina-deep)]"
                      />
                      <span>{methodLabels[m] || m.replace("_", " ")}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-3">
              <label
                htmlFor="checkInNotes"
                className="block text-xs font-semibold text-[var(--ks-text)] mb-1"
              >
                Catatan Resepsionis (Opsional):
              </label>
              <input
                id="checkInNotes"
                type="text"
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Contoh: Kartu KTP asli telah diperiksa dan sesuai identitas tamu."
                className="w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-3 py-1.5 text-xs text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-kinpaku)] focus:ring-1 focus:ring-[var(--ks-kinpaku)] outline-hidden"
              />
            </div>
          </>
        )}
      </UiModal>

      {/* Walk-in Registration Modal (remounted per open for a fresh form) */}
      <WalkInModal
        key={walkInSession}
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        systemTimezone={systemTimezone}
        allAccessLevels={allAccessLevels}
        hosts={hosts}
        receptionist={receptionistUser}
        onRegistered={async (pass) => {
          setIsWalkInModalOpen(false);
          setIssuedPass(pass);
          await fetchVisits(searchQuery);
        }}
      />

      {/* Check-in Pass Modal (QR, PIN, Site-Wide Access & Print Badge) */}
      <UiModal
        isOpen={Boolean(issuedPass)}
        onClose={() => {
          setIssuedPass(null);
          setSyncFeedback(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <span>Lencana Kunjungan Tamu</span>
            <UiBadge variant="normal" showDot={false}>
              Lencana Masuk Aktif
            </UiBadge>
          </div>
        }
        description="Lencana akses digital dan kode verifikasi pintu fisik seluruh gedung."
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <UiButton
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => window.print()}
            >
              <svg
                className="h-4 w-4 text-[var(--ks-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Cetak Lencana Tamu</span>
            </UiButton>
            <UiButton
              type="button"
              variant="primary"
              className="flex-1"
              onClick={() => {
                setIssuedPass(null);
                setSyncFeedback(null);
              }}
            >
              Selesai
            </UiButton>
          </div>
        }
      >
        {issuedPass && (
          <div className="flex flex-col items-center text-center">
            <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-white p-4 shadow-sm">
              {issuedPass.qrCodeImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`data:image/png;base64,${issuedPass.qrCodeImage}`}
                  alt="QR Akses Masuk Tamu"
                  className="h-44 w-44 object-contain"
                />
              ) : (
                <div className="flex h-44 w-44 items-center justify-center rounded-[var(--ks-radius-md)] bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] font-mono text-xs">
                  Lencana QR Aktif
                </div>
              )}
            </div>

            {issuedPass.pinCode && (
              <div className="mt-3 w-full rounded-[var(--ks-radius-md)] bg-[var(--ks-ink)] py-2.5 text-[var(--ks-paper-raised)] border border-black">
                <span className="block text-3xs uppercase tracking-widest text-[var(--ks-muted)] font-mono">
                  Kode PIN Masuk Terminal Pintu
                </span>
                <span className="font-mono text-2xl font-bold tracking-widest text-[var(--ks-kinpaku)]">
                  {issuedPass.pinCode}
                </span>
              </div>
            )}

            <div className="mt-4 w-full space-y-1.5 text-left text-xs bg-[var(--ks-paper-deep)] p-3.5 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)]">
              <div className="flex justify-between">
                <span className="text-[var(--ks-muted)]">Nama Tamu:</span>
                <span className="font-bold text-[var(--ks-ink)]">
                  {issuedPass.visitorName}
                </span>
              </div>
              {issuedPass.hostName && (
                <div className="flex justify-between">
                  <span className="text-[var(--ks-muted)]">Tuan Rumah:</span>
                  <span className="font-medium text-[var(--ks-ink)]">
                    {issuedPass.hostName}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--ks-muted)]">
                  Jam Kunjungan ({systemTimezone}):
                </span>
                <span className="font-mono text-[var(--ks-ink)]">
                  {issuedPass.scheduledStartTime.split("T")[1]?.substring(0, 5)}{" "}
                  -{" "}
                  {issuedPass.scheduledEndTime.split("T")[1]?.substring(0, 5)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ks-muted)]">Waktu Masuk:</span>
                <span className="font-mono text-[var(--ks-patina)] font-medium">
                  {formatInFacilityTimezone(
                    issuedPass.actualCheckInTimeUtc,
                    systemTimezone,
                    { dateStyle: undefined, timeStyle: "short" },
                  )}
                </span>
              </div>
              {issuedPass.accessLevelNames &&
                issuedPass.accessLevelNames.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--ks-muted)]">
                      Hak Akses Pintu:
                    </span>
                    <span className="font-semibold text-[var(--ks-ink)] text-right">
                      {issuedPass.accessLevelNames.join(", ")}
                    </span>
                  </div>
                )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--ks-rule-subtle)]">
                <span className="text-[var(--ks-muted)] font-medium">
                  Sinkronisasi Terminal:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-2xs font-semibold border ${issuedPass.credentialSyncStatus === "Applied"
                        ? "border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 text-[var(--ks-patina)]"
                        : issuedPass.credentialSyncStatus === "Failed"
                          ? "border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/15 text-[var(--ks-vermilion)]"
                          : "border-[var(--ks-kinpaku)]/30 bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)]"
                      }`}
                  >
                    {issuedPass.credentialSyncStatus}
                  </span>
                  {(issuedPass.credentialSyncStatus === "Failed" ||
                    issuedPass.credentialSyncStatus === "Syncing" ||
                    issuedPass.credentialSyncStatus === "Unknown") && (
                      <UiButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleRetrySync}
                        isLoading={isRetryingSync}
                      >
                        Kirim Ulang
                      </UiButton>
                    )}
                </div>
              </div>
              {syncFeedback && (
                <p className="text-3xs text-[var(--ks-patina)] pt-1">
                  {syncFeedback}
                </p>
              )}
            </div>
          </div>
        )}
      </UiModal>
    </div>
  );
}