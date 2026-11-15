"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { Facility } from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";
import type {
  GroupVisitResult,
  VisitorProfile,
} from "@/lib/vms/group-contract";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  VISIT_REASON_LABELS,
  VISIT_REASON_TYPES,
  type CertificateType,
  type VisitReasonType,
} from "@/lib/vms/vms-contract";
import { idDict } from "@/lib/vms/i18n/id";
import {
  UiButton,
  UiCard,
  UiCardHeader,
  UiCardContent,
  UiBadge,
} from "@/components/vms/ui";

interface VisitorFormRow {
  visitorFamilyName: string;
  visitorGivenName: string;
  visitorPhone: string;
  visitorEmail: string;
  certificateType: number;
  certificateNo: string;
  facePhoto?: string;
  lookupResult?: {
    checked: boolean;
    found: boolean;
    profile?: VisitorProfile;
  };
  isLookingUp?: boolean;
}

interface GroupRegistrationClientProps {
  facilities: Facility[];
  allAccessLevels: AccessLevel[];
}

export function GroupRegistrationClient({
  facilities,
  allAccessLevels,
}: GroupRegistrationClientProps) {
  // Group Header States
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "fac-jakarta");
  const [visitorGroupName, setVisitorGroupName] = useState("");
  const [hostId, setHostId] = useState("emp-101");
  const [hostName, setHostName] = useState("Budi Santoso");
  const [visitReasonType, setVisitReasonType] = useState<number>(3); // Meeting
  const [visitReasonDetail, setVisitReasonDetail] = useState("");

  // Default times: today at 14:00 to 17:00 local time
  const today = new Date().toISOString().split("T")[0];
  const [scheduledStartTime, setScheduledStartTime] = useState(`${today}T14:00`);
  const [scheduledEndTime, setScheduledEndTime] = useState(`${today}T17:00`);

  // Access & Quota
  const [selectedAccessLevelIds, setSelectedAccessLevelIds] = useState<string[]>([]);
  const [tapQuotaMode, setTapQuotaMode] = useState<"unlimited" | "limited">("unlimited");
  const [maxTaps, setMaxTaps] = useState<number>(4);

  // Visitors dynamic rows
  const [visitors, setVisitors] = useState<VisitorFormRow[]>([
    {
      visitorFamilyName: "",
      visitorGivenName: "",
      visitorPhone: "",
      visitorEmail: "",
      certificateType: 111,
      certificateNo: "",
    },
    {
      visitorFamilyName: "",
      visitorGivenName: "",
      visitorPhone: "",
      visitorEmail: "",
      certificateType: 111,
      certificateNo: "",
    },
  ]);

  // Mode and stub controls
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GroupVisitResult | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);

  const selectedFacility = facilities.find((f) => f.id === facilityId) ?? facilities[0];
  const availableAccessLevels = allAccessLevels.filter((al) => al.facilityId === facilityId);

  // Dynamic visitors row operations
  const addVisitorRow = () => {
    setVisitors((prev) => [
      ...prev,
      {
        visitorFamilyName: "",
        visitorGivenName: "",
        visitorPhone: "",
        visitorEmail: "",
        certificateType: 111,
        certificateNo: "",
      },
    ]);
  };

  const removeVisitorRow = (index: number) => {
    if (visitors.length <= 1) return;
    setVisitors((prev) => prev.filter((_, i) => i !== index));
  };

  // CSV Bulk Upload Handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) return;

      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes("nama") ||
        firstLine.includes("name") ||
        firstLine.includes("given") ||
        firstLine.includes("email");

      const startIdx = hasHeader ? 1 : 0;
      const newRows: VisitorFormRow[] = [];

      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i]
          .split(/[,;]/)
          .map((c) => c.trim().replace(/^["']|["']$/g, ""));

        if (cols.length >= 2 && (cols[0] || cols[1])) {
          newRows.push({
            visitorGivenName: cols[0] || "",
            visitorFamilyName: cols[1] || "",
            visitorPhone: cols[2] || "",
            visitorEmail: cols[3] || "",
            certificateType: Number(cols[4]) || 111,
            certificateNo: cols[5] || "",
          });
        }
      }

      if (newRows.length > 0) {
        setVisitors((prev) => {
          const isInitialEmpty =
            prev.length === 2 &&
            !prev[0].visitorGivenName &&
            !prev[0].visitorFamilyName &&
            !prev[1].visitorGivenName &&
            !prev[1].visitorFamilyName;
          return isInitialEmpty ? newRows : [...prev, ...newRows];
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Returning visitor lookup debounce / blur handler
  const checkReturningVisitor = async (index: number, certificateNo: string) => {
    const trimmed = certificateNo.trim();
    if (!trimmed) {
      setVisitors((prev) =>
        prev.map((row, i) =>
          i === index ? { ...row, lookupResult: undefined } : row,
        ),
      );
      return;
    }

    setVisitors((prev) =>
      prev.map((row, i) => (i === index ? { ...row, isLookingUp: true } : row)),
    );

    try {
      const res = await fetch(
        `/api/vms/visitors/lookup?certificateNo=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (data.ok && data.found && data.profile) {
        setVisitors((prev) =>
          prev.map((row, i) =>
            i === index
              ? {
                  ...row,
                  isLookingUp: false,
                  lookupResult: {
                    checked: true,
                    found: true,
                    profile: data.profile,
                  },
                }
              : row,
          ),
        );
      } else {
        setVisitors((prev) =>
          prev.map((row, i) =>
            i === index
              ? {
                  ...row,
                  isLookingUp: false,
                  lookupResult: { checked: true, found: false },
                }
              : row,
          ),
        );
      }
    } catch {
      setVisitors((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                isLookingUp: false,
                lookupResult: { checked: true, found: false },
              }
            : row,
        ),
      );
    }
  };

  const applyReturningProfile = (index: number, profile: VisitorProfile) => {
    setVisitors((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              visitorGivenName: profile.givenName ?? row.visitorGivenName,
              visitorFamilyName: profile.familyName ?? row.visitorFamilyName,
              visitorPhone: profile.phone || row.visitorPhone,
              visitorEmail: profile.email || row.visitorEmail,
              certificateType: profile.certificateType || row.certificateType,
              facePhoto: profile.facePhoto || row.facePhoto,
              lookupResult: undefined,
            }
          : row,
      ),
    );
  };

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      setVisitors((prev) =>
        prev.map((row, i) => (i === index ? { ...row, facePhoto: resultStr } : row)),
      );
    };
    reader.readAsDataURL(file);
  };

  const toggleAccessLevel = (id: string) => {
    setSelectedAccessLevelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    // Validation
    if (!visitorGroupName.trim()) {
      setSubmitError("Nama Rombongan Tamu wajib diisi.");
      setIsSubmitting(false);
      return;
    }

    if (visitors.length === 0) {
      setSubmitError("Minimal satu anggota rombongan tamu harus terdaftar.");
      setIsSubmitting(false);
      return;
    }

    for (let i = 0; i < visitors.length; i++) {
      const v = visitors[i];
      if (!v.visitorGivenName.trim() || !v.visitorFamilyName.trim()) {
        setSubmitError(
          `Nama Depan dan Nama Belakang wajib diisi untuk Anggota Tamu #${i + 1}.`,
        );
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        facilityId,
        visitorGroupName: visitorGroupName.trim(),
        hostId: hostId.trim() || undefined,
        hostName: hostName.trim() || undefined,
        visitReasonType,
        visitReasonDetail: visitReasonDetail.trim() || undefined,
        scheduledStartTime,
        scheduledEndTime,
        accessLevelIds: selectedAccessLevelIds,
        tapQuota: {
          mode: tapQuotaMode,
          maxTaps: tapQuotaMode === "limited" ? maxTaps : undefined,
        },
        visitors: visitors.map((v) => ({
          visitorFamilyName: v.visitorFamilyName.trim(),
          visitorGivenName: v.visitorGivenName.trim(),
          visitorPhone: v.visitorPhone.trim() || undefined,
          visitorEmail: v.visitorEmail.trim() || undefined,
          certificateType: v.certificateType,
          certificateNo: v.certificateNo.trim() || undefined,
          facePhoto: v.facePhoto || undefined,
        })),
      };

      const res = await fetch("/api/vms/group-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitError(
          data.error?.message || `Pendaftaran rombongan gagal diproses (${res.status}).`,
        );
        return;
      }

      setResult(data.result);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat memproses pendaftaran rombongan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <UiCard className="border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/5 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <UiBadge variant="normal" showDot={true} label="Kunjungan Rombongan Dikonfirmasi" />
              <h2 className="mt-2 text-xl font-bold text-[var(--ks-ink)]">
                {result.visitorGroupName}
              </h2>
              <p className="mt-1 text-xs font-mono text-[var(--ks-muted)]">
                ID Rombongan: {result.groupId}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm font-semibold text-[var(--ks-ink)]">
                {result.successCount} dari {result.memberVisits.length} Tamu Berhasil Terdaftar
              </p>
              {result.failureCount > 0 && (
                <p className="text-xs font-semibold text-[var(--ks-vermilion)]">
                  {result.failureCount} Gagal Diproses
                </p>
              )}
            </div>
          </div>
        </UiCard>

        <div className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--ks-ink)]">
            Daftar Anggota Rombongan & Tiket Akses QR
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.memberVisits.map((member, idx) => (
              <UiCard
                key={member.visitId || `failed-${idx}`}
                className="flex flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-[var(--ks-ink)]">
                      {member.visitorName}
                    </h4>
                    <UiBadge
                      status={member.status}
                      variant={
                        member.status === "APPROVED"
                          ? "normal"
                          : member.status === "PENDING_APPROVAL"
                            ? "warning"
                            : member.status === "SECURITY_ESCALATED"
                              ? "danger"
                              : undefined
                      }
                      label={idDict.statusBadges[member.status]?.label ?? member.status}
                    />
                  </div>

                  {member.certificateNo && (
                    <p className="mt-1 text-xs text-[var(--ks-muted)]">
                      No. Identitas: {member.certificateNo}
                    </p>
                  )}

                  {member.appointCode && (
                    <p className="mt-2 text-sm font-medium text-[var(--ks-text)]">
                      Kode Janji Temu:{" "}
                      <span className="font-mono font-bold text-[var(--ks-ink)]">
                        {member.appointCode}
                      </span>
                    </p>
                  )}

                  {member.error && (
                    <p className="mt-2 rounded-[var(--ks-radius-sm)] bg-[var(--ks-vermilion)]/10 border border-[var(--ks-vermilion)]/30 p-2 text-xs text-[var(--ks-vermilion)]">
                      Kendala: {member.error}
                    </p>
                  )}
                </div>

                {member.qrCodeImage && (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] p-3">
                    <Image
                      src={
                        member.qrCodeImage.startsWith("data:")
                          ? member.qrCodeImage
                          : `data:image/png;base64,${member.qrCodeImage}`
                      }
                      alt={`Tiket QR untuk ${member.visitorName}`}
                      width={128}
                      height={128}
                      className="rounded-[var(--ks-radius-sm)]"
                      unoptimized
                    />
                    <span className="mt-2 text-[10px] text-[var(--ks-muted)] font-mono">
                      Tiket QR Akses Gerbang
                    </span>
                  </div>
                )}
              </UiCard>
            ))}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <UiButton
            variant="primary"
            onClick={() => {
              setResult(null);
              setVisitorGroupName("");
              setVisitors([
                {
                  visitorFamilyName: "",
                  visitorGivenName: "",
                  visitorPhone: "",
                  visitorEmail: "",
                  certificateType: 111,
                  certificateNo: "",
                },
                {
                  visitorFamilyName: "",
                  visitorGivenName: "",
                  visitorPhone: "",
                  visitorEmail: "",
                  certificateType: 111,
                  certificateNo: "",
                },
              ]);
            }}
          >
            Daftarkan Kunjungan Rombongan Lainnya
          </UiButton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/10 p-4 text-sm text-[var(--ks-vermilion)]">
          <p className="font-medium">Pendaftaran Rombongan Gagal Diproses</p>
          <p className="mt-1 text-xs">{submitError}</p>
        </div>
      )}

      {/* 1. Group & Facility Booking Details */}
      <UiCard>
        <UiCardHeader
          title="1. Data Rombongan & Jadwal Kunjungan"
          description="Tentukan nama rombongan delegasi, lokasi gedung tujuan, karyawan penanggung jawab, serta rentang jadwal kunjungan."
        />
        <UiCardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                Nama Rombongan Tamu <span className="text-[var(--ks-vermilion)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="cth. Delegasi Proyek PT Telkom, Tim Audit Vendor, Tamu Vendor Pelatihan"
                value={visitorGroupName}
                onChange={(e) => setVisitorGroupName(e.target.value)}
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              />
              <p className="mt-1 text-[11px] text-[var(--ks-muted)]">
                Nama grup untuk mengelompokkan data seluruh anggota delegasi di terminal pintu HikCentral.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                Gedung / Lokasi Tujuan <span className="text-[var(--ks-vermilion)]">*</span>
              </label>
              <select
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.timezone})
                  </option>
                ))}
              </select>
              {selectedFacility && (
                <p className="mt-1 text-[11px] text-[var(--ks-muted)]">
                  Zona Waktu: <span className="font-mono">{selectedFacility.timezone}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="group-host-id" className="block text-xs font-semibold text-[var(--ks-ink)]">
                ID Karyawan Tuan Rumah
              </label>
              <input
                id="group-host-id"
                type="text"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                placeholder="cth. emp-101"
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                Nama Karyawan Tuan Rumah
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Nama Karyawan Tuan Rumah"
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                Keperluan Kunjungan <span className="text-[var(--ks-vermilion)]">*</span>
              </label>
              <select
                value={visitReasonType}
                onChange={(e) => setVisitReasonType(Number(e.target.value))}
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              >
                {VISIT_REASON_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {idDict.visitReasons[type as VisitReasonType] ?? VISIT_REASON_LABELS[type as VisitReasonType]}
                  </option>
                ))}
              </select>
            </div>

            {visitReasonType === 4 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                  Rincian Keperluan <span className="text-[var(--ks-vermilion)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={visitReasonDetail}
                  onChange={(e) => setVisitReasonDetail(e.target.value)}
                  placeholder="Jelaskan keperluan spesifik untuk 'Keperluan Lainnya'"
                  className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                Waktu Mulai Kunjungan (Waktu Lokal) <span className="text-[var(--ks-vermilion)]">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                Waktu Selesai Kunjungan (Waktu Lokal) <span className="text-[var(--ks-vermilion)]">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledEndTime}
                onChange={(e) => setScheduledEndTime(e.target.value)}
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              />
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      {/* 2. Physical Access Privileges & Tap Quota */}
      <UiCard>
        <UiCardHeader
          title="2. Hak Akses Pintu & Kuota Tap"
          description="Konfigurasikan kelompok pintu akses HikCentral dan batasan tap gerbang putar untuk seluruh anggota rombongan."
        />
        <UiCardContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ks-ink)] mb-2">
              Pilih Kelompok Hak Akses Pintu untuk Rombongan
            </label>
            {availableAccessLevels.length === 0 ? (
              <p className="text-xs text-[var(--ks-muted)]">
                Belum ada kelompok hak akses khusus untuk gedung ini. Akses pintu putar lobi standar akan digunakan.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {availableAccessLevels.map((al) => {
                  const isChecked = selectedAccessLevelIds.includes(al.id);
                  return (
                    <label
                      key={al.id}
                      className={`flex items-start gap-3 rounded-[var(--ks-radius-md)] border p-3 cursor-pointer transition ${
                        isChecked
                          ? "border-[var(--ks-ink)] bg-[var(--ks-paper)]"
                          : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:bg-[var(--ks-paper)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAccessLevel(al.id)}
                        className="mt-0.5 rounded-[var(--ks-radius-sm)] border-[var(--ks-rule-subtle)] text-[var(--ks-ink)] focus:ring-[var(--ks-kinpaku)]"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[var(--ks-ink)]">
                          {al.name}
                        </p>
                        <p className="text-[11px] text-[var(--ks-muted)]">
                          {al.description || `${al.doors.length} pintu diberikan`}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 grid gap-4 sm:grid-cols-2 border-t border-[var(--ks-rule-subtle)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                Mode Kuota Tap Pintu Putar
              </label>
              <select
                value={tapQuotaMode}
                onChange={(e) =>
                  setTapQuotaMode(e.target.value as "unlimited" | "limited")
                }
                className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
              >
                <option value="unlimited">{idDict.tapQuotaModes.unlimited.label}</option>
                <option value="limited">{idDict.tapQuotaModes.limited.label}</option>
              </select>
            </div>

            {tapQuotaMode === "limited" && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                  Maksimal Jumlah Tap per Anggota Tamu
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxTaps}
                  onChange={(e) => setMaxTaps(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                />
              </div>
            )}
          </div>
        </UiCardContent>
      </UiCard>

      {/* 3. Dynamic Visitors List */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--ks-ink)]">
              3. Anggota Rombongan ({visitors.length} Tamu)
            </h2>
            <p className="text-xs text-[var(--ks-muted)]">
              Lengkapi data identitas masing-masing anggota. Tamu yang pernah berkunjung akan dikenali secara otomatis melalui nomor identitas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={csvInputRef}
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
              id="group-csv-upload"
            />
            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => csvInputRef.current?.click()}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Unggah CSV Rombongan
            </UiButton>
            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={addVisitorRow}
            >
              + Tambah Anggota Tamu
            </UiButton>
          </div>
        </div>

        <div className="space-y-4">
          {visitors.map((visitor, idx) => (
            <UiCard key={idx} className="p-5 space-y-4 relative">
              <div className="flex items-center justify-between border-b border-[var(--ks-rule-subtle)] pb-3">
                <span className="text-xs font-bold text-[var(--ks-ink)] uppercase tracking-wider">
                  Anggota Tamu #{idx + 1}
                </span>
                {visitors.length > 1 && (
                  <UiButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVisitorRow(idx)}
                    className="text-xs font-medium text-[var(--ks-vermilion)] hover:text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/10"
                  >
                    Hapus
                  </UiButton>
                )}
              </div>

              {/* Returning Visitor Auto-Fill Banner */}
              {visitor.lookupResult?.found && visitor.lookupResult.profile && (
                <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {visitor.lookupResult.profile.facePhoto ? (
                      <Image
                        src={visitor.lookupResult.profile.facePhoto}
                        alt="Foto Wajah Tersimpan"
                        width={36}
                        height={36}
                        className="rounded-full object-cover border border-[var(--ks-kinpaku)]/30"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ks-kinpaku)]/20 text-xs font-bold text-[var(--ks-ink)]">
                        {visitor.lookupResult.profile.givenName?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-[var(--ks-ink)]">
                        Tamu Pernah Berkunjung Dikenali: {visitor.lookupResult.profile.fullName}
                      </p>
                      <p className="text-[11px] text-[var(--ks-muted)]">
                        Profil dan foto wajah biometrik terenkripsi tersimpan siap digunakan.
                      </p>
                    </div>
                  </div>
                  <UiButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      applyReturningProfile(idx, visitor.lookupResult!.profile!)
                    }
                  >
                    Isi Otomatis Data & Foto
                  </UiButton>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Nama Depan <span className="text-[var(--ks-vermilion)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={visitor.visitorGivenName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorGivenName: val } : r,
                        ),
                      );
                    }}
                    placeholder="cth. Nama Depan"
                    className="mt-1 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Nama Belakang / Marga <span className="text-[var(--ks-vermilion)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={visitor.visitorFamilyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorFamilyName: val } : r,
                        ),
                      );
                    }}
                    placeholder="cth. Nama Belakang"
                    className="mt-1 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Jenis Tanda Pengenal
                  </label>
                  <select
                    value={visitor.certificateType}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, certificateType: val } : r,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  >
                    {CERTIFICATE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {idDict.certificateTypes[type as CertificateType] ?? CERTIFICATE_TYPE_LABELS[type as CertificateType]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`group-cert-no-${idx}`} className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Nomor Identitas (NIK KTP / Paspor / SIM)
                  </label>
                  <div className="relative mt-1">
                    <input
                      id={`group-cert-no-${idx}`}
                      type="text"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={visitor.certificateNo}
                      onBlur={() =>
                        checkReturningVisitor(idx, visitor.certificateNo)
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setVisitors((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  certificateNo: val,
                                  lookupResult: undefined,
                                }
                              : r,
                          ),
                        );
                      }}
                      placeholder="cth. 3171012345670001"
                      className="w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                    />
                    {visitor.isLookingUp && (
                      <span className="absolute right-2.5 top-2 text-xs text-[var(--ks-muted)]">
                        Mencari data...
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={visitor.visitorPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorPhone: val } : r,
                        ),
                      );
                    }}
                    placeholder="+628111222333"
                    className="mt-1 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    value={visitor.visitorEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorEmail: val } : r,
                        ),
                      );
                    }}
                    placeholder="visitor@example.com"
                    className="mt-1 w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Foto Wajah Biometrik (Opsional)
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => handlePhotoUpload(idx, e)}
                      className="text-xs text-[var(--ks-muted)] file:mr-2 file:rounded-[var(--ks-radius-sm)] file:border-0 file:bg-[var(--ks-paper-deep)] file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-[var(--ks-ink)] hover:file:bg-[var(--ks-paper)]"
                    />
                    {visitor.facePhoto && (
                      <div className="flex items-center gap-2">
                        <Image
                          src={visitor.facePhoto}
                          alt="Pratinjau Foto Wajah"
                          width={32}
                          height={32}
                          className="rounded-[var(--ks-radius-sm)] object-cover border border-[var(--ks-rule-subtle)]"
                          unoptimized
                        />
                        <UiButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setVisitors((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, facePhoto: undefined } : r,
                              ),
                            )
                          }
                          className="text-[11px] text-[var(--ks-vermilion)] hover:text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/10"
                        >
                          Hapus Foto
                        </UiButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </UiCard>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-[var(--ks-rule-subtle)]">
        <p className="text-xs text-[var(--ks-muted)]">
          Mengirimkan {visitors.length} pendaftaran janji temu sekaligus ke sistem terminal pintu dengan penyimpanan profil biometrik otomatis.
        </p>

        <UiButton
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {`Konfirmasi & Daftarkan Kunjungan Rombongan (${visitors.length} Tamu)`}
        </UiButton>
      </div>
    </form>
  );
}
