"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  VISIT_REASON_LABELS,
  VISIT_REASON_TYPES,
  validatePreRegistrationInput,
  type CertificateType,
  type CredentialSyncStatus,
  type Facility,
  type PreRegistrationResult,
  type Visit,
  type VisitReasonType,
} from "@/lib/vms/vms-contract";
import {
  formatFacePhotoSize,
  isFacePhotoSizeValid,
  processBrowserImageFile,
  toJpegDataUri,
} from "@/lib/vms/face-normalizer";
import {
  TIME_SCHEDULE_LABELS,
  type AccessLevel,
  type TapQuotaMode,
} from "@/lib/vms/access-level-contract";
import { UiBadge, UiButton, UiCard } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

interface PreRegistrationFormProps {
  initialFacilities: Facility[];
  initialAccessLevels?: AccessLevel[];
}

export function PreRegistrationForm({
  initialFacilities,
  initialAccessLevels,
}: PreRegistrationFormProps) {
  const formId = useId();

  // Facility Selection
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    initialFacilities[0]?.id ?? "fac-jakarta",
  );

  // Access Levels & Tap Quota States
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>(
    initialAccessLevels ?? [],
  );
  const [selectedAccessLevelIds, setSelectedAccessLevelIds] = useState<string[]>(
    () => {
      const initialFacilityId = initialFacilities[0]?.id ?? "fac-jakarta";
      const defaults = (initialAccessLevels ?? []).filter(
        (al) => al.facilityId === initialFacilityId && al.isDefault,
      );
      return defaults.length > 0
        ? defaults.map((d) => d.id)
        : (initialAccessLevels ?? [])
            .filter((al) => al.facilityId === initialFacilityId)
            .slice(0, 1)
            .map((d) => d.id);
    },
  );
  const [tapQuotaMode, setTapQuotaMode] = useState<TapQuotaMode>("unlimited");
  const [maxTaps, setMaxTaps] = useState<number>(2);

  // Re-fetch or synchronize access levels when facility changes
  useEffect(() => {
    let ignore = false;
    async function loadFacilityAccessLevels() {
      try {
        const res = await fetch(
          `/api/vms/access-levels?facilityId=${selectedFacilityId}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && data.ok && Array.isArray(data.accessLevels)) {
          setAccessLevels((prev) => {
            const others = prev.filter(
              (al) => al.facilityId !== selectedFacilityId,
            );
            return [...others, ...data.accessLevels];
          });
          const facilityLevels: AccessLevel[] = data.accessLevels;
          const defaultLevel =
            facilityLevels.find((l) => l.isDefault) ?? facilityLevels[0];
          if (defaultLevel) {
            setSelectedAccessLevelIds([defaultLevel.id]);
          } else {
            setSelectedAccessLevelIds([]);
          }
        }
      } catch {
        // Fallback to local filtering
      }
    }
    loadFacilityAccessLevels();
    return () => {
      ignore = true;
    };
  }, [selectedFacilityId]);

  // Form Fields
  const [visitorFamilyName, setVisitorFamilyName] = useState("Pratama");
  const [visitorGivenName, setVisitorGivenName] = useState("Rian");
  const [visitorPhone, setVisitorPhone] = useState("+628123456789");
  const [visitorEmail, setVisitorEmail] = useState("rian.pratama@example.com");
  const [certificateType, setCertificateType] = useState<CertificateType>(111);
  const [certificateNo, setCertificateNo] = useState("3171012345670001");
  const [visitReasonType, setVisitReasonType] = useState<VisitReasonType>(0);
  const [visitReasonDetail, setVisitReasonDetail] = useState("");
  const [hostId, setHostId] = useState("emp-host-01");
  const [hostName, setHostName] = useState("Budi Santoso");

  // Scheduled Dates (defaulting to tomorrow 10:00 - 12:00)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);
  const [scheduledStartTime, setScheduledStartTime] = useState(
    `${tomorrowDateStr}T10:00`,
  );
  const [scheduledEndTime, setScheduledEndTime] = useState(
    `${tomorrowDateStr}T12:00`,
  );

  // Biometric Face Photo States
  const [facePhoto, setFacePhoto] = useState<string>("");
  const [faceByteSize, setFaceByteSize] = useState<number>(0);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Status and Validation State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [createdVisit, setCreatedVisit] = useState<Visit | null>(null);

  // Credential Hardware Sync State
  const [credentialSyncStatus, setCredentialSyncStatus] =
    useState<CredentialSyncStatus>("Applied");
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [retrySyncMessage, setRetrySyncMessage] = useState<string | null>(null);

  // Returning Visitor Lookup State
  const [isLookingUpVisitor, setIsLookingUpVisitor] = useState(false);
  const [returningVisitorProfile, setReturningVisitorProfile] = useState<{
    givenName?: string;
    familyName?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    certificateType?: number;
    certificateNo?: string;
    facePhoto?: string;
  } | null>(null);

  async function checkReturningVisitor(cert: string) {
    const trimmed = cert.trim();
    if (!trimmed) {
      setReturningVisitorProfile(null);
      return;
    }
    setIsLookingUpVisitor(true);
    try {
      const res = await fetch(
        `/api/vms/visitors/lookup?certificateNo=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (data.ok && data.found && data.profile) {
        setReturningVisitorProfile(data.profile);
      } else {
        setReturningVisitorProfile(null);
      }
    } catch {
      setReturningVisitorProfile(null);
    } finally {
      setIsLookingUpVisitor(false);
    }
  }

  function applyReturningProfile(profile: NonNullable<typeof returningVisitorProfile>) {
    if (profile.givenName) setVisitorGivenName(profile.givenName);
    if (profile.familyName) setVisitorFamilyName(profile.familyName);
    if (profile.phone) setVisitorPhone(profile.phone);
    if (profile.email) setVisitorEmail(profile.email);
    if (profile.certificateType && [111, 414, 335, 222].includes(profile.certificateType)) {
      setCertificateType(profile.certificateType as CertificateType);
    }
    if (profile.facePhoto) {
      setFacePhoto(profile.facePhoto);
      setFaceByteSize(Math.round((profile.facePhoto.length * 3) / 4));
      setFaceError(null);
    }
  }

  // Invitation Link State
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(
    null,
  );
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Camera and File Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const selectedFacility =
    initialFacilities.find((f) => f.id === selectedFacilityId) ??
    initialFacilities[0];

  // Face Photo Handlers
  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaceError(null);
    setIsNormalizing(true);
    try {
      const normalized = await processBrowserImageFile(file);
      setFacePhoto(normalized.dataUri);
      setFaceByteSize(normalized.byteSize);
    } catch (err) {
      setFaceError(
        err instanceof Error ? err.message : "Gagal memproses gambar foto wajah.",
      );
    } finally {
      setIsNormalizing(false);
      e.target.value = "";
    }
  }

  async function handleStartCamera() {
    setFaceError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setFaceError("Akses kamera web tidak didukung oleh peramban Anda.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setFaceError(
        err instanceof Error
          ? `Gagal mengakses kamera: ${err.message}`
          : "Tidak dapat mengakses kamera. Pastikan izin kamera aktif.",
      );
    }
  }

  function handleCaptureCamera() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    stopCameraStream();
    setIsNormalizing(true);

    processBrowserImageFile(dataUrl)
      .then((normalized) => {
        setFacePhoto(normalized.dataUri);
        setFaceByteSize(normalized.byteSize);
      })
      .catch((err) => {
        setFaceError(
          err instanceof Error
            ? err.message
            : "Gagal menormalkan foto dari kamera web.",
        );
      })
      .finally(() => {
        setIsNormalizing(false);
      });
  }

  function handleRemovePhoto() {
    setFacePhoto("");
    setFaceByteSize(0);
    setFaceError(null);
  }

  async function handleRetrySync() {
    if (!createdVisit?.hikCentral?.visitorId) return;

    setIsRetryingSync(true);
    setRetrySyncMessage(null);

    try {
      const response = await fetch("/api/vms/credentials/retry-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: createdVisit.hikCentral.visitorId,
        }),
      });

      const json = await response.json();
      if (json.ok) {
        setCredentialSyncStatus(json.syncStatus as CredentialSyncStatus);
        setRetrySyncMessage(json.message);
      } else {
        setRetrySyncMessage(json.error ?? "Sinkronisasi ulang terminal gagal.");
      }
    } catch (err) {
      setRetrySyncMessage(
        err instanceof Error ? err.message : "Terjadi gangguan jaringan saat sinkronisasi ulang.",
      );
    } finally {
      setIsRetryingSync(false);
    }
  }

  async function handleGenerateInviteLink() {
    setGlobalError(null);
    setFieldErrors({});
    setIsGeneratingInvite(true);
    setGeneratedInviteUrl(null);

    try {
      const payload = {
        facilityId: selectedFacilityId,
        hostId: hostId.trim() || undefined,
        hostName: hostName.trim() || undefined,
        visitReasonType,
        visitReasonDetail: visitReasonDetail.trim() || undefined,
        scheduledStartTime,
        scheduledEndTime,
        visitorFamilyName: visitorFamilyName.trim() || undefined,
        visitorGivenName: visitorGivenName.trim() || undefined,
        visitorPhone: visitorPhone.trim() || undefined,
        visitorEmail: visitorEmail.trim() || undefined,
      };

      const res = await fetch("/api/vms/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.error?.fieldErrors) {
          setFieldErrors(data.error.fieldErrors);
        }
        setGlobalError(
          data.error?.message ??
            `Gagal membuat tautan pendaftaran mandiri (${res.status}).`,
        );
        return;
      }

      setGeneratedInviteUrl(data.inviteUrl);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat membuat tautan pendaftaran.",
      );
    } finally {
      setIsGeneratingInvite(false);
    }
  }

  function handleCopyInviteLink() {
    if (!generatedInviteUrl) return;
    const fullUrl = `${window.location.origin}${generatedInviteUrl}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    const payload = {
      facilityId: selectedFacilityId,
      hostId: hostId.trim() || undefined,
      hostName: hostName.trim() || undefined,
      visitorFamilyName: visitorFamilyName.trim(),
      visitorGivenName: visitorGivenName.trim(),
      visitorPhone: visitorPhone.trim() || undefined,
      visitorEmail: visitorEmail.trim() || undefined,
      certificateType,
      certificateNo: certificateNo.trim() || undefined,
      visitReasonType,
      visitReasonDetail: visitReasonDetail.trim() || undefined,
      scheduledStartTime,
      scheduledEndTime,
      facePhoto: facePhoto || undefined,
      accessLevelIds: selectedAccessLevelIds,
      tapQuota: {
        mode: tapQuotaMode,
        maxTaps: tapQuotaMode === "limited" ? maxTaps : undefined,
      },
    };

    const validation = validatePreRegistrationInput(payload);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/vms/pre-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: PreRegistrationResult = await response.json();

      if (!response.ok || !data.ok || !data.visit) {
        if (data.error?.fieldErrors) {
          setFieldErrors(data.error.fieldErrors);
        }
        setGlobalError(
          data.error?.message ??
            `Pendaftaran tamu gagal diproses (${response.status}).`,
        );
        return;
      }

      setCreatedVisit(data.visit);
      const rawData = data as unknown as { credentialSyncStatus?: CredentialSyncStatus };
      setCredentialSyncStatus(
        rawData.credentialSyncStatus ?? "Applied",
      );
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Terjadi gangguan jaringan saat memproses pendaftaran.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-8 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-xs"
      >
        {/* Section 1: Facility Selection */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-[var(--ks-ink)]">
            1. Pilih Gedung & Zona Waktu Fasilitas
          </legend>
          <p className="text-xs text-[var(--ks-muted)]">
            Setiap lokasi gedung beroperasi berdasarkan zona waktu lokal IANA masing-masing.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {initialFacilities.map((fac) => {
              const checked = fac.id === selectedFacilityId;
              return (
                <label
                  key={fac.id}
                  htmlFor={`${formId}-fac-${fac.id}`}
                  className="block cursor-pointer"
                >
                  <UiCard
                    className={`flex flex-col justify-between p-3.5 transition-colors ${
                      checked
                        ? "border-[var(--ks-ink)] bg-[var(--ks-paper)] ring-1 ring-[var(--ks-ink)]"
                        : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:border-[var(--ks-edge)]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--ks-ink)]">
                          {fac.name}
                        </span>
                        <input
                          id={`${formId}-fac-${fac.id}`}
                          type="radio"
                          name="facility"
                          value={fac.id}
                          checked={checked}
                          onChange={() => setSelectedFacilityId(fac.id)}
                          className="h-4 w-4 accent-[var(--ks-ink)]"
                        />
                      </div>
                      <span className="mt-1 inline-block rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ks-ink)]">
                        {fac.timezone}
                      </span>
                      {fac.address ? (
                        <p className="mt-2 text-[11px] text-[var(--ks-muted)] line-clamp-2">
                          {fac.address}
                        </p>
                      ) : null}
                    </div>
                  </UiCard>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Section 2: Visitor Details */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <legend className="text-sm font-semibold text-[var(--ks-ink)]">
            2. Data Identitas Tamu
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-given-name`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Nama Depan *
              </label>
              <input
                id={`${formId}-given-name`}
                type="text"
                required
                value={visitorGivenName}
                onChange={(e) => setVisitorGivenName(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Nama Depan Tamu"
                className={`mt-1 block w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-sm bg-[var(--ks-paper)] text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:outline-hidden ${
                  fieldErrors.visitorGivenName
                    ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-1 focus:ring-[var(--ks-vermilion)]"
                    : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)]"
                }`}
              />
              {fieldErrors.visitorGivenName ? (
                <p className="mt-1 text-xs text-[var(--ks-vermilion)]">
                  {fieldErrors.visitorGivenName}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-family-name`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Nama Belakang / Marga *
              </label>
              <input
                id={`${formId}-family-name`}
                type="text"
                required
                value={visitorFamilyName}
                onChange={(e) => setVisitorFamilyName(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Nama Belakang Tamu"
                className={`mt-1 block w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-sm bg-[var(--ks-paper)] text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:outline-hidden ${
                  fieldErrors.visitorFamilyName
                    ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-1 focus:ring-[var(--ks-vermilion)]"
                    : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)]"
                }`}
              />
              {fieldErrors.visitorFamilyName ? (
                <p className="mt-1 text-xs text-[var(--ks-vermilion)]">
                  {fieldErrors.visitorFamilyName}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-phone`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Nomor Telepon / WhatsApp (cth. +62...)
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+628123456789"
                className="mt-1 block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-edge)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-edge)]"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-email`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Alamat Email Tamu
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="rian.pratama@example.com"
                className={`mt-1 block w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-sm bg-[var(--ks-paper)] text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:outline-hidden ${
                  fieldErrors.visitorEmail
                    ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-1 focus:ring-[var(--ks-vermilion)]"
                    : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)]"
                }`}
              />
              {fieldErrors.visitorEmail ? (
                <p className="mt-1 text-xs text-[var(--ks-vermilion)]">
                  {fieldErrors.visitorEmail}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-cert-type`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Jenis Tanda Pengenal
              </label>
              <select
                id={`${formId}-cert-type`}
                value={certificateType}
                onChange={(e) =>
                  setCertificateType(Number(e.target.value) as CertificateType)
                }
                className="mt-1 block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs transition-colors focus:border-[var(--ks-edge)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-edge)]"
              >
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {idDict.certificateTypes[type] ?? CERTIFICATE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-cert-no`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Nomor Identitas (NIK KTP / No. Paspor)
              </label>
              <div className="relative mt-1">
                <input
                  id={`${formId}-cert-no`}
                  type="text"
                  value={certificateNo}
                  onBlur={() => checkReturningVisitor(certificateNo)}
                  onChange={(e) => {
                    setCertificateNo(e.target.value);
                    if (returningVisitorProfile) setReturningVisitorProfile(null);
                  }}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="3171..."
                  className="block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-edge)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-edge)]"
                />
                {isLookingUpVisitor && (
                  <span className="absolute right-2.5 top-2.5 text-xs text-[var(--ks-muted)]">
                    Mencari data...
                  </span>
                )}
              </div>
            </div>
          </div>

          {returningVisitorProfile && (
            <UiCard className="mt-3 border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {returningVisitorProfile.facePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={returningVisitorProfile.facePhoto}
                    alt="Foto Wajah Tersimpan"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover border border-[var(--ks-kinpaku)]/40"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ks-kinpaku)]/20 text-xs font-bold text-[var(--ks-ink)]">
                    {returningVisitorProfile.givenName?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-[var(--ks-ink)]">
                    Tamu Pernah Berkunjung Ditemukan!
                  </p>
                  <p className="text-[11px] text-[var(--ks-text)]">
                    {returningVisitorProfile.fullName ||
                      `${returningVisitorProfile.givenName} ${returningVisitorProfile.familyName}`}{" "}
                    &bull; Profil tersimpan & foto biometrik wajah terenkripsi siap digunakan
                  </p>
                </div>
              </div>
              <UiButton
                type="button"
                size="sm"
                variant="primary"
                onClick={() => applyReturningProfile(returningVisitorProfile)}
              >
                Isi Otomatis Data & Foto
              </UiButton>
            </UiCard>
          )}
        </fieldset>

        {/* Section 3: Biometric Face Photo Capture & Verification */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <legend className="text-sm font-semibold text-[var(--ks-ink)]">
                3. Pengambilan & Verifikasi Foto Biometrik Wajah
              </legend>
              <p className="text-xs text-[var(--ks-muted)]">
                Terminal pintu MinMoe mewajibkan foto format JPEG dengan ukuran antara 10 KB hingga 100 KB.
              </p>
            </div>
            {facePhoto && faceByteSize ? (
              <UiBadge variant={isFacePhotoSizeValid(faceByteSize) ? "normal" : "danger"}>
                {formatFacePhotoSize(faceByteSize)} (
                {isFacePhotoSizeValid(faceByteSize)
                  ? "Sesuai Standar 10–100 KB"
                  : "Di Luar Batas Standar"}
                )
              </UiBadge>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <UiButton
              type="button"
              variant="secondary"
              size="md"
              disabled={isNormalizing}
              onClick={() => fileInputRef.current?.click()}
            >
              {isNormalizing ? "Memproses..." : "Unggah Berkas Foto"}
            </UiButton>
            <input
              ref={fileInputRef}
              id={`${formId}-face-file`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              disabled={isNormalizing}
              className="sr-only"
            />

            <UiButton
              type="button"
              variant="secondary"
              size="md"
              onClick={isCameraActive ? stopCameraStream : handleStartCamera}
            >
              {isCameraActive ? "Tutup Kamera" : "Ambil Foto via Kamera"}
            </UiButton>

            {facePhoto ? (
              <UiButton
                type="button"
                variant="ghost"
                size="md"
                onClick={handleRemovePhoto}
                className="text-[var(--ks-vermilion)] hover:text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/10"
              >
                Hapus Foto
              </UiButton>
            ) : null}
          </div>

          {/* Webcam Viewfinder if active */}
          {isCameraActive ? (
            <UiCard className="overflow-hidden bg-[var(--ks-ink)] p-4 text-center">
              <div className="relative mx-auto aspect-4/3 max-w-sm overflow-hidden rounded-[var(--ks-radius-md)] border border-[var(--ks-edge)] bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-6 rounded-[var(--ks-radius-md)] border-2 border-dashed border-white/60" />
              </div>
              <div className="mt-3 flex justify-center gap-3">
                <UiButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCaptureCamera}
                >
                  Bidik Foto Wajah
                </UiButton>
                <UiButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={stopCameraStream}
                >
                  Batal
                </UiButton>
              </div>
            </UiCard>
          ) : null}

          {/* Instant Photo Preview */}
          {facePhoto ? (
            <UiCard className="flex items-center gap-4 bg-[var(--ks-paper)] p-3">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={facePhoto}
                  alt="Pratinjau Foto Wajah Tamu"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-[var(--ks-ink)]">
                  Foto Wajah Biometrik Terverifikasi
                </p>
                <p className="text-[var(--ks-muted)]">
                  Format: <span className="font-mono text-[var(--ks-ink)]">JPEG</span> &bull; Ukuran:{" "}
                  <span className="font-mono font-medium text-[var(--ks-ink)]">
                    {formatFacePhotoSize(faceByteSize)}
                  </span>
                </p>
                <p className="text-[var(--ks-patina-deep)] font-medium">
                  Memenuhi standar batas ukuran terminal pintu (10 KB - 100 KB)
                </p>
              </div>
            </UiCard>
          ) : null}

          {faceError ? (
            <p className="text-xs font-medium text-[var(--ks-vermilion)]">{faceError}</p>
          ) : null}
        </fieldset>

        {/* Section 4: Visit Schedule & Reason */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <legend className="text-sm font-semibold text-[var(--ks-ink)]">
            4. Jadwal Kunjungan & Keperluan
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-start-time`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Waktu Mulai Kunjungan (
                <span className="font-semibold text-[var(--ks-ink)]">
                  {selectedFacility?.timezone}
                </span>
                ) *
              </label>
              <input
                id={`${formId}-start-time`}
                type="datetime-local"
                required
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className={`mt-1 block w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-sm bg-[var(--ks-paper)] text-[var(--ks-ink)] shadow-xs transition-colors focus:outline-hidden ${
                  fieldErrors.scheduledStartTime
                    ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-1 focus:ring-[var(--ks-vermilion)]"
                    : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)]"
                }`}
              />
              {fieldErrors.scheduledStartTime ? (
                <p className="mt-1 text-xs text-[var(--ks-vermilion)]">
                  {fieldErrors.scheduledStartTime}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-end-time`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Waktu Selesai Kunjungan (
                <span className="font-semibold text-[var(--ks-ink)]">
                  {selectedFacility?.timezone}
                </span>
                ) *
              </label>
              <input
                id={`${formId}-end-time`}
                type="datetime-local"
                required
                value={scheduledEndTime}
                onChange={(e) => setScheduledEndTime(e.target.value)}
                className={`mt-1 block w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-sm bg-[var(--ks-paper)] text-[var(--ks-ink)] shadow-xs transition-colors focus:outline-hidden ${
                  fieldErrors.scheduledEndTime
                    ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-1 focus:ring-[var(--ks-vermilion)]"
                    : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)]"
                }`}
              />
              {fieldErrors.scheduledEndTime ? (
                <p className="mt-1 text-xs text-[var(--ks-vermilion)]">
                  {fieldErrors.scheduledEndTime}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-reason-type`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Keperluan Kunjungan *
              </label>
              <select
                id={`${formId}-reason-type`}
                value={visitReasonType}
                onChange={(e) =>
                  setVisitReasonType(Number(e.target.value) as VisitReasonType)
                }
                className="mt-1 block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs transition-colors focus:border-[var(--ks-edge)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-edge)]"
              >
                {VISIT_REASON_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {idDict.visitReasons[type] ?? VISIT_REASON_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-reason-detail`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Rincian Keperluan {visitReasonType === 4 ? "*" : "(Opsional)"}
              </label>
              <input
                id={`${formId}-reason-detail`}
                type="text"
                value={visitReasonDetail}
                onChange={(e) => setVisitReasonDetail(e.target.value)}
                placeholder={
                  visitReasonType === 4
                    ? "Wajib diisi untuk keperluan 'Lainnya'..."
                    : "cth. Pertemuan kerja sama bisnis vendor Q4"
                }
                className={`mt-1 block w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-sm bg-[var(--ks-paper)] text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:outline-hidden ${
                  fieldErrors.visitReasonDetail
                    ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-1 focus:ring-[var(--ks-vermilion)]"
                    : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)]"
                }`}
              />
              {fieldErrors.visitReasonDetail ? (
                <p className="mt-1 text-xs text-[var(--ks-vermilion)]">
                  {fieldErrors.visitReasonDetail}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        {/* Section 5: Internal Host Sponsorship */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <legend className="text-sm font-semibold text-[var(--ks-ink)]">
            5. Karyawan Tuan Rumah Internal
          </legend>
          <p className="text-xs text-[var(--ks-muted)]">
            Karyawan internal penanggung jawab yang mengundang atau menerima kedatangan tamu.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-host-name`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                Nama Karyawan Tuan Rumah
              </label>
              <input
                id={`${formId}-host-name`}
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Nama Karyawan Tuan Rumah"
                className="mt-1 block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-edge)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-edge)]"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-host-id`}
                className="block text-xs font-medium text-[var(--ks-text)]"
              >
                ID Karyawan Tuan Rumah
              </label>
              <input
                id={`${formId}-host-id`}
                type="text"
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="emp-host-01"
                className="mt-1 block w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-sm text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:border-[var(--ks-edge)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-edge)]"
              />
            </div>
          </div>
        </fieldset>

        {/* Section 6: Dynamic Access Levels & Tap Quota */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-semibold text-[var(--ks-ink)]">
              6. Kelompok Hak Akses Pintu & Batas Tap
            </legend>
            <UiBadge variant="normal" showDot={false}>
              Keamanan Terpadu
            </UiBadge>
          </div>
          <p className="text-xs text-[var(--ks-muted)]">
            Pilih area akses pintu fisik untuk kunjungan ini dan atur batas tap pintu putar.
          </p>

          <div className="space-y-3">
            <span className="block text-xs font-medium text-[var(--ks-text)]">
              Kelompok Hak Akses Tersedia untuk Gedung Terpilih
            </span>

            {(() => {
              const facilityLevels = accessLevels.filter(
                (l) => l.facilityId === selectedFacilityId,
              );
              if (facilityLevels.length === 0) {
                return (
                  <p className="text-xs text-[var(--ks-muted)] italic">
                    Belum ada kelompok hak akses khusus untuk gedung ini. Tamu akan menggunakan akses lobi standar.
                  </p>
                );
              }
              return (
                <div className="grid gap-2 sm:grid-cols-2">
                  {facilityLevels.map((lvl) => {
                    const isChecked = selectedAccessLevelIds.includes(lvl.id);
                    return (
                      <label
                        key={lvl.id}
                        htmlFor={`access-level-${lvl.id}`}
                        className="block cursor-pointer"
                      >
                        <span className="sr-only">{lvl.name}</span>
                        <UiCard
                          className={`p-3 text-xs transition-colors flex items-start gap-3 ${
                            isChecked
                              ? "border-[var(--ks-ink)] bg-[var(--ks-paper)] ring-1 ring-[var(--ks-ink)]"
                              : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:border-[var(--ks-edge)]"
                          }`}
                        >
                          <input
                            id={`access-level-${lvl.id}`}
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAccessLevelIds((prev) => [...prev, lvl.id]);
                              } else {
                                setSelectedAccessLevelIds((prev) =>
                                  prev.filter((id) => id !== lvl.id),
                                );
                              }
                            }}
                            className="mt-0.5 h-4 w-4 rounded-[var(--ks-radius-sm)] accent-[var(--ks-ink)]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[var(--ks-ink)]">
                                {lvl.name}
                              </span>
                              {lvl.isDefault ? (
                                <UiBadge variant="normal" showDot={false}>
                                  Standar
                                </UiBadge>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-[var(--ks-muted)] line-clamp-1">
                              {lvl.description || "Hak akses fisik pintu"}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-1.5 py-0.5 text-[10px] text-[var(--ks-muted)]">
                                {idDict.timeSchedules[lvl.timeScheduleId] ?? TIME_SCHEDULE_LABELS[lvl.timeScheduleId] ?? `Jadwal ${lvl.timeScheduleId}`}
                              </span>
                              <span className="rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-1.5 py-0.5 text-[10px] text-[var(--ks-muted)] font-mono">
                                {lvl.doors.length} pintu
                              </span>
                            </div>
                          </div>
                        </UiCard>
                      </label>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Tap Quota Selection */}
          <UiCard className="mt-4 p-4 bg-[var(--ks-paper)]">
            <span className="block text-xs font-semibold text-[var(--ks-ink)]">
              Batas Buka Pintu / Kuota Tap Pintu Putar
            </span>
            <p className="mt-0.5 text-xs text-[var(--ks-muted)]">
              Batasi frekuensi buka pintu putar atau pintu akses fisik untuk tiket QR yang diterbitkan.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label htmlFor="tap-quota-unlimited" className="block cursor-pointer">
                <span className="sr-only">{idDict.tapQuotaModes.unlimited.label}</span>
                <UiCard
                  className={`flex items-start gap-2.5 p-3 text-xs transition-colors ${
                    tapQuotaMode === "unlimited"
                      ? "border-[var(--ks-ink)] bg-[var(--ks-paper-raised)] ring-1 ring-[var(--ks-ink)]"
                      : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:border-[var(--ks-edge)]"
                  }`}
                >
                  <input
                    id="tap-quota-unlimited"
                    type="radio"
                    name="tap-quota-mode"
                    value="unlimited"
                    checked={tapQuotaMode === "unlimited"}
                    onChange={() => setTapQuotaMode("unlimited")}
                    className="mt-0.5 h-4 w-4 accent-[var(--ks-ink)]"
                  />
                  <div>
                    <span className="font-semibold text-[var(--ks-ink)]">
                      {idDict.tapQuotaModes.unlimited.label}
                    </span>
                    <p className="mt-0.5 text-[var(--ks-muted)]">
                      {idDict.tapQuotaModes.unlimited.description}
                    </p>
                  </div>
                </UiCard>
              </label>

              <label htmlFor="tap-quota-limited" className="block cursor-pointer">
                <span className="sr-only">{idDict.tapQuotaModes.limited.label}</span>
                <UiCard
                  className={`flex items-start gap-2.5 p-3 text-xs transition-colors ${
                    tapQuotaMode === "limited"
                      ? "border-[var(--ks-ink)] bg-[var(--ks-paper-raised)] ring-1 ring-[var(--ks-ink)]"
                      : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:border-[var(--ks-edge)]"
                  }`}
                >
                  <input
                    id="tap-quota-limited"
                    type="radio"
                    name="tap-quota-mode"
                    value="limited"
                    checked={tapQuotaMode === "limited"}
                    onChange={() => setTapQuotaMode("limited")}
                    className="mt-0.5 h-4 w-4 accent-[var(--ks-ink)]"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-[var(--ks-ink)]">
                      {idDict.tapQuotaModes.limited.label}
                    </span>
                    <p className="mt-0.5 text-[var(--ks-muted)]">
                      {idDict.tapQuotaModes.limited.description}
                    </p>
                    {tapQuotaMode === "limited" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={maxTaps}
                          onChange={(e) => setMaxTaps(Math.max(1, Math.min(1000, Number(e.target.value))))}
                          className="w-24 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-2 py-1 text-xs font-semibold text-[var(--ks-ink)] shadow-xs focus:border-[var(--ks-edge)] focus:outline-hidden"
                        />
                        <span className="text-xs text-[var(--ks-muted)]">kali masuk</span>
                      </div>
                    ) : null}
                  </div>
                </UiCard>
              </label>
            </div>
          </UiCard>
        </fieldset>

        {globalError ? (
          <div
            role="alert"
            className="rounded-[var(--ks-radius-md)] border border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/10 p-4 text-xs text-[var(--ks-vermilion)]"
          >
            <p className="font-semibold">Pendaftaran Tamu Gagal Diproses</p>
            <p className="mt-1">{globalError}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ks-rule-subtle)] pt-4">
          <p className="text-xs text-[var(--ks-muted)]">
            Status awal kunjungan akan ditetapkan sebagai{" "}
            <span className="font-semibold text-[var(--ks-ink)]">
              MENUNGGU PERSETUJUAN
            </span>{" "}
            (atau <span className="font-semibold text-[var(--ks-ink)]">DRAFT</span> untuk tautan undangan mandiri).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <UiButton
              type="button"
              variant="secondary"
              size="md"
              onClick={handleGenerateInviteLink}
              disabled={isGeneratingInvite || isSubmitting}
            >
              {isGeneratingInvite ? "Membuat Tautan..." : "Buat Tautan Pendaftaran Mandiri"}
            </UiButton>
            <UiButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || isNormalizing}
            >
              {isSubmitting ? "Mengirim Janji Temu..." : "Kirim Janji Temu Tamu"}
            </UiButton>
          </div>
        </div>
      </form>

      {/* Generated Invitation Link Card */}
      {generatedInviteUrl ? (
        <UiCard
          aria-label="Tautan Pendaftaran Mandiri Tamu"
          className="border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 p-5 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ks-ink)] text-xs font-bold text-[var(--ks-paper-raised)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              <h2 className="text-sm font-bold text-[var(--ks-ink)]">
                Tautan Pendaftaran Mandiri Berhasil Dibuat
              </h2>
            </div>
            <UiBadge variant="default" showDot={false}>
              Satu Kali Pakai • Memiliki Batas Waktu
            </UiBadge>
          </div>

          <p className="mt-2 text-xs text-[var(--ks-text)]">
            Bagikan tautan ini kepada tamu Anda. Tamu dapat membukanya melalui smartphone atau laptop
            untuk memeriksa jadwal, mengisi data diri, dan mengunggah foto selfie biometrik sebelum tiba di lokasi.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? `${window.location.origin}${generatedInviteUrl}` : generatedInviteUrl}
              className="flex-1 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3 py-2 font-mono text-xs text-[var(--ks-ink)] shadow-xs focus:border-[var(--ks-edge)] focus:outline-hidden"
            />
            <div className="flex gap-2">
              <UiButton
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCopyInviteLink}
              >
                {copiedInvite ? "Berhasil Disalin!" : "Salin Tautan"}
              </UiButton>
              <a
                href={generatedInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="ks-btn inline-flex items-center justify-center font-semibold rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] px-3.5 py-1.5 text-xs sm:text-sm min-h-9 shadow-xs"
              >
                Buka Portal
              </a>
            </div>
          </div>
        </UiCard>
      ) : null}

      {/* Result Display Card */}
      {createdVisit ? (
        <UiCard
          aria-label="Detail Kunjungan Terjadwal"
          className="border-[var(--ks-patina)]/40 p-6 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ks-rule-subtle)] pb-4">
            <div>
              <UiBadge status={createdVisit.status} />
              <h2 className="mt-2 text-lg font-bold text-[var(--ks-ink)]">
                Janji Temu Berhasil Terjadwal
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--ks-muted)]">ID Kunjungan Internal</span>
              <p className="font-mono text-xs font-semibold text-[var(--ks-ink)]">
                {createdVisit.id}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* Left 2 Cols: Details */}
            <div className="space-y-4 md:col-span-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ks-muted)]">
                  Informasi Tamu
                </h3>
                <p className="mt-1 text-base font-semibold text-[var(--ks-ink)]">
                  {createdVisit.visitorGivenName} {createdVisit.visitorFamilyName}
                </p>
                <p className="text-xs text-[var(--ks-muted)]">
                  {createdVisit.visitorPhone || "Tanpa nomor telepon"} &bull;{" "}
                  {createdVisit.visitorEmail || "Tanpa email"}
                </p>
                {createdVisit.certificateNo ? (
                  <p className="mt-1 text-xs text-[var(--ks-muted)]">
                    No. Identitas:{" "}
                    <span className="font-mono font-medium text-[var(--ks-ink)]">
                      {createdVisit.certificateNo}
                    </span>{" "}
                    ({createdVisit.certificateType ? (idDict.certificateTypes[createdVisit.certificateType] ?? `Tipe ${createdVisit.certificateType}`) : ""})
                  </p>
                ) : null}
              </div>

              <div className="border-t border-[var(--ks-rule-subtle)] pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ks-muted)]">
                  Gedung & Jadwal Kunjungan
                </h3>
                <p className="mt-1 text-sm font-medium text-[var(--ks-ink)]">
                  {createdVisit.facilityName}
                </p>
                <div className="mt-1 space-y-1 text-xs text-[var(--ks-text)]">
                  <p>
                    <span className="font-medium text-[var(--ks-muted)]">
                      Waktu Lokal Gedung:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeFacility} &rarr;{" "}
                      {createdVisit.scheduledEndTimeFacility}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-[var(--ks-muted)]">
                      Waktu UTC Dinormalisasi:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeUtc} &rarr;{" "}
                      {createdVisit.scheduledEndTimeUtc}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border-t border-[var(--ks-rule-subtle)] pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ks-muted)]">
                  Izin Akses Pintu & Batas Tap
                </h3>
                <div className="mt-2 space-y-1.5 text-xs text-[var(--ks-text)]">
                  <p>
                    <span className="font-medium text-[var(--ks-muted)]">
                      Kelompok Hak Akses Diberikan:
                    </span>{" "}
                    {createdVisit.accessLevelIds && createdVisit.accessLevelIds.length > 0 ? (
                      <span className="font-semibold text-[var(--ks-ink)]">
                        {createdVisit.accessLevelIds
                          .map(
                            (id) =>
                              accessLevels.find((l) => l.id === id)?.name ?? id,
                          )
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="italic text-[var(--ks-muted)]">
                        Akses Pintu Masuk Lobi Standar
                      </span>
                    )}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--ks-muted)]">
                      Batas Tap:
                    </span>{" "}
                    {createdVisit.tapQuota?.mode === "limited" ? (
                      <UiBadge variant="warning">
                        {createdVisit.tapQuota.maxTaps} kali akses masuk diizinkan
                      </UiBadge>
                    ) : (
                      <UiBadge variant="normal">
                        Bebas akses masuk tanpa batas selama jam kunjungan
                      </UiBadge>
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t border-[var(--ks-rule-subtle)] pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ks-muted)]">
                  Detail Eksekusi OpenAPI HikCentral
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-3 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] p-3 font-mono text-xs">
                  <div>
                    <dt className="text-[11px] text-[var(--ks-muted)]">
                      appointRecordId
                    </dt>
                    <dd className="font-semibold text-[var(--ks-ink)]">
                      {createdVisit.hikCentral?.appointRecordId ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[var(--ks-muted)]">visitorId</dt>
                    <dd className="font-semibold text-[var(--ks-ink)]">
                      {createdVisit.hikCentral?.visitorId ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[var(--ks-muted)]">
                      appointCode
                    </dt>
                    <dd className="font-semibold text-[var(--ks-ink)]">
                      {createdVisit.hikCentral?.appointCode ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[var(--ks-muted)]">
                      ID Karyawan Tuan Rumah
                    </dt>
                    <dd className="font-semibold text-[var(--ks-ink)]">
                      {createdVisit.hostId ?? "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Right Col: Biometric Face & QR Pass Preview & Hardware Sync */}
            <div className="flex flex-col items-center justify-between space-y-4 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] p-4 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ks-muted)]">
                  Kredensial Diterbitkan
                </span>
                <p className="mt-1 text-xs font-semibold text-[var(--ks-ink)]">
                  {createdVisit.visitorGivenName} {createdVisit.visitorFamilyName}
                </p>
              </div>

              {/* Face Photo Preview in Result Card */}
              {createdVisit.facePhoto ? (
                <div className="flex flex-col items-center">
                  <div className="relative h-28 w-28 overflow-hidden rounded-[var(--ks-radius-md)] border-2 border-[var(--ks-patina)] bg-[var(--ks-paper-raised)] shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toJpegDataUri(createdVisit.facePhoto)}
                      alt="Foto Wajah Terdaftar"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-1 text-[11px] font-medium text-[var(--ks-patina-deep)]">
                    Foto Wajah Biometrik Terdaftar
                  </span>
                </div>
              ) : null}

              {/* Digital QR Pass */}
              <div className="flex flex-col items-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-2 shadow-xs">
                  {createdVisit.hikCentral?.qrCodeImage ? (
                    <Image
                      src={`data:image/png;base64,${createdVisit.hikCentral.qrCodeImage}`}
                      alt={`Tiket QR Tamu untuk ${createdVisit.visitorGivenName}`}
                      width={112}
                      height={112}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-[var(--ks-muted)]">Tanpa Kode QR</div>
                  )}
                </div>
                <span className="mt-1 text-[11px] text-[var(--ks-muted)]">
                  Akses Tiket QR Digital
                </span>
              </div>

              {/* Credential Hardware Sync Status Badge & Retry Button */}
              <div className="w-full rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--ks-text)]">
                    Sinkronisasi Terminal:
                  </span>
                  <UiBadge
                    variant={
                      credentialSyncStatus === "Applied"
                        ? "normal"
                        : credentialSyncStatus === "Syncing"
                          ? "warning"
                          : "danger"
                    }
                    label={idDict.syncStatuses[credentialSyncStatus] ?? credentialSyncStatus}
                  />
                </div>

                <UiButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRetrySync}
                  disabled={isRetryingSync}
                  className="mt-2.5 w-full"
                >
                  {isRetryingSync ? "Menyinkronkan..." : "Sinkronkan Ulang"}
                </UiButton>

                {retrySyncMessage ? (
                  <p className="mt-1.5 text-[11px] text-[var(--ks-muted)]">
                    {retrySyncMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </UiCard>
      ) : null}
    </div>
  );
}
