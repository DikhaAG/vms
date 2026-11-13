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
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  PRE_REGISTRATION_MODES,
  STUB_SCENARIOS,
  type CertificateType,
  type PreRegistrationMode,
  type StubScenario,
} from "@/lib/vms/vms-contract";
import {
  createSampleFaceJpegDataUri,
  formatFacePhotoSize,
  isFacePhotoSizeValid,
  processBrowserImageFile,
  toJpegDataUri,
} from "@/lib/vms/face-normalizer";
import type {
  PublicInvitationMetadata,
  SelfRegistrationResult,
} from "@/lib/vms/invitation-contract";

interface InviteFormProps {
  token: string;
  initialData: PublicInvitationMetadata;
}

export function InviteForm({ token, initialData }: InviteFormProps) {
  const formId = useId();

  // Form Fields
  const [visitorGivenName, setVisitorGivenName] = useState(
    initialData.prefilledVisitor?.givenName ?? "",
  );
  const [visitorFamilyName, setVisitorFamilyName] = useState(
    initialData.prefilledVisitor?.familyName ?? "",
  );
  const [visitorPhone, setVisitorPhone] = useState(
    initialData.prefilledVisitor?.phone ?? "",
  );
  const [visitorEmail, setVisitorEmail] = useState(
    initialData.prefilledVisitor?.email ?? "",
  );
  const [certificateType, setCertificateType] = useState<CertificateType | "">(
    111,
  );
  const [certificateNo, setCertificateNo] = useState("");

  // Biometric Photo States
  const [facePhoto, setFacePhoto] = useState<string>("");
  const [faceByteSize, setFaceByteSize] = useState<number>(0);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Simulation Controls
  const [mode, setMode] = useState<PreRegistrationMode>("stub");
  const [stubScenario, setStubScenario] = useState<StubScenario>("success");

  // Status and Submission State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] =
    useState<SelfRegistrationResult | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleStartCamera = useCallback(async () => {
    setFaceError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFaceError("Camera access is not supported on this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setFaceError(
        err instanceof Error
          ? `Camera access error: ${err.message}`
          : "Unable to access camera. Please check browser permissions.",
      );
      setIsCameraActive(false);
    }
  }, []);

  const handleStopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const handleCaptureSelfie = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      setIsNormalizing(true);
      setFaceError(null);

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas 2D rendering context.");
      }

      const startX = ((video.videoWidth || size) - size) / 2;
      const startY = ((video.videoHeight || size) - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.85);
      });

      if (!blob) {
        throw new Error("Failed to capture image from camera.");
      }

      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      const normalized = await processBrowserImageFile(file);

      setFacePhoto(normalized.dataUri);
      setFaceByteSize(normalized.byteSize);
      handleStopCamera();
    } catch (err) {
      setFaceError(
        err instanceof Error ? err.message : "Selfie capture failed.",
      );
    } finally {
      setIsNormalizing(false);
    }
  }, [handleStopCamera]);

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsNormalizing(true);
      setFaceError(null);
      try {
        const normalized = await processBrowserImageFile(file);
        setFacePhoto(normalized.dataUri);
        setFaceByteSize(normalized.byteSize);
      } catch (err) {
        setFaceError(
          err instanceof Error
            ? err.message
            : "Failed to process uploaded photo.",
        );
      } finally {
        setIsNormalizing(false);
      }
    },
    [],
  );

  const handleLoadSamplePhoto = useCallback(() => {
    const sampleDataUri = createSampleFaceJpegDataUri(24 * 1024);
    setFacePhoto(sampleDataUri);
    setFaceByteSize(24 * 1024);
    setFaceError(null);
  }, []);

  const handleClearPhoto = useCallback(() => {
    setFacePhoto("");
    setFaceByteSize(0);
    setFaceError(null);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    // Client-side quick check
    const errors: Record<string, string> = {};
    if (!visitorGivenName.trim()) {
      errors.visitorGivenName = "First / Given name is required.";
    }
    if (!visitorFamilyName.trim()) {
      errors.visitorFamilyName = "Last / Family name is required.";
    }
    if (certificateNo.trim() && !certificateType) {
      errors.certificateType = "Certificate type is required.";
    }
    if (facePhoto && !isFacePhotoSizeValid(faceByteSize)) {
      errors.facePhoto = "Face photo must be between 10 KB and 100 KB.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        visitorGivenName: visitorGivenName.trim(),
        visitorFamilyName: visitorFamilyName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        visitorEmail: visitorEmail.trim() || undefined,
        certificateType: certificateType ? Number(certificateType) : undefined,
        certificateNo: certificateNo.trim() || undefined,
        facePhoto: facePhoto || undefined,
        mode,
        stubScenario,
      };

      const res = await fetch(`/api/vms/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as SelfRegistrationResult;

      if (!res.ok || !data.ok) {
        if (data.error?.fieldErrors) {
          setFieldErrors(data.error.fieldErrors);
        }
        setGlobalError(
          data.error?.message ??
            `Registration failed (${res.status}). Please try again.`,
        );
        return;
      }

      setRegistrationResult(data);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Network error occurred during registration.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassDetails = useCallback(() => {
    if (!registrationResult?.visit) return;
    const v = registrationResult.visit;
    const passCode = registrationResult.qrPass?.appointCode ?? "N/A";
    const text = [
      `VMS Digital Pass: ${passCode}`,
      `Visitor: ${v.visitorGivenName} ${v.visitorFamilyName}`,
      `Facility: ${initialData.facility.name}`,
      `Address: ${initialData.facility.address ?? ""}`,
      `Date & Time: ${initialData.scheduledStartTimeFacility} to ${initialData.scheduledEndTimeFacility} (${initialData.facility.timezone})`,
      `Host: ${initialData.host?.name ?? "Host"}`,
    ].join("\n");

    navigator.clipboard?.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 3000);
  }, [registrationResult, initialData]);

  // If successfully registered, display Digital QR Pass confirmation
  if (registrationResult?.ok && registrationResult.visit) {
    const v = registrationResult.visit;
    const qrPass = registrationResult.qrPass;

    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
            Registration Complete!
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Your appointment has been registered and scheduled with the
            facility access control system.
          </p>
        </div>

        {/* Digital QR Pass Card */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
                  Digital Visitor Pass
                </span>
                <h3 className="text-lg font-bold">
                  {initialData.facility.name}
                </h3>
              </div>
              {qrPass?.appointCode && (
                <span className="rounded-lg bg-neutral-800 px-3 py-1 font-mono text-sm font-semibold tracking-wider text-emerald-400 border border-neutral-700">
                  #{qrPass.appointCode}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-center sm:items-start">
                {/* QR Code */}
                {qrPass?.qrCodeImage ? (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toJpegDataUri(qrPass.qrCodeImage).replace(
                        "image/jpeg",
                        "image/png",
                      )}
                      alt="Digital Visitor QR Pass"
                      width={160}
                      height={160}
                      className="h-40 w-40 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center text-xs text-neutral-500">
                    Facial Recognition Credential Activated
                  </div>
                )}
                <span className="mt-2 text-xs font-medium text-neutral-500">
                  Scan at turnstiles or gate terminals
                </span>
              </div>

              {/* Visitor & Visit Info */}
              <div className="flex-1 space-y-4 text-sm">
                <div>
                  <span className="text-xs text-neutral-500">Visitor Name</span>
                  <p className="font-semibold text-neutral-900">
                    {v.visitorGivenName} {v.visitorFamilyName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-neutral-500">Host</span>
                    <p className="font-medium text-neutral-800">
                      {initialData.host?.name ?? "Host Sponsor"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Purpose</span>
                    <p className="font-medium text-neutral-800">
                      {initialData.visitReasonLabel}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-neutral-500">
                    Scheduled Window ({initialData.facility.timezone})
                  </span>
                  <p className="font-mono text-xs font-semibold text-neutral-900">
                    {initialData.scheduledStartTimeFacility.replace("T", " ")} —{" "}
                    {initialData.scheduledEndTimeFacility.replace("T", " ")}
                  </p>
                </div>

                {initialData.facility.address && (
                  <div>
                    <span className="text-xs text-neutral-500">Address</span>
                    <p className="text-xs text-neutral-700">
                      {initialData.facility.address}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3 border-t border-neutral-100 pt-6">
              <button
                type="button"
                onClick={handleCopyPassDetails}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-xs transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                {copiedPass ? "✓ Details Copied!" : "Copy Pass Summary"}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                Print / Save Pass
              </button>
            </div>
          </div>
        </div>

        {/* Visiting Guidelines */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700">
          <h4 className="font-semibold text-neutral-900">
            Visiting Guidelines & Instructions
          </h4>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-neutral-600">
            <li>
              Please arrive 10–15 minutes before your scheduled appointment
              time.
            </li>
            <li>
              Present your QR code pass or step in front of the facial
              recognition terminal at the lobby turnstiles.
            </li>
            <li>
              Ensure you carry a valid photo ID (KTP/Passport) matching your
              registration details for physical security verification.
            </li>
            <li>
              If you need assistance or rescheduling, contact your host (
              {initialData.host?.name ?? "Host"}).
            </li>
          </ul>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {globalError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-medium">Registration Error</p>
          <p className="mt-1 text-xs">{globalError}</p>
        </div>
      )}

      {/* Visitor Identity Details */}
      <fieldset className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <legend className="px-2 text-sm font-semibold text-neutral-900">
          Your Personal Details
        </legend>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Given Name */}
          <div>
            <label
              htmlFor={`${formId}-given-name`}
              className="block text-xs font-medium text-neutral-700"
            >
              First / Given Name <span className="text-red-500">*</span>
            </label>
            <input
              id={`${formId}-given-name`}
              type="text"
              required
              value={visitorGivenName}
              onChange={(e) => setVisitorGivenName(e.target.value)}
              placeholder="e.g. Rian"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            />
            {fieldErrors.visitorGivenName && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.visitorGivenName}
              </p>
            )}
          </div>

          {/* Family Name */}
          <div>
            <label
              htmlFor={`${formId}-family-name`}
              className="block text-xs font-medium text-neutral-700"
            >
              Last / Family Name <span className="text-red-500">*</span>
            </label>
            <input
              id={`${formId}-family-name`}
              type="text"
              required
              value={visitorFamilyName}
              onChange={(e) => setVisitorFamilyName(e.target.value)}
              placeholder="e.g. Pratama"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            />
            {fieldErrors.visitorFamilyName && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.visitorFamilyName}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor={`${formId}-phone`}
              className="block text-xs font-medium text-neutral-700"
            >
              Mobile Phone
            </label>
            <input
              id={`${formId}-phone`}
              type="tel"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
              placeholder="e.g. +628123456789"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            />
            {fieldErrors.visitorPhone && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.visitorPhone}
              </p>
            )}
          </div>

          {/* Email */}
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
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
              placeholder="e.g. visitor@example.com"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            />
            {fieldErrors.visitorEmail && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.visitorEmail}
              </p>
            )}
          </div>

          {/* Certificate Type */}
          <div>
            <label
              htmlFor={`${formId}-cert-type`}
              className="block text-xs font-medium text-neutral-700"
            >
              ID Document Type
            </label>
            <select
              id={`${formId}-cert-type`}
              value={certificateType}
              onChange={(e) =>
                setCertificateType(
                  e.target.value ? (Number(e.target.value) as CertificateType) : "",
                )
              }
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            >
              <option value="">None / Optional</option>
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CERTIFICATE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Certificate Number */}
          <div>
            <label
              htmlFor={`${formId}-cert-no`}
              className="block text-xs font-medium text-neutral-700"
            >
              ID Document Number
            </label>
            <input
              id={`${formId}-cert-no`}
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={certificateNo}
              onChange={(e) => setCertificateNo(e.target.value)}
              placeholder="e.g. 3171012345670001"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            />
            {fieldErrors.certificateNo && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.certificateNo}
              </p>
            )}
            {fieldErrors.certificateType && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.certificateType}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Biometric Face Photo Enrollment */}
      <fieldset className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <legend className="px-2 text-sm font-semibold text-neutral-900">
            Biometric Face Photo (Fast Turnstile Access)
          </legend>
          {faceByteSize > 0 && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isFacePhotoSizeValid(faceByteSize)
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isFacePhotoSizeValid(faceByteSize)
                ? `✓ ${formatFacePhotoSize(faceByteSize)} (Compliant)`
                : `⚠ ${formatFacePhotoSize(faceByteSize)} (Requires 10–100 KB)`}
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-neutral-500">
          Upload a clear selfie or use your device camera. Our pipeline
          automatically crops and normalizes the photo into a HikCentral-compliant
          JPEG strictly between 10 KB and 100 KB.
        </p>

        {faceError && (
          <p className="mt-2 text-xs text-red-600">{faceError}</p>
        )}
        {fieldErrors.facePhoto && (
          <p className="mt-2 text-xs text-red-600">{fieldErrors.facePhoto}</p>
        )}

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Photo Preview or Camera Stream */}
          <div className="relative flex h-48 w-48 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 shadow-inner">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : facePhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={facePhoto}
                alt="Visitor selfie preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center p-3 text-center text-xs text-neutral-400">
                <svg
                  className="h-10 w-10 text-neutral-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="mt-1">No face photo</span>
              </div>
            )}

            {isNormalizing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs">
                <span className="text-xs font-semibold text-neutral-700">
                  Normalizing...
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3">
            {isCameraActive ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCaptureSelfie}
                  disabled={isNormalizing}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-neutral-800"
                >
                  📸 Take Selfie
                </button>
                <button
                  type="button"
                  onClick={handleStopCamera}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50"
                >
                  Cancel Camera
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-xs transition hover:bg-neutral-50"
                >
                  📷 Use Camera
                </button>

                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-xs transition hover:bg-neutral-50">
                  📁 Upload Photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>

                {facePhoto ? (
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Remove Photo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLoadSamplePhoto}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
                  >
                    ⚡ Use Sample
                  </button>
                )}
              </div>
            )}

            <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
              <span className="font-semibold text-neutral-800">
                Photo Guidelines:
              </span>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Look directly at the camera with neutral expression.</li>
                <li>Ensure even lighting without heavy shadows or glare.</li>
                <li>Remove hats, sunglasses, or face coverings.</li>
              </ul>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Simulation Controls (Optional Collapsible) */}
      <details className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
        <summary className="cursor-pointer font-semibold text-neutral-700">
          Simulation & Hardware Execution Settings
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-neutral-600">Execution Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PreRegistrationMode)}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800"
            >
              {PRE_REGISTRATION_MODES.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          {mode === "stub" && (
            <div>
              <label className="block text-neutral-600">Stub Scenario</label>
              <select
                value={stubScenario}
                onChange={(e) =>
                  setStubScenario(e.target.value as StubScenario)
                }
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800"
              >
                {STUB_SCENARIOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </details>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || isNormalizing}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? "Completing Registration..." : "Complete Registration & Get Pass →"}
        </button>
      </div>
    </form>
  );
}
