"use client";

import { useState } from "react";
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
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 text-xs font-semibold">
                Kunjungan Rombongan Dikonfirmasi
              </span>
              <h2 className="mt-2 text-xl font-bold text-neutral-900 dark:text-white">
                {result.visitorGroupName}
              </h2>
              <p className="mt-1 text-xs font-mono text-neutral-600 dark:text-slate-400">
                ID Rombongan: {result.groupId}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {result.successCount} dari {result.memberVisits.length} Tamu Berhasil Terdaftar
              </p>
              {result.failureCount > 0 && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {result.failureCount} Gagal Diproses
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Daftar Anggota Rombongan & Tiket Akses QR
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.memberVisits.map((member, idx) => (
              <div
                key={member.visitId || `failed-${idx}`}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-neutral-900 dark:text-white">
                      {member.visitorName}
                    </h4>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        member.status === "PENDING_APPROVAL"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : member.status === "SECURITY_ESCALATED"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                            : member.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                      }`}
                    >
                      {idDict.statusBadges[member.status]?.label ?? member.status}
                    </span>
                  </div>

                  {member.certificateNo && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                      No. Identitas: {member.certificateNo}
                    </p>
                  )}

                  {member.appointCode && (
                    <p className="mt-2 text-sm font-medium text-neutral-700 dark:text-slate-300">
                      Kode Janji Temu:{" "}
                      <span className="font-mono font-bold text-neutral-950 dark:text-white">
                        {member.appointCode}
                      </span>
                    </p>
                  )}

                  {member.error && (
                    <p className="mt-2 rounded bg-red-50 dark:bg-red-950/50 p-2 text-xs text-red-700 dark:text-red-300">
                      Kendala: {member.error}
                    </p>
                  )}
                </div>

                {member.qrCodeImage && (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800/50 p-3">
                    <Image
                      src={
                        member.qrCodeImage.startsWith("data:")
                          ? member.qrCodeImage
                          : `data:image/png;base64,${member.qrCodeImage}`
                      }
                      alt={`Tiket QR untuk ${member.visitorName}`}
                      width={128}
                      height={128}
                      className="rounded"
                      unoptimized
                    />
                    <span className="mt-2 text-[10px] text-neutral-500 dark:text-slate-400 font-mono">
                      Tiket QR Akses Gerbang
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
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
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:hover:bg-blue-700"
          >
            Daftarkan Kunjungan Rombongan Lainnya
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          <p className="font-medium">Pendaftaran Rombongan Gagal Diproses</p>
          <p className="mt-1 text-xs">{submitError}</p>
        </div>
      )}

      {/* 1. Group & Facility Booking Details */}
      <section className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
          1. Data Rombongan & Jadwal Kunjungan
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
              Nama Rombongan Tamu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="cth. Delegasi Proyek PT Telkom, Tim Audit Vendor, Tamu Vendor Pelatihan"
              value={visitorGroupName}
              onChange={(e) => setVisitorGroupName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-slate-400">
              Nama grup untuk mengelompokkan data seluruh anggota delegasi di terminal pintu HikCentral.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
              Gedung / Lokasi Tujuan <span className="text-red-500">*</span>
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.timezone})
                </option>
              ))}
            </select>
            {selectedFacility && (
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-slate-400">
                Zona Waktu: <span className="font-mono">{selectedFacility.timezone}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="group-host-id" className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
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
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
              Nama Karyawan Tuan Rumah
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Budi Santoso"
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
              Keperluan Kunjungan <span className="text-red-500">*</span>
            </label>
            <select
              value={visitReasonType}
              onChange={(e) => setVisitReasonType(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
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
              <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
                Rincian Keperluan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={visitReasonDetail}
                onChange={(e) => setVisitReasonDetail(e.target.value)}
                placeholder="Jelaskan keperluan spesifik untuk 'Keperluan Lainnya'"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
              Waktu Mulai Kunjungan (Waktu Lokal) <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledStartTime}
              onChange={(e) => setScheduledStartTime(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
              Waktu Selesai Kunjungan (Waktu Lokal) <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledEndTime}
              onChange={(e) => setScheduledEndTime(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </section>

      {/* 2. Physical Access Privileges & Tap Quota */}
      <section className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
          2. Hak Akses Pintu & Kuota Tap
        </h2>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-2">
            Pilih Kelompok Hak Akses Pintu untuk Rombongan
          </label>
          {availableAccessLevels.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Belum ada kelompok hak akses khusus untuk gedung ini. Akses pintu putar lobi standar akan digunakan.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableAccessLevels.map((al) => {
                const isChecked = selectedAccessLevelIds.includes(al.id);
                return (
                  <label
                    key={al.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                      isChecked
                        ? "border-neutral-900 dark:border-blue-500 bg-neutral-50 dark:bg-blue-950/20"
                        : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAccessLevel(al.id)}
                      className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                        {al.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                        {al.description || `${al.doors.length} pintu diberikan`}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
              Mode Kuota Tap Pintu Putar
            </label>
            <select
              value={tapQuotaMode}
              onChange={(e) =>
                setTapQuotaMode(e.target.value as "unlimited" | "limited")
              }
              className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
            >
              <option value="unlimited">{idDict.tapQuotaModes.unlimited.label}</option>
              <option value="limited">{idDict.tapQuotaModes.limited.label}</option>
            </select>
          </div>

          {tapQuotaMode === "limited" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
                Maksimal Jumlah Tap per Anggota Tamu
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxTaps}
                onChange={(e) => setMaxTaps(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          )}
        </div>
      </section>

      {/* 3. Dynamic Visitors List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              3. Anggota Rombongan ({visitors.length} Tamu)
            </h2>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Lengkapi data identitas masing-masing anggota. Tamu yang pernah berkunjung akan dikenali secara otomatis melalui nomor identitas.
            </p>
          </div>
          <button
            type="button"
            onClick={addVisitorRow}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700"
          >
            + Tambah Anggota Tamu
          </button>
        </div>

        <div className="space-y-4">
          {visitors.map((visitor, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Anggota Tamu #{idx + 1}
                </span>
                {visitors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVisitorRow(idx)}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 transition"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Returning Visitor Auto-Fill Banner */}
              {visitor.lookupResult?.found && visitor.lookupResult.profile && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {visitor.lookupResult.profile.facePhoto ? (
                      <Image
                        src={visitor.lookupResult.profile.facePhoto}
                        alt="Foto Wajah Tersimpan"
                        width={36}
                        height={36}
                        className="rounded-full object-cover border border-blue-200"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">
                        {visitor.lookupResult.profile.givenName?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                        Tamu Pernah Berkunjung Dikenali: {visitor.lookupResult.profile.fullName}
                      </p>
                      <p className="text-[11px] text-blue-800 dark:text-blue-300">
                        Profil dan foto wajah biometrik terenkripsi tersimpan siap digunakan.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      applyReturningProfile(idx, visitor.lookupResult!.profile!)
                    }
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                  >
                    Isi Otomatis Data & Foto
                  </button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
                    Nama Depan <span className="text-red-500">*</span>
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
                    placeholder="cth. Demis"
                    className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
                    Nama Belakang / Marga <span className="text-red-500">*</span>
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
                    placeholder="cth. Hassabis"
                    className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
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
                    className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
                  >
                    {CERTIFICATE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {idDict.certificateTypes[type as CertificateType] ?? CERTIFICATE_TYPE_LABELS[type as CertificateType]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`group-cert-no-${idx}`} className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
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
                      className="w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
                    />
                    {visitor.isLookingUp && (
                      <span className="absolute right-2.5 top-2 text-xs text-neutral-400">
                        Mencari data...
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
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
                    className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
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
                    className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
                    Foto Wajah Biometrik (Opsional)
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => handlePhotoUpload(idx, e)}
                      className="text-xs text-neutral-600 dark:text-slate-400 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 dark:file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-neutral-800 dark:file:text-slate-200 hover:file:bg-neutral-200"
                    />
                    {visitor.facePhoto && (
                      <div className="flex items-center gap-2">
                        <Image
                          src={visitor.facePhoto}
                          alt="Pratinjau Foto Wajah"
                          width={32}
                          height={32}
                          className="rounded object-cover border border-neutral-200"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setVisitors((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, facePhoto: undefined } : r,
                              ),
                            )
                          }
                          className="text-[11px] text-red-600 hover:underline"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-slate-800">
        <p className="text-xs text-neutral-500 dark:text-slate-400">
          Mengirimkan {visitors.length} pendaftaran janji temu sekaligus ke sistem terminal pintu dengan penyimpanan profil biometrik otomatis.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800 dark:hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting
            ? "Mendaftarkan Kunjungan Rombongan..."
            : `Konfirmasi & Daftarkan Kunjungan Rombongan (${visitors.length} Tamu)`}
        </button>
      </div>
    </form>
  );
}
