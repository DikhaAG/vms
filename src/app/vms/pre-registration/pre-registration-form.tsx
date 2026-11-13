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
        err instanceof Error ? err.message : "Failed to process image.",
      );
    } finally {
      setIsNormalizing(false);
      e.target.value = "";
    }
  }

  async function handleStartCamera() {
    setFaceError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setFaceError("Webcam access is not supported by your browser environment.");
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
          ? `Camera access error: ${err.message}`
          : "Unable to access camera.",
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
            : "Failed to normalize webcam photo.",
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
        setRetrySyncMessage(json.error ?? "Retry sync failed.");
      }
    } catch (err) {
      setRetrySyncMessage(
        err instanceof Error ? err.message : "Network error during sync retry.",
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
            `Failed to generate invitation link (${res.status}).`,
        );
        return;
      }

      setGeneratedInviteUrl(data.inviteUrl);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Network error generating invitation link.",
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
      accessLevelIds:
        selectedAccessLevelIds.length > 0 ? selectedAccessLevelIds : undefined,
      tapQuota: {
        mode: tapQuotaMode,
        maxTaps: tapQuotaMode === "limited" ? maxTaps : 0,
      },
      mode,
      ...(mode === "stub" ? { stubScenario } : {}),
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

      const result: PreRegistrationResult = await response.json();
      if (result.ok && result.visit) {
        setCreatedVisit(result.visit);
        setCredentialSyncStatus(result.visit.credentialSyncStatus ?? "Applied");
        setRetrySyncMessage(null);
      } else {
        if (result.error?.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        setGlobalError(
          result.error?.message ?? "Failed to create pre-registration.",
        );
      }
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Network error occurred.",
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
        className="space-y-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs"
      >
        {/* Section 1: Facility Selection */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-neutral-900">
            1. Select Facility & Timezone
          </legend>
          <p className="text-xs text-neutral-600">
            Each physical site operates under its canonical IANA timezone.
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
                      ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-900">
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
                    <span className="mt-1 inline-block rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800">
                      {fac.timezone}
                    </span>
                    {fac.address ? (
                      <p className="mt-2 text-[11px] text-neutral-500 line-clamp-2">
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
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className="text-sm font-semibold text-neutral-900">
            2. Visitor Identity Information
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-given-name`}
                className="block text-xs font-medium text-neutral-700"
              >
                Given Name *
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitorGivenName
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"
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
                className="block text-xs font-medium text-neutral-700"
              >
                Family Name / Surname *
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitorFamilyName
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"
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
                className="block text-xs font-medium text-neutral-700"
              >
                Phone Number (e.g. +62...)
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+628123456789"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-email`}
                className="block text-xs font-medium text-neutral-700"
              >
                Email Address
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitorEmail
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"
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
                className="block text-xs font-medium text-neutral-700"
              >
                Certificate / ID Type
              </label>
              <select
                id={`${formId}-cert-type`}
                value={certificateType}
                onChange={(e) =>
                  setCertificateType(Number(e.target.value) as CertificateType)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              >
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CERTIFICATE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-cert-no`}
                className="block text-xs font-medium text-neutral-700"
              >
                Certificate Number (e.g. NIK KTP / Passport No)
              </label>
              <input
                id={`${formId}-cert-no`}
                type="text"
                value={certificateNo}
                onChange={(e) => setCertificateNo(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="3171..."
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>
          </div>
        </fieldset>

        {/* Section 3: Biometric Face Photo Capture & Verification */}
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <legend className="text-sm font-semibold text-neutral-900">
                3. Biometric Face Photo Capture & Verification
              </legend>
              <p className="text-xs text-neutral-600">
                HikCentral MinMoe face terminals strictly enforce JPEG format between 10 KB and 100 KB.
              </p>
            </div>
            {facePhoto && faceByteSize ? (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isFacePhotoSizeValid(faceByteSize)
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {formatFacePhotoSize(faceByteSize)} (
                {isFacePhotoSizeValid(faceByteSize)
                  ? "Valid 10–100 KB"
                  : "Out of bounds"}
                )
              </span>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={`${formId}-face-file`}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 shadow-2xs"
            >
              <span>{isNormalizing ? "Processing..." : "Upload Photo File"}</span>
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
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 shadow-2xs"
            >
              {isCameraActive ? "Close Camera" : "Take Photo via Camera"}
            </button>

            <button
              type="button"
              onClick={handleLoadSamplePhoto}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
            >
              Load Compliant Sample (24.5 KB)
            </button>

            {facePhoto ? (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center justify-center rounded-lg text-xs font-medium text-rose-600 hover:text-rose-800"
              >
                Remove Photo
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
                  Snap Photo
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="rounded-lg bg-neutral-700 px-4 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {/* Instant Photo Preview */}
          {facePhoto ? (
            <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={facePhoto}
                  alt="Visitor Biometric Face Preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-neutral-900">
                  Normalized Biometric Face Photo
                </p>
                <p className="text-neutral-600">
                  Format: <span className="font-mono">JPEG</span> &bull; Size:{" "}
                  <span className="font-mono font-medium">
                    {formatFacePhotoSize(faceByteSize)}
                  </span>
                </p>
                <p className="text-emerald-700">
                  ✓ Verified within HikCentral bounds (10 KB – 100 KB)
                </p>
              </div>
            </div>
          ) : null}

          {faceError ? (
            <p className="text-xs font-medium text-rose-600">{faceError}</p>
          ) : null}
        </fieldset>

        {/* Section 4: Visit Schedule & Reason */}
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className="text-sm font-semibold text-neutral-900">
            4. Visit Schedule & Purpose
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-start-time`}
                className="block text-xs font-medium text-neutral-700"
              >
                Scheduled Start Time (
                <span className="font-semibold text-neutral-900">
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.scheduledStartTime
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"
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
                className="block text-xs font-medium text-neutral-700"
              >
                Scheduled End Time (
                <span className="font-semibold text-neutral-900">
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
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.scheduledEndTime
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"
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
                className="block text-xs font-medium text-neutral-700"
              >
                Visit Reason *
              </label>
              <select
                id={`${formId}-reason-type`}
                value={visitReasonType}
                onChange={(e) =>
                  setVisitReasonType(Number(e.target.value) as VisitReasonType)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              >
                {VISIT_REASON_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {VISIT_REASON_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-reason-detail`}
                className="block text-xs font-medium text-neutral-700"
              >
                Reason Detail {visitReasonType === 4 ? "*" : "(Optional)"}
              </label>
              <input
                id={`${formId}-reason-detail`}
                type="text"
                value={visitReasonDetail}
                onChange={(e) => setVisitReasonDetail(e.target.value)}
                placeholder={
                  visitReasonType === 4
                    ? "Mandatory explanation for 'Others'..."
                    : "e.g. Q4 vendor partnership meeting"
                }
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 shadow-xs focus:outline-none focus:ring-2 ${
                  fieldErrors.visitReasonDetail
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"
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
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className="text-sm font-semibold text-neutral-900">
            5. Internal Host Employee
          </legend>
          <p className="text-xs text-neutral-600">
            Accountable internal sponsor (translated to{" "}
            <span className="font-mono">receptionistId</span> on HikCentral
            wire payload).
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-host-name`}
                className="block text-xs font-medium text-neutral-700"
              >
                Host Employee Name
              </label>
              <input
                id={`${formId}-host-name`}
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Budi Santoso"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-host-id`}
                className="block text-xs font-medium text-neutral-700"
              >
                Host Employee ID
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
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>
          </div>
        </fieldset>

        {/* Section 6: Dynamic Access Levels & Tap Quota */}
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-semibold text-neutral-900">
              6. Dynamic Access Levels & Tap Quota
            </legend>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Ticket 05
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Select physical access zones for this visit and configure the turnstile tap limit (mapped to HikCentral <span className="font-mono">qrCodeValidNum</span>).
          </p>

          <div className="space-y-3">
            <span className="block text-xs font-medium text-neutral-700">
              Available Access Levels for Selected Facility
            </span>

            {(() => {
              const facilityLevels = accessLevels.filter(
                (l) => l.facilityId === selectedFacilityId,
              );
              if (facilityLevels.length === 0) {
                return (
                  <p className="text-xs text-neutral-500 italic">
                    No access levels configured for this facility. Default lobby gate access will apply.
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
                            ? "border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
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
                            <span className="font-semibold text-neutral-900">
                              {lvl.name}
                            </span>
                            {lvl.isDefault ? (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-neutral-500 line-clamp-1">
                            {lvl.description || "Physical access level"}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                              {TIME_SCHEDULE_LABELS[lvl.timeScheduleId] ?? `Schedule ${lvl.timeScheduleId}`}
                            </span>
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 font-mono">
                              {lvl.doors.length} {lvl.doors.length === 1 ? "door" : "doors"}
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
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
            <span className="block text-xs font-semibold text-neutral-800">
              Turnstile & Door Tap Quota
            </span>
            <p className="mt-0.5 text-xs text-neutral-500">
              Limit physical turnstile and door scan entries for issued QR credentials.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs transition ${
                  tapQuotaMode === "unlimited"
                    ? "border-neutral-900 bg-white ring-1 ring-neutral-900"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
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
                  <span className="font-semibold text-neutral-900">
                    Unlimited Entries (0)
                  </span>
                  <p className="mt-0.5 text-neutral-500">
                    Visitor can tap turnstiles and doors freely throughout their scheduled visit window.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs transition ${
                  tapQuotaMode === "limited"
                    ? "border-neutral-900 bg-white ring-1 ring-neutral-900"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
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
                  <span className="font-semibold text-neutral-900">
                    Exact Tap Limit
                  </span>
                  <p className="mt-0.5 text-neutral-500">
                    Limit turnstile / door unlocks (1 to 1000 taps).
                  </p>
                  {tapQuotaMode === "limited" ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={maxTaps}
                        onChange={(e) => setMaxTaps(Math.max(1, Math.min(1000, Number(e.target.value))))}
                        className="w-24 rounded border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden"
                      />
                      <span className="text-xs text-neutral-600">taps total</span>
                    </div>
                  ) : null}
                </div>
              </label>
            </div>
          </div>
        </fieldset>

        {/* Section 7: Execution & Simulation Controls */}
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className="text-sm font-semibold text-neutral-900">
            7. Execution Mode & Integration Simulation
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-mode`}
                className="block text-xs font-medium text-neutral-700"
              >
                Execution Mode
              </label>
              <select
                id={`${formId}-mode`}
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as PreRegistrationMode)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              >
                {PRE_REGISTRATION_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === "live"
                      ? "Live HikCentral OpenAPI"
                      : "Stub Simulation (Development)"}
                  </option>
                ))}
              </select>
            </div>

            {mode === "stub" ? (
              <div>
                <label
                  htmlFor={`${formId}-stub-scenario`}
                  className="block text-xs font-medium text-neutral-700"
                >
                  Stub Scenario
                </label>
                <select
                  id={`${formId}-stub-scenario`}
                  value={stubScenario}
                  onChange={(e) =>
                    setStubScenario(e.target.value as StubScenario)
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
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
            className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"
          >
            <p className="font-semibold">Pre-Registration Failed</p>
            <p className="mt-1">{globalError}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-500">
            Initial status will be set to{" "}
            <span className="font-semibold text-neutral-800">
              PENDING_APPROVAL
            </span>{" "}
            (or <span className="font-semibold text-neutral-800">DRAFT</span> for invite links).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateInviteLink}
              disabled={isGeneratingInvite || isSubmitting}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-xs transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingInvite ? "Generating Link..." : "🔗 Create Invite Link"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isNormalizing}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Dispatching Appointment..." : "Submit Pre-Registration"}
            </button>
          </div>
        </div>
      </form>

      {/* Generated Invitation Link Card */}
      {generatedInviteUrl ? (
        <section
          aria-label="Generated Self-Registration Link"
          className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                🔗
              </span>
              <h2 className="text-sm font-bold text-blue-950">
                Self-Registration Link Generated
              </h2>
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
              Single-use • Expiring
            </span>
          </div>

          <p className="mt-2 text-xs text-blue-900">
            Share this link with your invited visitor. They can open it on mobile
            or desktop, view the meeting schedule, enter their identity details,
            and upload a compliant selfie before arrival.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? `${window.location.origin}${generatedInviteUrl}` : generatedInviteUrl}
              className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 font-mono text-xs text-neutral-800 shadow-xs focus:outline-hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-blue-700"
              >
                {copiedInvite ? "✓ Copied!" : "Copy Link"}
              </button>
              <a
                href={generatedInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 shadow-xs transition hover:bg-blue-50"
              >
                Open Portal ↗
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {/* Result Display Card */}
      {createdVisit ? (
        <section
          aria-label="Created Pre-Registration Details"
          className="rounded-xl border border-emerald-300 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                {createdVisit.status}
              </span>
              <h2 className="mt-2 text-lg font-bold text-neutral-950">
                Visit Scheduled Successfully
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-500">Internal Visit ID</span>
              <p className="font-mono text-xs font-semibold text-neutral-800">
                {createdVisit.id}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* Left 2 Cols: Details */}
            <div className="space-y-4 md:col-span-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Visitor Information
                </h3>
                <p className="mt-1 text-base font-semibold text-neutral-900">
                  {createdVisit.visitorGivenName} {createdVisit.visitorFamilyName}
                </p>
                <p className="text-xs text-neutral-600">
                  {createdVisit.visitorPhone || "No phone"} &bull;{" "}
                  {createdVisit.visitorEmail || "No email"}
                </p>
                {createdVisit.certificateNo ? (
                  <p className="mt-1 text-xs text-neutral-600">
                    ID:{" "}
                    <span className="font-mono">
                      {createdVisit.certificateNo}
                    </span>{" "}
                    (Type {createdVisit.certificateType})
                  </p>
                ) : null}
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Facility & Schedule
                </h3>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {createdVisit.facilityName}
                </p>
                <div className="mt-1 space-y-1 text-xs text-neutral-700">
                  <p>
                    <span className="font-medium text-neutral-500">
                      Facility Local Time:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeFacility} &rarr;{" "}
                      {createdVisit.scheduledEndTimeFacility}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-neutral-500">
                      UTC Normalized:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeUtc} &rarr;{" "}
                      {createdVisit.scheduledEndTimeUtc}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Access Permissions & Tap Quota
                </h3>
                <div className="mt-2 space-y-1.5 text-xs text-neutral-700">
                  <p>
                    <span className="font-medium text-neutral-500">
                      Assigned Access Levels:
                    </span>{" "}
                    {createdVisit.accessLevelIds && createdVisit.accessLevelIds.length > 0 ? (
                      <span className="font-semibold text-neutral-900">
                        {createdVisit.accessLevelIds
                          .map(
                            (id) =>
                              accessLevels.find((l) => l.id === id)?.name ?? id,
                          )
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="italic text-neutral-400">
                        Default Lobby Gate only
                      </span>
                    )}
                  </p>
                  <p>
                    <span className="font-medium text-neutral-500">
                      Tap Quota:
                    </span>{" "}
                    {createdVisit.tapQuota?.mode === "limited" ? (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                        {createdVisit.tapQuota.maxTaps} physical entry taps authorized
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                        Unlimited taps during visit hours
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  HikCentral OpenAPI Execution Details
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 font-mono text-xs">
                  <div>
                    <dt className="text-[11px] text-neutral-500">
                      appointRecordId
                    </dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hikCentral?.appointRecordId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500">visitorId</dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hikCentral?.visitorId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500">
                      appointCode
                    </dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hikCentral?.appointCode ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500">
                      receptionistId
                    </dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hostId ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Right Col: Biometric Face & QR Pass Preview & Hardware Sync */}
            <div className="flex flex-col items-center justify-between space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Issued Credentials
                </span>
                <p className="mt-1 text-xs font-semibold text-neutral-900">
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
                      alt="Enrolled Face Biometric"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-1 text-[11px] font-medium text-emerald-800">
                    Biometric Face Enrolled
                  </span>
                </div>
              ) : null}

              {/* Digital QR Pass */}
              <div className="flex flex-col items-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-neutral-200 bg-white p-2 shadow-xs">
                  {createdVisit.hikCentral?.qrCodeImage ? (
                    <Image
                      src={`data:image/png;base64,${createdVisit.hikCentral.qrCodeImage}`}
                      alt={`Visitor QR Pass for ${createdVisit.visitorGivenName}`}
                      width={112}
                      height={112}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-neutral-400">No QR Code</div>
                  )}
                </div>
                <span className="mt-1 text-[11px] text-neutral-600">
                  Digital QR Pass
                </span>
              </div>

              {/* Credential Hardware Sync Status Badge & Retry Button */}
              <div className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-600">
                    Terminal Sync:
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      credentialSyncStatus === "Applied"
                        ? "bg-emerald-100 text-emerald-800"
                        : credentialSyncStatus === "Syncing"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {credentialSyncStatus}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRetrySync}
                  disabled={isRetryingSync}
                  className="mt-2.5 w-full rounded-md border border-neutral-300 bg-white py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRetryingSync ? "Syncing..." : "Retry Sync"}
                </button>

                {retrySyncMessage ? (
                  <p className="mt-1.5 text-[11px] text-neutral-600">
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
