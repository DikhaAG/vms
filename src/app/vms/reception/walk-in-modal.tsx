"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  VISIT_REASON_TYPES,
  VISIT_REASON_LABELS,
  isCertificateType,
  type HostEmployee,
} from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";
import {
  walkInRegistrationSchema,
  type CheckInPass,
  type WalkInRegistrationInput,
} from "@/lib/vms/checkin-contract";
import {
  formatFacePhotoSize,
  isFacePhotoSizeValid,
  processBrowserImageFile,
} from "@/lib/vms/face-normalizer";
import {
  UiButton,
  UiFormField,
  UiModal,
  UiSelect,
  UiTextInput,
} from "@/components/vms/ui";

interface ReturningVisitorProfile {
  givenName?: string;
  familyName?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  certificateType?: number;
  certificateNo?: string;
  facePhoto?: string;
}

export interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemTimezone: string;
  allAccessLevels: AccessLevel[];
  /** Host employees synced from HikCentral (`host_employees`). */
  hosts: HostEmployee[];
  receptionist: { id: string; name: string };
  onRegistered: (pass: CheckInPass) => void;
}

function hostLabel(host: HostEmployee): string {
  return host.departmentName ? `${host.name} (${host.departmentName})` : host.name;
}

/**
 * Walk-in intake form. The parent remounts it (via `key`) each time it opens,
 * so React Hook Form's `defaultValues` give a clean form without effect sync.
 */
export function WalkInModal({
  isOpen,
  onClose,
  systemTimezone,
  allAccessLevels,
  hosts,
  receptionist,
  onRegistered,
}: WalkInModalProps) {
  const defaultAccessLevelIds = allAccessLevels
    .filter((al) => al.isDefault)
    .map((al) => al.id);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WalkInRegistrationInput>({
    resolver: zodResolver(walkInRegistrationSchema),
    defaultValues: {
      hostId: "",
      visitorGivenName: "",
      visitorFamilyName: "",
      visitorPhone: "",
      visitorEmail: "",
      certificateType: 111,
      certificateNo: "",
      visitReasonType: 0,
      visitReasonDetail: "",
      accessLevelIds: defaultAccessLevelIds,
      tapQuota: { mode: "limited", maxTaps: 1 },
      facePhoto: "",
      receptionistUserId: receptionist.id,
      receptionistName: receptionist.name,
      verificationMethod: "id_card",
    },
  });

  const visitReasonType = useWatch({ control, name: "visitReasonType" });
  const tapQuotaMode = useWatch({ control, name: "tapQuota.mode" });
  const facePhoto = useWatch({ control, name: "facePhoto" });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [faceByteSize, setFaceByteSize] = useState(0);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Returning visitor lookup by identity document number
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [returningProfile, setReturningProfile] =
    useState<ReturningVisitorProfile | null>(null);

  // Receptionist webcam capture
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  // Release the webcam if the modal unmounts while it is streaming.
  useEffect(
    () => () => streamRef.current?.getTracks().forEach((track) => track.stop()),
    [],
  );

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const setFacePhoto = (dataUri: string, byteSize: number) => {
    setValue("facePhoto", dataUri);
    setFaceByteSize(byteSize);
    setFaceError(null);
  };

  async function lookUpReturningVisitor(certificateNo: string) {
    const trimmed = certificateNo.trim();
    if (!trimmed) {
      setReturningProfile(null);
      return;
    }
    setIsLookingUp(true);
    try {
      const res = await fetch(
        `/api/vms/visitors/lookup?certificateNo=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      setReturningProfile(data.ok && data.found && data.profile ? data.profile : null);
    } catch {
      setReturningProfile(null);
    } finally {
      setIsLookingUp(false);
    }
  }

  function applyReturningProfile(profile: ReturningVisitorProfile) {
    if (profile.givenName) setValue("visitorGivenName", profile.givenName);
    if (profile.familyName) setValue("visitorFamilyName", profile.familyName);
    if (profile.phone) setValue("visitorPhone", profile.phone);
    if (profile.email) setValue("visitorEmail", profile.email);
    if (isCertificateType(profile.certificateType)) {
      setValue("certificateType", profile.certificateType);
    }
    if (profile.facePhoto) {
      setFacePhoto(profile.facePhoto, Math.round((profile.facePhoto.length * 3) / 4));
    }
  }

  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Unable to access camera.");
    }
  };

  const handleCaptureSelfie = async () => {
    if (!videoRef.current) return;
    setIsNormalizing(true);
    setFaceError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.85);
      });
      if (!blob) throw new Error("Failed to capture image from camera.");

      const file = new File([blob], "walkin-face.jpg", { type: "image/jpeg" });
      const normalized = await processBrowserImageFile(file);
      setFacePhoto(normalized.dataUri, normalized.byteSize);
      stopCamera();
    } catch (err) {
      setFaceError(err instanceof Error ? err.message : "Selfie capture failed.");
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsNormalizing(true);
    setFaceError(null);
    try {
      const normalized = await processBrowserImageFile(file);
      setFacePhoto(normalized.dataUri, normalized.byteSize);
    } catch (err) {
      setFaceError(err instanceof Error ? err.message : "Failed to process photo.");
    } finally {
      setIsNormalizing(false);
    }
  };

  const onSubmit = async (values: WalkInRegistrationInput) => {
    setSubmitError(null);
    const host = hosts.find((h) => h.id === values.hostId);
    const isLimited = values.tapQuota?.mode === "limited";
    try {
      const res = await fetch("/api/vms/check-in/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          hostId: host?.id,
          hostName: host?.name,
          visitorPhone: values.visitorPhone || undefined,
          visitorEmail: values.visitorEmail || undefined,
          certificateNo: values.certificateNo || undefined,
          visitReasonDetail: values.visitReasonDetail || undefined,
          accessLevelIds: values.accessLevelIds?.length ? values.accessLevelIds : undefined,
          tapQuota: {
            mode: values.tapQuota?.mode ?? "limited",
            maxTaps: isLimited ? Math.max(1, values.tapQuota?.maxTaps ?? 1) : 0,
          },
          facePhoto: values.facePhoto || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || "Walk-in registration failed.");
      }
      stopCamera();
      onRegistered(json.data.pass);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to register walk-in.");
    }
  };

  // Build the RHF submit handler at event time: onSubmit touches the webcam
  // stream ref, which must not be read while rendering.
  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) =>
    handleSubmit(onSubmit)(e);

  return (
    <>
      {/* Webcam Photo Capture Modal */}
      <UiModal
        isOpen={isOpen && cameraActive}
        onClose={stopCamera}
        title="Ambil Foto Biometrik Tamu"
        description="Posisikan wajah tamu di tengah layar untuk verifikasi MinMoe."
        size="md"
        footer={
          <>
            <UiButton variant="secondary" onClick={stopCamera}>
              Batal
            </UiButton>
            <UiButton
              variant="primary"
              onClick={handleCaptureSelfie}
              isLoading={isNormalizing}
            >
              Ambil Foto
            </UiButton>
          </>
        }
      >
        <div className="relative rounded-[var(--ks-radius-md)] overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        </div>
        {cameraError && (
          <p className="text-xs text-[var(--ks-vermilion)]">{cameraError}</p>
        )}
      </UiModal>

      {/* Walk-in Registration Modal (Single-Site, No Facility Selector) */}
      <UiModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Pendaftaran Tamu Datang Langsung (Walk-in)"
        description="Pendaftaran kilat dan pengaktifan hak akses pintu untuk tamu lobi tanpa janji temu sebelumnya."
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        footer={
          <>
            <UiButton variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Batal
            </UiButton>
            <UiButton
              variant="primary"
              type="submit"
              form="walk-in-form"
              isLoading={isSubmitting}
              disabled={isSubmitting || isNormalizing}
            >
              Daftarkan &amp; Berikan Izin Masuk
            </UiButton>
          </>
        }
      >
        {submitError && (
          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/10 p-3 text-xs text-[var(--ks-vermilion)]">
            {submitError}
          </div>
        )}
        <form id="walk-in-form" onSubmit={handleFormSubmit} className="space-y-4">
          {/* Host & Timezone Info Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UiFormField
              id="walkInHostId"
              label="Karyawan Tuan Rumah"
              error={errors.hostId?.message}
              description={
                hosts.length === 0
                  ? "Belum ada karyawan tuan rumah tersinkron. Jalankan sinkronisasi karyawan dari HikCentral terlebih dahulu."
                  : undefined
              }
            >
              <UiSelect {...register("hostId")} disabled={hosts.length === 0}>
                <option value="">Tanpa tuan rumah khusus (Resepsionis)</option>
                {hosts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {hostLabel(host)}
                  </option>
                ))}
              </UiSelect>
            </UiFormField>
            <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-3 py-2 flex flex-col justify-center">
              <span className="text-3xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)]">
                Zona Waktu Sistem
              </span>
              <span className="font-mono text-xs font-semibold text-[var(--ks-ink)] mt-0.5">
                {systemTimezone} (Durasi Standar 4 Jam)
              </span>
            </div>
          </div>

          {/* Names row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UiFormField
              id="walkInGivenName"
              label="Nama Depan"
              required
              error={errors.visitorGivenName?.message}
            >
              <UiTextInput placeholder="Contoh: Hendra" {...register("visitorGivenName")} />
            </UiFormField>
            <UiFormField
              id="walkInFamilyName"
              label="Nama Belakang / Marga"
              required
              error={errors.visitorFamilyName?.message}
            >
              <UiTextInput placeholder="Contoh: Gunawan" {...register("visitorFamilyName")} />
            </UiFormField>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UiFormField
              id="walkInPhone"
              label="Nomor Telepon / WhatsApp"
              error={errors.visitorPhone?.message}
            >
              <UiTextInput type="tel" placeholder="+628..." {...register("visitorPhone")} />
            </UiFormField>
            <UiFormField
              id="walkInEmail"
              label="Alamat Email (Opsional)"
              error={errors.visitorEmail?.message}
            >
              <UiTextInput
                type="email"
                placeholder="tamu@instansi.com"
                {...register("visitorEmail")}
              />
            </UiFormField>
          </div>

          {/* Certificate row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UiFormField
              id="walkInCertType"
              label="Jenis Kartu Identitas"
              error={errors.certificateType?.message}
            >
              <UiSelect {...register("certificateType", { valueAsNumber: true })}>
                {CERTIFICATE_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {CERTIFICATE_TYPE_LABELS[ct]}
                  </option>
                ))}
              </UiSelect>
            </UiFormField>
            <UiFormField
              id="walkInIdNumber"
              label="Nomor Dokumen Identitas (NIK/Paspor)"
              error={errors.certificateNo?.message}
              description={isLookingUp ? "Mencari data..." : undefined}
            >
              <UiTextInput
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Contoh: 3171010101010001"
                className="font-mono"
                {...register("certificateNo", {
                  onChange: () => setReturningProfile(null),
                  onBlur: (e) => lookUpReturningVisitor(e.target.value),
                })}
              />
            </UiFormField>
          </div>

          {/* Returning Visitor Recognized Banner */}
          {returningProfile && (
            <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/10 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {returningProfile.facePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={returningProfile.facePhoto}
                    alt="Foto Wajah Tersimpan"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover border border-[var(--ks-patina)]/40"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ks-patina)]/20 text-xs font-bold text-[var(--ks-patina)]">
                    {returningProfile.givenName?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-[var(--ks-ink)]">
                    Tamu Sebelumnya Ditemukan!
                  </p>
                  <p className="text-[11px] text-[var(--ks-muted)]">
                    {returningProfile.fullName ||
                      `${returningProfile.givenName} ${returningProfile.familyName}`}{" "}
                    &bull; Profil tersimpan &amp; foto biometrik siap digunakan
                  </p>
                </div>
              </div>
              <UiButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => applyReturningProfile(returningProfile)}
              >
                Isi Otomatis Data &amp; Foto
              </UiButton>
            </div>
          )}

          {/* Purpose row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UiFormField
              id="walkInReasonType"
              label="Keperluan Kunjungan"
              required
              error={errors.visitReasonType?.message}
            >
              <UiSelect {...register("visitReasonType", { valueAsNumber: true })}>
                {VISIT_REASON_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {VISIT_REASON_LABELS[rt]}
                  </option>
                ))}
              </UiSelect>
            </UiFormField>
            <UiFormField
              id="walkInReason"
              label={`Rincian Keperluan ${visitReasonType === 4 ? "" : "(opsional)"}`.trim()}
              required={visitReasonType === 4}
              error={errors.visitReasonDetail?.message}
            >
              <UiTextInput
                placeholder="Contoh: Pemeliharaan perangkat server vendor"
                {...register("visitReasonDetail")}
              />
            </UiFormField>
          </div>

          {/* Flat Building-Wide Access Levels selection */}
          <div>
            <span className="block text-xs font-semibold text-[var(--ks-ink)] mb-1.5">
              Hak Akses Pintu Fisik Gedung:
            </span>
            {allAccessLevels.length === 0 ? (
              <p className="text-xs text-[var(--ks-muted)] italic">
                Belum ada kelompok hak akses pintu yang terdaftar. Tamu akan
                mendapat akses lobi standar.
              </p>
            ) : (
              <Controller
                control={control}
                name="accessLevelIds"
                render={({ field }) => {
                  const selected = field.value ?? [];
                  return (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {allAccessLevels.map((al) => {
                        const isChecked = selected.includes(al.id);
                        return (
                          <label
                            key={al.id}
                            className={`flex items-start gap-2 rounded-[var(--ks-radius-md)] border p-2 text-xs cursor-pointer transition-colors ${isChecked
                                ? "border-[var(--ks-kinpaku)] bg-[var(--ks-kinpaku)]/10 text-[var(--ks-ink)] shadow-xs"
                                : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] text-[var(--ks-muted)] hover:border-[var(--ks-rule)]"
                              }`}
                          >
                            <input
                              type="checkbox"
                              value={al.id}
                              checked={isChecked}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.checked
                                    ? [...selected, al.id]
                                    : selected.filter((id) => id !== al.id),
                                )
                              }
                              className="mt-0.5 accent-[var(--ks-kinpaku)]"
                            />
                            <div>
                              <div className="font-medium text-[var(--ks-ink)]">{al.name}</div>
                              {al.description && (
                                <div className="text-3xs text-[var(--ks-muted)]">
                                  {al.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  );
                }}
              />
            )}
          </div>

          {/* Tap Quota Configuration */}
          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] p-3">
            <span className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-ink)] mb-2">
              Jatah Buka Pintu (Kuota Tap):
            </span>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  value="limited"
                  {...register("tapQuota.mode")}
                  className="accent-[var(--ks-kinpaku)]"
                />
                <span className="text-[var(--ks-text)]">Batas Tap:</span>
              </label>
              {tapQuotaMode === "limited" && (
                <input
                  type="number"
                  min={1}
                  max={100}
                  aria-label="Batas jumlah tap"
                  {...register("tapQuota.maxTaps", { valueAsNumber: true })}
                  className="w-16 rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-2 py-1 text-xs font-mono text-[var(--ks-ink)]"
                />
              )}
              <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                <input
                  type="radio"
                  value="unlimited"
                  {...register("tapQuota.mode")}
                  className="accent-[var(--ks-kinpaku)]"
                />
                <span className="text-[var(--ks-text)]">Bebas selama jam kunjungan</span>
              </label>
            </div>
            {errors.tapQuota?.maxTaps?.message && (
              <p className="mt-2 text-xs text-[var(--ks-vermilion)]">
                {errors.tapQuota.maxTaps.message}
              </p>
            )}
          </div>

          {/* Photo Enrollment (Webcam or Upload) */}
          <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-ink)]">
                Foto Wajah Biometrik (Terminal MinMoe)
              </span>
              {facePhoto && (
                <span
                  className={`text-3xs font-semibold px-2 py-0.5 rounded-full border ${isFacePhotoSizeValid(faceByteSize)
                      ? "border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 text-[var(--ks-patina)]"
                      : "border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/15 text-[var(--ks-vermilion)]"
                    }`}
                >
                  {formatFacePhotoSize(faceByteSize)} (10-100 KB)
                </span>
              )}
            </div>
            {facePhoto ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={facePhoto}
                  alt="Foto Wajah Terdaftar"
                  className="h-20 w-20 rounded-[var(--ks-radius-md)] object-cover border border-[var(--ks-rule-subtle)]"
                />
                <div className="space-y-1">
                  <p className="text-xs text-[var(--ks-muted)]">
                    Foto JPEG ternormalisasi siap didistribusikan ke terminal pintu fisik.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFacePhoto("", 0)}
                    className="text-xs text-[var(--ks-vermilion)] hover:underline cursor-pointer"
                  >
                    Hapus Foto
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <UiButton type="button" variant="secondary" size="sm" onClick={handleStartCamera}>
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
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Buka Kamera Resepsionis</span>
                </UiButton>
                <label className="ks-btn inline-flex items-center gap-1.5 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer">
                  <span>Unggah Berkas Foto</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}
            {cameraError && (
              <p className="mt-2 text-xs text-[var(--ks-vermilion)]">{cameraError}</p>
            )}
            {faceError && (
              <p className="mt-2 text-xs text-[var(--ks-vermilion)]">{faceError}</p>
            )}
          </div>
        </form>
      </UiModal>
    </>
  );
}
