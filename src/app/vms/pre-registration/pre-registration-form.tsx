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
  PRE_REGISTRATION_MODES,
  STUB_SCENARIOS,
  VISIT_REASON_LABELS,
  VISIT_REASON_TYPES,
  validatePreRegistrationInput,
  type CertificateType,
  type CredentialSyncStatus,
  type Facility,
  type PreRegistrationMode,
  type PreRegistrationResult,
  type StubScenario,
  type Visit,
  type VisitReasonType,
} from "@/lib/vms/vms-contract";
import {
  createSampleFaceJpegDataUri,
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

  // Execution & Simulation Controls
  const [mode, setMode] = useState<PreRegistrationMode>("stub");
  const [stubScenario, setStubScenario] = useState<StubScenario>("success");

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

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  function handleLoadSamplePhoto() {
    setFaceError(null);
    const sampleDataUri = createSampleFaceJpegDataUri(25088); // 24.5 KB
    setFacePhoto(sampleDataUri);
    setFaceByteSize(25088);
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
          mode,
          stubScenario,
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
        mode,
        stubScenario,
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
      mode,
      stubScenario,
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
        className="space-y-8 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs"
      >
        {/* Section 1: Facility Selection */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-neutral-900 dark:text-white">
            1. Pilih Gedung & Zona Waktu Fasilitas
          </legend>
          <p className="text-xs text-neutral-600 dark:text-slate-400">
            Setiap lokasi gedung beroperasi berdasarkan zona waktu lokal IANA masing-masing.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {initialFacilities.map((fac) => {
              const checked = fac.id === selectedFacilityId;
              return (
                <label
                  key={fac.id}
                  htmlFor={`${formId}-fac-${fac.id}`}
                  className={`flex cursor-pointer flex-col justify-between rounded-lg border p-3.5 transition ${
                    checked
                      ? "border-neutral-900 dark:border-blue-500 bg-neutral-50 dark:bg-blue-950/20 ring-1 ring-neutral-900 dark:ring-blue-500"
                      : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-neutral-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {fac.name}
                      </span>
                      <input
                        id={`${formId}-fac-${fac.id}`}
                        type="radio"
                        name="facility"
                        value={fac.id}
                        checked={checked}
                        onChange={() => setSelectedFacilityId(fac.id)}
                        className="h-4 w-4 text-neutral-900 focus:ring-neutral-900"
                      />
                    </div>
                    <span className="mt-1 inline-block rounded bg-neutral-200/70 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800 dark:text-slate-300">
                      {fac.timezone}
                    </span>
                    {fac.address ? (
                      <p className="mt-2 text-[11px] text-neutral-500 dark:text-slate-400 line-clamp-2">
                        {fac.address}
                      </p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Section 2: Visitor Details */}
        <fieldset className="space-y-4 border-t border-neutral-100 dark:border-slate-800 pt-6">
          <legend className="text-sm font-semibold text-neutral-900 dark:text-white">
            2. Data Identitas Tamu
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-given-name`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
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
                placeholder="Rian"
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-white dark:bg-slate-800 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitorGivenName
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500 focus:ring-neutral-900/15"
                }`}
              />
              {fieldErrors.visitorGivenName ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.visitorGivenName}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-family-name`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
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
                placeholder="Pratama"
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-white dark:bg-slate-800 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitorFamilyName
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500 focus:ring-neutral-900/15"
                }`}
              />
              {fieldErrors.visitorFamilyName ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.visitorFamilyName}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-phone`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
              >
                Nomor Telepon / WhatsApp (cth. +62...)
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+628123456789"
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-email`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-white dark:bg-slate-800 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitorEmail
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500 focus:ring-neutral-900/15"
                }`}
              />
              {fieldErrors.visitorEmail ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.visitorEmail}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-cert-type`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
              >
                Jenis Tanda Pengenal
              </label>
              <select
                id={`${formId}-cert-type`}
                value={certificateType}
                onChange={(e) =>
                  setCertificateType(Number(e.target.value) as CertificateType)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
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
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
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
                  className="block w-full rounded-lg border border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
                />
                {isLookingUpVisitor && (
                  <span className="absolute right-2.5 top-2.5 text-xs text-neutral-400">
                    Mencari data...
                  </span>
                )}
              </div>
            </div>
          </div>

          {returningVisitorProfile && (
            <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {returningVisitorProfile.facePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={returningVisitorProfile.facePhoto}
                    alt="Foto Wajah Tersimpan"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover border border-blue-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">
                    {returningVisitorProfile.givenName?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                    Tamu Pernah Berkunjung Ditemukan!
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    {returningVisitorProfile.fullName ||
                      `${returningVisitorProfile.givenName} ${returningVisitorProfile.familyName}`}{" "}
                    &bull; Profil tersimpan & foto biometrik wajah terenkripsi siap digunakan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => applyReturningProfile(returningVisitorProfile)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                Isi Otomatis Data & Foto
              </button>
            </div>
          )}
        </fieldset>

        {/* Section 3: Biometric Face Photo Capture & Verification */}
        <fieldset className="space-y-4 border-t border-neutral-100 dark:border-slate-800 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <legend className="text-sm font-semibold text-neutral-900 dark:text-white">
                3. Pengambilan & Verifikasi Foto Biometrik Wajah
              </legend>
              <p className="text-xs text-neutral-600 dark:text-slate-400">
                Terminal pintu MinMoe mewajibkan foto format JPEG dengan ukuran antara 10 KB hingga 100 KB.
              </p>
            </div>
            {facePhoto && faceByteSize ? (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isFacePhotoSizeValid(faceByteSize)
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                }`}
              >
                {formatFacePhotoSize(faceByteSize)} (
                {isFacePhotoSizeValid(faceByteSize)
                  ? "Sesuai Standar 10–100 KB"
                  : "Di Luar Batas Standar"}
                )
              </span>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={`${formId}-face-file`}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-neutral-800 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700 shadow-2xs"
            >
              <span>{isNormalizing ? "Memproses..." : "Unggah Berkas Foto"}</span>
              <input
                id={`${formId}-face-file`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={isNormalizing}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={isCameraActive ? stopCameraStream : handleStartCamera}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-neutral-800 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700 shadow-2xs"
            >
              {isCameraActive ? "Tutup Kamera" : "Ambil Foto via Kamera"}
            </button>

            <button
              type="button"
              onClick={handleLoadSamplePhoto}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-slate-300 transition hover:bg-neutral-200"
            >
              Muat Contoh Standar (24.5 KB)
            </button>

            {facePhoto ? (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center justify-center rounded-lg text-xs font-medium text-rose-600 hover:text-rose-800"
              >
                Hapus Foto
              </button>
            ) : null}
          </div>

          {/* Webcam Viewfinder if active */}
          {isCameraActive ? (
            <div className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-900 p-3 text-center">
              <div className="relative mx-auto aspect-4/3 max-w-sm overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/60" />
              </div>
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureCamera}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs"
                >
                  Bidik Foto Wajah
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="rounded-lg bg-neutral-700 px-4 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-600"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : null}

          {/* Instant Photo Preview */}
          {facePhoto ? (
            <div className="flex items-center gap-4 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-800/50 p-3">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-300 dark:border-slate-700 bg-white shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={facePhoto}
                  alt="Pratinjau Foto Wajah Tamu"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-neutral-900 dark:text-white">
                  Foto Wajah Biometrik Terverifikasi
                </p>
                <p className="text-neutral-600 dark:text-slate-400">
                  Format: <span className="font-mono">JPEG</span> &bull; Ukuran:{" "}
                  <span className="font-mono font-medium">
                    {formatFacePhotoSize(faceByteSize)}
                  </span>
                </p>
                <p className="text-emerald-700 dark:text-emerald-400">
                  ✓ Memenuhi standar batas ukuran terminal pintu (10 KB – 100 KB)
                </p>
              </div>
            </div>
          ) : null}

          {faceError ? (
            <p className="text-xs font-medium text-rose-600">{faceError}</p>
          ) : null}
        </fieldset>

        {/* Section 4: Visit Schedule & Reason */}
        <fieldset className="space-y-4 border-t border-neutral-100 dark:border-slate-800 pt-6">
          <legend className="text-sm font-semibold text-neutral-900 dark:text-white">
            4. Jadwal Kunjungan & Keperluan
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-start-time`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
              >
                Waktu Mulai Kunjungan (
                <span className="font-semibold text-neutral-900 dark:text-white">
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-white dark:bg-slate-800 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.scheduledStartTime
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500 focus:ring-neutral-900/15"
                }`}
              />
              {fieldErrors.scheduledStartTime ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.scheduledStartTime}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-end-time`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
              >
                Waktu Selesai Kunjungan (
                <span className="font-semibold text-neutral-900 dark:text-white">
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-white dark:bg-slate-800 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.scheduledEndTime
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500 focus:ring-neutral-900/15"
                }`}
              />
              {fieldErrors.scheduledEndTime ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.scheduledEndTime}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-reason-type`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
              >
                Keperluan Kunjungan *
              </label>
              <select
                id={`${formId}-reason-type`}
                value={visitReasonType}
                onChange={(e) =>
                  setVisitReasonType(Number(e.target.value) as VisitReasonType)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
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
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-white dark:bg-slate-800 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitReasonDetail
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 dark:border-slate-700 focus:border-neutral-900 dark:focus:border-blue-500 focus:ring-neutral-900/15"
                }`}
              />
              {fieldErrors.visitReasonDetail ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.visitReasonDetail}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        {/* Section 5: Internal Host Sponsorship */}
        <fieldset className="space-y-4 border-t border-neutral-100 dark:border-slate-800 pt-6">
          <legend className="text-sm font-semibold text-neutral-900 dark:text-white">
            5. Karyawan Tuan Rumah Internal
          </legend>
          <p className="text-xs text-neutral-600 dark:text-slate-400">
            Karyawan internal penanggung jawab yang mengundang atau menerima kedatangan tamu.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-host-name`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
              >
                Nama Karyawan Tuan Rumah
              </label>
              <input
                id={`${formId}-host-name`}
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Budi Santoso"
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-host-id`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
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
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>
          </div>
        </fieldset>

        {/* Section 6: Dynamic Access Levels & Tap Quota */}
        <fieldset className="space-y-4 border-t border-neutral-100 dark:border-slate-800 pt-6">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-semibold text-neutral-900 dark:text-white">
              6. Kelompok Hak Akses Pintu & Batas Tap
            </legend>
            <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
              Keamanan Terpadu
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-slate-400">
            Pilih area akses pintu fisik untuk kunjungan ini dan atur batas tap pintu putar.
          </p>

          <div className="space-y-3">
            <span className="block text-xs font-medium text-neutral-700 dark:text-slate-300">
              Kelompok Hak Akses Tersedia untuk Gedung Terpilih
            </span>

            {(() => {
              const facilityLevels = accessLevels.filter(
                (l) => l.facilityId === selectedFacilityId,
              );
              if (facilityLevels.length === 0) {
                return (
                  <p className="text-xs text-neutral-500 italic">
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
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition ${
                          isChecked
                            ? "border-neutral-900 dark:border-blue-500 bg-neutral-50/80 dark:bg-blue-950/30 ring-1 ring-neutral-900 dark:ring-blue-500"
                            : "border-neutral-200 dark:border-slate-800 hover:border-neutral-300 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <input
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
                          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {lvl.name}
                            </span>
                            {lvl.isDefault ? (
                              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                                Standar
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-neutral-500 dark:text-slate-400 line-clamp-1">
                            {lvl.description || "Hak akses fisik pintu"}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="rounded bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:text-slate-300">
                              {idDict.timeSchedules[lvl.timeScheduleId] ?? TIME_SCHEDULE_LABELS[lvl.timeScheduleId] ?? `Jadwal ${lvl.timeScheduleId}`}
                            </span>
                            <span className="rounded bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:text-slate-300 font-mono">
                              {lvl.doors.length} pintu
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Tap Quota Selection */}
          <div className="mt-4 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/40 p-4">
            <span className="block text-xs font-semibold text-neutral-800 dark:text-slate-200">
              Batas Buka Pintu / Kuota Tap Pintu Putar
            </span>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-slate-400">
              Batasi frekuensi buka pintu putar atau pintu akses fisik untuk tiket QR yang diterbitkan.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs transition ${
                  tapQuotaMode === "unlimited"
                    ? "border-neutral-900 dark:border-blue-500 bg-white dark:bg-slate-900 ring-1 ring-neutral-900 dark:ring-blue-500"
                    : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="tap-quota-mode"
                  value="unlimited"
                  checked={tapQuotaMode === "unlimited"}
                  onChange={() => setTapQuotaMode("unlimited")}
                  className="mt-0.5 h-4 w-4 text-neutral-900 focus:ring-neutral-900"
                />
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {idDict.tapQuotaModes.unlimited.label}
                  </span>
                  <p className="mt-0.5 text-neutral-500 dark:text-slate-400">
                    {idDict.tapQuotaModes.unlimited.description}
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs transition ${
                  tapQuotaMode === "limited"
                    ? "border-neutral-900 dark:border-blue-500 bg-white dark:bg-slate-900 ring-1 ring-neutral-900 dark:ring-blue-500"
                    : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="tap-quota-mode"
                  value="limited"
                  checked={tapQuotaMode === "limited"}
                  onChange={() => setTapQuotaMode("limited")}
                  className="mt-0.5 h-4 w-4 text-neutral-900 focus:ring-neutral-900"
                />
                <div className="flex-1">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {idDict.tapQuotaModes.limited.label}
                  </span>
                  <p className="mt-0.5 text-neutral-500 dark:text-slate-400">
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
                        className="w-24 rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 focus:outline-hidden"
                      />
                      <span className="text-xs text-neutral-600 dark:text-slate-400">kali masuk</span>
                    </div>
                  ) : null}
                </div>
              </label>
            </div>
          </div>
        </fieldset>

        {/* Section 7: Execution & Simulation Controls */}
        <fieldset className="space-y-4 border-t border-neutral-100 dark:border-slate-800 pt-6">
          <legend className="text-sm font-semibold text-neutral-900 dark:text-white">
            7. Mode Eksekusi & Simulasi Integrasi
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-mode`}
                className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
              >
                Mode Eksekusi
              </label>
              <select
                id={`${formId}-mode`}
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as PreRegistrationMode)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              >
                {PRE_REGISTRATION_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === "live"
                      ? "Live HikCentral OpenAPI"
                      : "Simulasi Stub (Pengembangan)"}
                  </option>
                ))}
              </select>
            </div>

            {mode === "stub" ? (
              <div>
                <label
                  htmlFor={`${formId}-stub-scenario`}
                  className="block text-xs font-medium text-neutral-700 dark:text-slate-300"
                >
                  Skenario Simulasi Stub
                </label>
                <select
                  id={`${formId}-stub-scenario`}
                  value={stubScenario}
                  onChange={(e) =>
                    setStubScenario(e.target.value as StubScenario)
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-white shadow-xs focus:border-neutral-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
                >
                  {STUB_SCENARIOS.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </fieldset>

        {globalError ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-300"
          >
            <p className="font-semibold">Pendaftaran Tamu Gagal Diproses</p>
            <p className="mt-1">{globalError}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 dark:border-slate-800 pt-4">
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            Status awal kunjungan akan ditetapkan sebagai{" "}
            <span className="font-semibold text-neutral-800 dark:text-slate-200">
              MENUNGGU PERSETUJUAN
            </span>{" "}
            (atau <span className="font-semibold text-neutral-800 dark:text-slate-200">DRAFT</span> untuk tautan undangan mandiri).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateInviteLink}
              disabled={isGeneratingInvite || isSubmitting}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-neutral-800 dark:text-slate-200 shadow-xs transition hover:bg-neutral-50 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingInvite ? "Membuat Tautan..." : "🔗 Buat Tautan Pendaftaran Mandiri"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isNormalizing}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Mengirim Janji Temu..." : "Kirim Janji Temu Tamu"}
            </button>
          </div>
        </div>
      </form>

      {/* Generated Invitation Link Card */}
      {generatedInviteUrl ? (
        <section
          aria-label="Tautan Pendaftaran Mandiri Tamu"
          className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                🔗
              </span>
              <h2 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                Tautan Pendaftaran Mandiri Berhasil Dibuat
              </h2>
            </div>
            <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 text-xs font-semibold">
              Satu Kali Pakai • Memiliki Batas Waktu
            </span>
          </div>

          <p className="mt-2 text-xs text-blue-900 dark:text-blue-300">
            Bagikan tautan ini kepada tamu Anda. Tamu dapat membukanya melalui smartphone atau laptop
            untuk memeriksa jadwal, mengisi data diri, dan mengunggah foto selfie biometrik sebelum tiba di lokasi.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? `${window.location.origin}${generatedInviteUrl}` : generatedInviteUrl}
              className="flex-1 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-neutral-800 dark:text-slate-200 shadow-xs focus:outline-hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-blue-700"
              >
                {copiedInvite ? "✓ Berhasil Disalin!" : "Salin Tautan"}
              </button>
              <a
                href={generatedInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-300 shadow-xs transition hover:bg-blue-50 dark:hover:bg-slate-800"
              >
                Buka Portal ↗
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {/* Result Display Card */}
      {createdVisit ? (
        <section
          aria-label="Detail Kunjungan Terjadwal"
          className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-slate-800 pb-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300">
                {idDict.statusBadges[createdVisit.status]?.label ?? createdVisit.status}
              </span>
              <h2 className="mt-2 text-lg font-bold text-neutral-950 dark:text-white">
                Janji Temu Berhasil Terjadwal
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-500 dark:text-slate-400">ID Kunjungan Internal</span>
              <p className="font-mono text-xs font-semibold text-neutral-800 dark:text-slate-200">
                {createdVisit.id}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* Left 2 Cols: Details */}
            <div className="space-y-4 md:col-span-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                  Informasi Tamu
                </h3>
                <p className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {createdVisit.visitorGivenName} {createdVisit.visitorFamilyName}
                </p>
                <p className="text-xs text-neutral-600 dark:text-slate-400">
                  {createdVisit.visitorPhone || "Tanpa nomor telepon"} &bull;{" "}
                  {createdVisit.visitorEmail || "Tanpa email"}
                </p>
                {createdVisit.certificateNo ? (
                  <p className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                    No. Identitas:{" "}
                    <span className="font-mono font-medium text-neutral-800 dark:text-slate-200">
                      {createdVisit.certificateNo}
                    </span>{" "}
                    ({createdVisit.certificateType ? (idDict.certificateTypes[createdVisit.certificateType] ?? `Tipe ${createdVisit.certificateType}`) : ""})
                  </p>
                ) : null}
              </div>

              <div className="border-t border-neutral-100 dark:border-slate-800 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                  Gedung & Jadwal Kunjungan
                </h3>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
                  {createdVisit.facilityName}
                </p>
                <div className="mt-1 space-y-1 text-xs text-neutral-700 dark:text-slate-300">
                  <p>
                    <span className="font-medium text-neutral-500 dark:text-slate-400">
                      Waktu Lokal Gedung:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeFacility} &rarr;{" "}
                      {createdVisit.scheduledEndTimeFacility}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-neutral-500 dark:text-slate-400">
                      Waktu UTC Dinormalisasi:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeUtc} &rarr;{" "}
                      {createdVisit.scheduledEndTimeUtc}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border-t border-neutral-100 dark:border-slate-800 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                  Izin Akses Pintu & Batas Tap
                </h3>
                <div className="mt-2 space-y-1.5 text-xs text-neutral-700 dark:text-slate-300">
                  <p>
                    <span className="font-medium text-neutral-500 dark:text-slate-400">
                      Kelompok Hak Akses Diberikan:
                    </span>{" "}
                    {createdVisit.accessLevelIds && createdVisit.accessLevelIds.length > 0 ? (
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {createdVisit.accessLevelIds
                          .map(
                            (id) =>
                              accessLevels.find((l) => l.id === id)?.name ?? id,
                          )
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="italic text-neutral-400">
                        Akses Pintu Masuk Lobi Standar
                      </span>
                    )}
                  </p>
                  <p>
                    <span className="font-medium text-neutral-500 dark:text-slate-400">
                      Batas Tap:
                    </span>{" "}
                    {createdVisit.tapQuota?.mode === "limited" ? (
                      <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 font-semibold text-amber-800 dark:text-amber-300">
                        {createdVisit.tapQuota.maxTaps} kali akses masuk diizinkan
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 font-semibold text-emerald-800 dark:text-emerald-300">
                        Bebas akses masuk tanpa batas selama jam kunjungan
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t border-neutral-100 dark:border-slate-800 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                  Detail Eksekusi OpenAPI HikCentral
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 dark:bg-slate-800/60 p-3 font-mono text-xs">
                  <div>
                    <dt className="text-[11px] text-neutral-500 dark:text-slate-400">
                      appointRecordId
                    </dt>
                    <dd className="font-semibold text-neutral-900 dark:text-white">
                      {createdVisit.hikCentral?.appointRecordId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500 dark:text-slate-400">visitorId</dt>
                    <dd className="font-semibold text-neutral-900 dark:text-white">
                      {createdVisit.hikCentral?.visitorId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500 dark:text-slate-400">
                      appointCode
                    </dt>
                    <dd className="font-semibold text-neutral-900 dark:text-white">
                      {createdVisit.hikCentral?.appointCode ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500 dark:text-slate-400">
                      ID Karyawan Tuan Rumah
                    </dt>
                    <dd className="font-semibold text-neutral-900 dark:text-white">
                      {createdVisit.hostId ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Right Col: Biometric Face & QR Pass Preview & Hardware Sync */}
            <div className="flex flex-col items-center justify-between space-y-4 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/40 p-4 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-slate-400">
                  Kredensial Diterbitkan
                </span>
                <p className="mt-1 text-xs font-semibold text-neutral-900 dark:text-white">
                  {createdVisit.visitorGivenName} {createdVisit.visitorFamilyName}
                </p>
              </div>

              {/* Face Photo Preview in Result Card */}
              {createdVisit.facePhoto ? (
                <div className="flex flex-col items-center">
                  <div className="relative h-28 w-28 overflow-hidden rounded-xl border-2 border-emerald-400 bg-white shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toJpegDataUri(createdVisit.facePhoto)}
                      alt="Foto Wajah Terdaftar"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                    Foto Wajah Biometrik Terdaftar
                  </span>
                </div>
              ) : null}

              {/* Digital QR Pass */}
              <div className="flex flex-col items-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-neutral-200 dark:border-slate-700 bg-white p-2 shadow-xs">
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
                    <div className="text-xs text-neutral-400">Tanpa Kode QR</div>
                  )}
                </div>
                <span className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  Akses Tiket QR Digital
                </span>
              </div>

              {/* Credential Hardware Sync Status Badge & Retry Button */}
              <div className="w-full rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-850 p-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-slate-300">
                    Sinkronisasi Terminal:
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      credentialSyncStatus === "Applied"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : credentialSyncStatus === "Syncing"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {idDict.syncStatuses[credentialSyncStatus] ?? credentialSyncStatus}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRetrySync}
                  disabled={isRetryingSync}
                  className="mt-2.5 w-full rounded-md border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-xs font-semibold text-neutral-800 dark:text-slate-200 transition hover:bg-neutral-50 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRetryingSync ? "Menyinkronkan..." : "Sinkronkan Ulang"}
                </button>

                {retrySyncMessage ? (
                  <p className="mt-1.5 text-[11px] text-neutral-600 dark:text-slate-400">
                    {retrySyncMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
