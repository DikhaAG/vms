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
import type {
  Facility,
  Visit,
  VisitReasonType,
  CertificateType,
} from "@/lib/vms/vms-contract";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  VISIT_REASON_TYPES,
  VISIT_REASON_LABELS,
} from "@/lib/vms/vms-contract";
import type { AccessLevel, TapQuotaMode } from "@/lib/vms/access-level-contract";
import type {
  CheckInPass,
  VerificationMethod,
} from "@/lib/vms/checkin-contract";
import { VERIFICATION_METHODS } from "@/lib/vms/checkin-contract";
import {
  createSampleFaceJpegDataUri,
  formatFacePhotoSize,
  isFacePhotoSizeValid,
  processBrowserImageFile,
  toJpegDataUri,
} from "@/lib/vms/face-normalizer";

interface ReceptionClientProps {
  facilities: Facility[];
  allAccessLevels: AccessLevel[];
  initialVisits: Visit[];
}

export function ReceptionClient({
  facilities,
  allAccessLevels,
  initialVisits,
}: ReceptionClientProps) {
  const formId = useId();

  // Active Receptionist User
  const receptionistUser = {
    id: "rec-01",
    name: "Dewi Frontdesk",
    role: "Front-Desk Receptionist",
  };

  // State: Visits & Filter
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"expected" | "checked_in" | "all">("expected");
  const [isSearching, setIsSearching] = useState(false);

  // State: Verification Modal (Check-in Approved Visit)
  const [verifyingVisit, setVerifyingVisit] = useState<Visit | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("id_card");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // State: Issued Pass Modal
  const [issuedPass, setIssuedPass] = useState<CheckInPass | null>(null);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // State: Walk-in Modal
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInFacilityId, setWalkInFacilityId] = useState<string>(
    facilities[0]?.id || "fac-jakarta",
  );
  const [walkInHostId, setWalkInHostId] = useState("emp-host-01");
  const [walkInHostName, setWalkInHostName] = useState("Budi Santoso");
  const [walkInFamilyName, setWalkInFamilyName] = useState("");
  const [walkInGivenName, setWalkInGivenName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInCertType, setWalkInCertType] = useState<CertificateType>(111);
  const [walkInCertNo, setWalkInCertNo] = useState("");
  const [walkInReasonType, setWalkInReasonType] = useState<VisitReasonType>(0);
  const [walkInReasonDetail, setWalkInReasonDetail] = useState("");
  const [walkInAccessLevelIds, setWalkInAccessLevelIds] = useState<string[]>([]);
  const [walkInTapQuotaMode, setWalkInTapQuotaMode] = useState<TapQuotaMode>("limited");
  const [walkInMaxTaps, setWalkInMaxTaps] = useState<number>(1);
  const [walkInFacePhoto, setWalkInFacePhoto] = useState<string>("");
  const [walkInFaceByteSize, setWalkInFaceByteSize] = useState<number>(0);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Returning visitor lookup for walk-in
  const [isLookingUpWalkIn, setIsLookingUpWalkIn] = useState(false);
  const [walkInReturningProfile, setWalkInReturningProfile] = useState<{
    givenName?: string;
    familyName?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    certificateType?: number;
    certificateNo?: string;
    facePhoto?: string;
  } | null>(null);

  useEffect(() => {
    const isAnyModalOpen = Boolean(verifyingVisit || isWalkInModalOpen || issuedPass);
    if (!isAnyModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (verifyingVisit) {
          setVerifyingVisit(null);
          setCheckInError(null);
        } else if (isWalkInModalOpen) {
          setIsWalkInModalOpen(false);
          setWalkInError(null);
        } else if (issuedPass) {
          setIssuedPass(null);
          setSyncFeedback(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [verifyingVisit, isWalkInModalOpen, issuedPass]);

  async function checkReturningWalkInVisitor(cert: string) {
    const trimmed = cert.trim();
    if (!trimmed) {
      setWalkInReturningProfile(null);
      return;
    }
    setIsLookingUpWalkIn(true);
    try {
      const res = await fetch(
        `/api/vms/visitors/lookup?certificateNo=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (data.ok && data.found && data.profile) {
        setWalkInReturningProfile(data.profile);
      } else {
        setWalkInReturningProfile(null);
      }
    } catch {
      setWalkInReturningProfile(null);
    } finally {
      setIsLookingUpWalkIn(false);
    }
  }

  function applyReturningWalkInProfile(
    profile: NonNullable<typeof walkInReturningProfile>,
  ) {
    if (profile.givenName) setWalkInGivenName(profile.givenName);
    if (profile.familyName) setWalkInFamilyName(profile.familyName);
    if (profile.phone) setWalkInPhone(profile.phone);
    if (profile.email) setWalkInEmail(profile.email);
    if (
      profile.certificateType &&
      [111, 414, 335, 222].includes(profile.certificateType)
    ) {
      setWalkInCertType(profile.certificateType as CertificateType);
    }
    if (profile.facePhoto) {
      setWalkInFacePhoto(profile.facePhoto);
      setWalkInFaceByteSize(Math.round((profile.facePhoto.length * 3) / 4));
      setFaceError(null);
    }
  }

  // Camera capture state for walk-in
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Search execution
  const fetchVisits = useCallback(
    async (query: string, facilityId: string) => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (facilityId !== "all") params.set("facilityId", facilityId);

        const res = await fetch(`/api/vms/check-in/search?${params.toString()}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setVisits(data.data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVisits(searchQuery, selectedFacilityId);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedFacilityId, fetchVisits]);

  // Filtered visits by tab
  const filteredVisits = visits.filter((v) => {
    if (activeTab === "expected") return v.status === "APPROVED";
    if (activeTab === "checked_in") return v.status === "CHECKED_IN";
    return true;
  });

  const countExpected = visits.filter((v) => v.status === "APPROVED").length;
  const countCheckedIn = visits.filter((v) => v.status === "CHECKED_IN").length;
  const countAll = visits.length;

  // Camera start / stop
  const handleStartCamera = useCallback(async () => {
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
      setCameraError(
        err instanceof Error ? err.message : "Unable to access camera.",
      );
    }
  }, []);

  const handleStopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleCaptureSelfie = useCallback(async () => {
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
      setWalkInFacePhoto(normalized.dataUri);
      setWalkInFaceByteSize(normalized.byteSize);
      handleStopCamera();
    } catch (err) {
      setFaceError(err instanceof Error ? err.message : "Selfie capture failed.");
    } finally {
      setIsNormalizing(false);
    }
  }, [handleStopCamera]);

  const handleFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsNormalizing(true);
    setFaceError(null);
    try {
      const normalized = await processBrowserImageFile(file);
      setWalkInFacePhoto(normalized.dataUri);
      setWalkInFaceByteSize(normalized.byteSize);
    } catch (err) {
      setFaceError(err instanceof Error ? err.message : "Failed to process photo.");
    } finally {
      setIsNormalizing(false);
    }
  }, []);

  const handleLoadSamplePhoto = useCallback(() => {
    const sample = createSampleFaceJpegDataUri(24 * 1024);
    setWalkInFacePhoto(sample);
    setWalkInFaceByteSize(24 * 1024);
    setFaceError(null);
  }, []);

  const handleClearPhoto = useCallback(() => {
    setWalkInFacePhoto("");
    setWalkInFaceByteSize(0);
    setFaceError(null);
  }, []);

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

      // Success
      setVerifyingVisit(null);
      setCheckInNotes("");
      setIssuedPass(json.data.pass);
      // Refresh list
      await fetchVisits(searchQuery, selectedFacilityId);
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "An error occurred during check-in.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Walk-in submit execution
  const handleSubmitWalkIn = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingWalkIn(true);
    setWalkInError(null);

    try {
      if (!walkInFamilyName.trim() || !walkInGivenName.trim()) {
        throw new Error("Visitor given name and family name are required.");
      }

      const res = await fetch("/api/vms/check-in/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: walkInFacilityId,
          hostId: walkInHostId,
          hostName: walkInHostName,
          visitorFamilyName: walkInFamilyName.trim(),
          visitorGivenName: walkInGivenName.trim(),
          visitorPhone: walkInPhone.trim() || undefined,
          visitorEmail: walkInEmail.trim() || undefined,
          certificateType: walkInCertType,
          certificateNo: walkInCertNo.trim() || undefined,
          visitReasonType: walkInReasonType,
          visitReasonDetail: walkInReasonDetail.trim() || undefined,
          accessLevelIds: walkInAccessLevelIds.length > 0 ? walkInAccessLevelIds : undefined,
          tapQuota: {
            mode: walkInTapQuotaMode,
            maxTaps: walkInTapQuotaMode === "limited" ? Number(walkInMaxTaps) : 0,
          },
          facePhoto: walkInFacePhoto || undefined,
          receptionistUserId: receptionistUser.id,
          receptionistName: receptionistUser.name,
          verificationMethod: "id_card",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || "Walk-in registration failed.");
      }

      // Success
      setIsWalkInModalOpen(false);
      resetWalkInForm();
      setIssuedPass(json.data.pass);
      await fetchVisits(searchQuery, selectedFacilityId);
    } catch (err) {
      setWalkInError(err instanceof Error ? err.message : "Failed to register walk-in.");
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  const resetWalkInForm = () => {
    setWalkInFamilyName("");
    setWalkInGivenName("");
    setWalkInPhone("");
    setWalkInEmail("");
    setWalkInCertNo("");
    setWalkInReasonDetail("");
    setWalkInFacePhoto("");
    setWalkInFaceByteSize(0);
    setWalkInAccessLevelIds([]);
    handleStopCamera();
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
        setSyncFeedback("Sync reapplication dispatched successfully to physical access terminals.");
        setIssuedPass({
          ...issuedPass,
          credentialSyncStatus: "Applied",
        });
        await fetchVisits(searchQuery, selectedFacilityId);
      } else {
        setSyncFeedback(json.error || "Retry failed.");
      }
    } catch (err) {
      setSyncFeedback(err instanceof Error ? err.message : "Network error.");
    } finally {
      setIsRetryingSync(false);
    }
  };

  // Filter access levels for walk-in form based on chosen facility
  const availableAccessLevels = allAccessLevels.filter(
    (al) => al.facilityId === walkInFacilityId,
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Operator Identity & Fast Actions */}
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-semibold text-sm">
            DF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900">
                {receptionistUser.name}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-2xs font-medium text-neutral-600">
                {receptionistUser.id}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Terminal Resepsionis Lobi &bull; {facilities.find((f) => f.id === selectedFacilityId)?.name || "Semua Gedung Fasilitas"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetWalkInForm();
              setIsWalkInModalOpen(true);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            + Daftarkan Tamu Datang Langsung (Walk-in)
          </button>
        </div>
      </div>

      {/* Search, Filter & Environment Control Bar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tamu berdasarkan nama, nomor telepon, nomor identitas, atau kode QR..."
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-8 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-neutral-600"
              >
                &times;
              </button>
            )}
          </div>

          {/* Facility Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor={`${formId}-facility`} className="text-xs font-medium text-neutral-600 whitespace-nowrap">
              Gedung:
            </label>
            <select
              id={`${formId}-facility`}
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 focus:border-emerald-600 focus:ring-emerald-600"
            >
              <option value="all">Semua Gedung Fasilitas</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.timezone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex border-b border-neutral-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("expected")}
            className={`pb-2.5 px-3.5 border-b-2 font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === "expected"
                ? "border-emerald-600 text-emerald-800 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span>Tamu Diharapkan Hari Ini</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
              activeTab === "expected" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
            }`}>
              {countExpected}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checked_in")}
            className={`pb-2.5 px-3.5 border-b-2 font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === "checked_in"
                ? "border-blue-600 text-blue-800 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span>Sedang di Gedung</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
              activeTab === "checked_in" ? "bg-blue-100 text-blue-800" : "bg-neutral-100 text-neutral-600"
            }`}>
              {countCheckedIn}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`pb-2.5 px-3.5 border-b-2 font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === "all"
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span>Semua Kunjungan</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-mono font-medium text-neutral-600">
              {countAll}
            </span>
          </button>
        </div>
      </div>

      {/* Arrival Queue / Visits Display */}
      {isSearching ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500 shadow-xs">
          Memuat antrean kedatangan tamu...
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-xs">
          <svg
            className="mx-auto h-10 w-10 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">Tidak Ada Tamu Ditemukan</h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada tamu yang cocok dengan "${searchQuery}". Coba gunakan kata kunci lain atau daftarkan tamu datang langsung (walk-in).`
              : "Tidak ada tamu dalam antrean ini. Tamu datang langsung (walk-in) dapat didaftarkan melalui tombol di atas."}
          </p>
          <button
            type="button"
            onClick={() => {
              resetWalkInForm();
              setIsWalkInModalOpen(true);
            }}
            className="mt-4 inline-flex items-center rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 cursor-pointer"
          >
            Daftarkan Tamu Datang Langsung
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVisits.map((visit) => {
            const isApproved = visit.status === "APPROVED";
            const isCheckedIn = visit.status === "CHECKED_IN";

            return (
              <div
                key={visit.id}
                className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                  isCheckedIn
                    ? "border-blue-200 bg-blue-50/20"
                    : isApproved
                      ? "border-emerald-200"
                      : "border-neutral-200"
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
                          className="h-12 w-12 rounded-full object-cover border border-neutral-200 shadow-2xs"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-semibold text-sm border border-neutral-200">
                          {visit.visitorGivenName[0]}
                          {visit.visitorFamilyName[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 leading-tight">
                          {visit.visitorGivenName} {visit.visitorFamilyName}
                        </h4>
                        <p className="text-xs text-neutral-500">
                          {visit.certificateType
                            ? CERTIFICATE_TYPE_LABELS[visit.certificateType]
                            : "ID"}
                          : {visit.certificateNo || "None"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
                          isCheckedIn
                            ? "bg-blue-100 text-blue-800"
                            : isApproved
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {visit.status.replace("_", " ")}
                      </span>
                      {visit.credentialSyncStatus && (
                        <span
                          className={`rounded-full px-2 py-0.2 text-3xs font-medium ${
                            visit.credentialSyncStatus === "Applied"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : visit.credentialSyncStatus === "Failed"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          Sync: {visit.credentialSyncStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visit Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-neutral-600">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Karyawan Tuan Rumah:</span>
                      <span className="font-medium text-neutral-900">
                        {visit.hostName || "Tamu Meja Depan"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Gedung:</span>
                      <span>{visit.facilityName || visit.facilityId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Keperluan:</span>
                      <span className="font-medium text-neutral-800">
                        {VISIT_REASON_LABELS[visit.visitReasonType]}
                        {visit.visitReasonDetail ? ` (${visit.visitReasonDetail})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Jadwal:</span>
                      <span className="font-mono text-neutral-800">
                        {visit.scheduledStartTimeFacility.split("T")[1]?.substring(0, 5)} - {visit.scheduledEndTimeFacility.split("T")[1]?.substring(0, 5)}
                      </span>
                    </div>
                    {visit.actualCheckInTimeUtc && (
                      <div className="flex items-center justify-between text-blue-700">
                        <span>Waktu Masuk:</span>
                        <span className="font-mono font-medium">
                          {new Date(visit.actualCheckInTimeUtc).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {visit.hikCentral?.pinCode && (
                      <div className="flex items-center justify-between bg-neutral-100 rounded px-2 py-1">
                        <span className="text-neutral-600">Kode PIN:</span>
                        <span className="font-mono font-bold tracking-wider text-neutral-900">
                          {visit.hikCentral.pinCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2">
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyingVisit(visit);
                        setCheckInError(null);
                        setCheckInNotes("");
                      }}
                      className="w-full inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
                    >
                      Verifikasi &amp; Proses Masuk
                    </button>
                  )}
                  {isCheckedIn && (
                    <button
                      type="button"
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
                          facilityId: visit.facilityId,
                          facilityName: visit.facilityName,
                          scheduledStartTime: visit.scheduledStartTimeFacility,
                          scheduledEndTime: visit.scheduledEndTimeFacility,
                          actualCheckInTimeUtc: visit.actualCheckInTimeUtc || new Date().toISOString(),
                          qrCodeImage: visit.hikCentral?.qrCodeImage,
                          pinCode: visit.hikCentral?.pinCode,
                          appointRecordId: visit.hikCentral?.appointRecordId || "",
                          visitorId: visit.hikCentral?.visitorId || "",
                          credentialSyncStatus: visit.credentialSyncStatus || "Applied",
                        });
                        setSyncFeedback(null);
                      }}
                      className="w-full inline-flex min-h-9 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 cursor-pointer"
                    >
                      Lihat Lencana Akses
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verification & Check-in Modal */}
      {verifyingVisit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Verifikasi Identitas Tamu
                </h3>
                <p className="text-xs text-neutral-500">
                  Periksa kesesuaian foto dan dokumen identitas fisik sebelum mengaktifkan hak akses pintu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingVisit(null)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {checkInError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {checkInError}
              </div>
            )}

            <div className="mt-4 flex gap-4">
              {/* Photo preview */}
              <div className="flex flex-col items-center">
                {verifyingVisit.facePhoto ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={toJpegDataUri(verifyingVisit.facePhoto)}
                    alt="Foto Tamu"
                    className="h-28 w-28 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 font-medium text-xs border border-neutral-300">
                    Tanpa Foto Wajah
                  </div>
                )}
                <span className="mt-1.5 text-3xs font-medium text-neutral-500">
                  {verifyingVisit.facePhoto ? "Biometrik Wajah Terdaftar" : "Hanya Lencana Fisik / Kartu"}
                </span>
              </div>

              {/* Identity details */}
              <div className="flex-1 space-y-1.5 text-xs text-neutral-700">
                <div>
                  <span className="text-neutral-400">Nama Lengkap:</span>
                  <p className="font-bold text-neutral-900 text-sm">
                    {verifyingVisit.visitorGivenName} {verifyingVisit.visitorFamilyName}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400">Nomor Identitas:</span>
                  <p className="font-mono text-neutral-900">
                    {verifyingVisit.certificateType
                      ? CERTIFICATE_TYPE_LABELS[verifyingVisit.certificateType]
                      : "ID"}
                    : {verifyingVisit.certificateNo || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400">Tuan Rumah &amp; Fasilitas:</span>
                  <p className="text-neutral-900 font-medium">
                    {verifyingVisit.hostName || "Host"} &bull; {verifyingVisit.facilityName || verifyingVisit.facilityId}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400">Jam Kunjungan:</span>
                  <p className="font-mono text-neutral-900">
                    {verifyingVisit.scheduledStartTimeFacility.split("T")[1]?.substring(0, 5)} - {verifyingVisit.scheduledEndTimeFacility.split("T")[1]?.substring(0, 5)}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Method Radio Selection */}
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <label className="block text-xs font-semibold text-neutral-900 mb-2">
                Metode Verifikasi yang Diterapkan:
              </label>
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
                      className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition ${
                        verificationMethod === m
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-medium"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="verificationMethod"
                        value={m}
                        checked={verificationMethod === m}
                        onChange={() => setVerificationMethod(m)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{methodLabels[m] || m.replace("_", " ")}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Receptionist Notes */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Catatan Resepsionis (Opsional):
              </label>
              <input
                type="text"
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Contoh: Kartu KTP asli telah diperiksa dan sesuai identitas tamu."
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVerifyingVisit(null)}
                disabled={isCheckingIn}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckIn}
                disabled={isCheckingIn}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 cursor-pointer"
              >
                {isCheckingIn ? "Memproses Masuk..." : "Konfirmasi & Proses Masuk"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Registration Modal */}
      {isWalkInModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Pendaftaran Tamu Datang Langsung (Walk-in)
                </h3>
                <p className="text-xs text-neutral-500">
                  Pendaftaran kilat dan pengaktifan hak akses pintu untuk tamu lobi tanpa janji temu sebelumnya.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWalkInModalOpen(false);
                  handleStopCamera();
                }}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {walkInError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {walkInError}
              </div>
            )}

            <form onSubmit={handleSubmitWalkIn} className="mt-4 space-y-4">
              {/* Facility & Host row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Gedung Fasilitas *
                  </label>
                  <select
                    value={walkInFacilityId}
                    onChange={(e) => setWalkInFacilityId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.timezone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Karyawan Tuan Rumah *
                  </label>
                  <select
                    value={walkInHostId}
                    onChange={(e) => {
                      setWalkInHostId(e.target.value);
                      const option = e.target.options[e.target.selectedIndex];
                      setWalkInHostName(option.text);
                    }}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  >
                    <option value="emp-host-01">Budi Santoso (Engineering Manager)</option>
                    <option value="emp-host-02">Siti Rahma (Operations Lead)</option>
                    <option value="emp-host-03">Andi Pratama (Executive Director)</option>
                    <option value="emp-general">Front Desk General Host</option>
                  </select>
                </div>
              </div>

              {/* Names row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Nama Depan *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInGivenName}
                    onChange={(e) => setWalkInGivenName(e.target.value)}
                    placeholder="Contoh: Hendra"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Nama Belakang / Marga *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInFamilyName}
                    onChange={(e) => setWalkInFamilyName(e.target.value)}
                    placeholder="Contoh: Gunawan"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Contact row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="+628..."
                    className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    placeholder="tamu@instansi.com"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Certificate row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Jenis Kartu Identitas
                  </label>
                  <select
                    value={walkInCertType}
                    onChange={(e) => setWalkInCertType(Number(e.target.value) as CertificateType)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  >
                    {CERTIFICATE_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {CERTIFICATE_TYPE_LABELS[ct]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="walk-in-cert-no" className="block text-xs font-medium text-neutral-700 mb-1">
                    Nomor Dokumen Identitas (NIK/Paspor)
                  </label>
                  <div className="relative">
                    <input
                      id="walk-in-cert-no"
                      type="text"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={walkInCertNo}
                      onBlur={() => checkReturningWalkInVisitor(walkInCertNo)}
                      onChange={(e) => {
                        setWalkInCertNo(e.target.value);
                        if (walkInReturningProfile) setWalkInReturningProfile(null);
                      }}
                      placeholder="Contoh: 3171010101010001"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 font-mono focus:border-emerald-600 focus:ring-emerald-600"
                    />
                    {isLookingUpWalkIn && (
                      <span className="absolute right-2 top-1.5 text-[11px] text-neutral-400">
                        Mencari data...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Returning Visitor Recognized Banner */}
              {walkInReturningProfile && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {walkInReturningProfile.facePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={walkInReturningProfile.facePhoto}
                        alt="Foto Wajah Tersimpan"
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover border border-emerald-200"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900">
                        {walkInReturningProfile.givenName?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-emerald-950">
                        Tamu Sebelumnya Ditemukan!
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        {walkInReturningProfile.fullName ||
                          `${walkInReturningProfile.givenName} ${walkInReturningProfile.familyName}`}{" "}
                        &bull; Profil tersimpan &amp; foto biometrik siap digunakan
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      applyReturningWalkInProfile(walkInReturningProfile)
                    }
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Isi Otomatis Data &amp; Foto
                  </button>
                </div>
              )}

              {/* Purpose row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Keperluan Kunjungan *
                  </label>
                  <select
                    value={walkInReasonType}
                    onChange={(e) => setWalkInReasonType(Number(e.target.value) as VisitReasonType)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  >
                    {VISIT_REASON_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {VISIT_REASON_LABELS[rt]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Rincian Keperluan {walkInReasonType === 4 ? "*" : "(opsional)"}
                  </label>
                  <input
                    type="text"
                    required={walkInReasonType === 4}
                    value={walkInReasonDetail}
                    onChange={(e) => setWalkInReasonDetail(e.target.value)}
                    placeholder="Contoh: Pemeliharaan perangkat server vendor"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Access Levels selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                  Hak Akses Pintu Fisik (Khusus Gedung Terpilih):
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availableAccessLevels.map((al) => (
                    <label
                      key={al.id}
                      className={`flex items-start gap-2 rounded-lg border p-2 text-xs cursor-pointer ${
                        walkInAccessLevelIds.includes(al.id)
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                          : "border-neutral-200 text-neutral-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={walkInAccessLevelIds.includes(al.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWalkInAccessLevelIds([...walkInAccessLevelIds, al.id]);
                          } else {
                            setWalkInAccessLevelIds(walkInAccessLevelIds.filter((id) => id !== al.id));
                          }
                        }}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="font-medium">{al.name}</div>
                        {al.description && <div className="text-3xs text-neutral-500">{al.description}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tap Quota Configuration */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <span className="block text-xs font-semibold text-neutral-900 mb-2">
                  Door Tap Quota Enforcement:
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tapQuotaMode"
                      value="limited"
                      checked={walkInTapQuotaMode === "limited"}
                      onChange={() => setWalkInTapQuotaMode("limited")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Limited Taps:</span>
                  </label>
                  {walkInTapQuotaMode === "limited" && (
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={walkInMaxTaps}
                      onChange={(e) => setWalkInMaxTaps(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs font-mono"
                    />
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="tapQuotaMode"
                      value="unlimited"
                      checked={walkInTapQuotaMode === "unlimited"}
                      onChange={() => setWalkInTapQuotaMode("unlimited")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Unlimited during visiting hours</span>
                  </label>
                </div>
              </div>

              {/* Photo Enrollment (Webcam or Upload) */}
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-900">
                    Biometric Face Photo (MinMoe Terminal Enrollment)
                  </span>
                  {walkInFacePhoto && (
                    <span
                      className={`text-3xs font-semibold px-2 py-0.5 rounded-full ${
                        isFacePhotoSizeValid(walkInFaceByteSize)
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {formatFacePhotoSize(walkInFaceByteSize)} (10–100 KB)
                    </span>
                  )}
                </div>

                {cameraActive ? (
                  <div className="relative rounded-lg overflow-hidden bg-black max-w-sm mx-auto aspect-4/3">
                    <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureSelfie}
                        disabled={isNormalizing}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
                      >
                        {isNormalizing ? "Processing..." : "Capture Photo"}
                      </button>
                      <button
                        type="button"
                        onClick={handleStopCamera}
                        className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : walkInFacePhoto ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={walkInFacePhoto}
                      alt="Enrolled Face"
                      className="h-20 w-20 rounded-lg object-cover border border-neutral-300"
                    />
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-600">
                        Normalized Base64 JPEG photo ready for physical terminal distribution.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="text-xs text-red-600 hover:text-red-800 underline cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                    >
                      <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Buka Kamera Resepsionis
                    </button>
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer">
                      <span>Unggah Berkas Foto</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSamplePhoto}
                      className="rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                    >
                      Muat Contoh Foto
                    </button>
                  </div>
                )}
                {cameraError && <p className="mt-2 text-xs text-red-600">{cameraError}</p>}
                {faceError && <p className="mt-2 text-xs text-red-600">{faceError}</p>}
              </div>

              {/* Form submit footer */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsWalkInModalOpen(false);
                    handleStopCamera();
                  }}
                  disabled={isSubmittingWalkIn}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn || isNormalizing}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingWalkIn ? "Mendaftarkan & Memproses Masuk..." : "Daftarkan & Berikan Izin Masuk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-in Pass Modal (QR & Digital Badge) */}
      {issuedPass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-3xs font-bold uppercase tracking-wider text-emerald-800">
                  Lencana Masuk Aktif
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-1">
                  {issuedPass.facilityName || "Lencana Kunjungan Tamu"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIssuedPass(null)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {/* Pass Body */}
            <div className="mt-4 flex flex-col items-center text-center">
              {/* QR Code Pass */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-inner">
                {issuedPass.qrCodeImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`data:image/png;base64,${issuedPass.qrCodeImage}`}
                    alt="QR Akses Masuk Tamu"
                    className="h-44 w-44 object-contain"
                  />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 font-mono text-xs">
                    Lencana QR Aktif
                  </div>
                )}
              </div>

              {/* PIN Code */}
              {issuedPass.pinCode && (
                <div className="mt-3 w-full rounded-xl bg-neutral-900 py-2 text-white">
                  <span className="block text-3xs uppercase tracking-wider text-neutral-400">
                    Kode PIN Masuk Terminal Pintu
                  </span>
                  <span className="font-mono text-xl font-extrabold tracking-widest text-emerald-400">
                    {issuedPass.pinCode}
                  </span>
                </div>
              )}

              {/* Visitor Details */}
              <div className="mt-4 w-full space-y-1.5 text-left text-xs text-neutral-700 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-slate-400">Nama Tamu:</span>
                  <span className="font-bold text-neutral-900">{issuedPass.visitorName}</span>
                </div>
                {issuedPass.hostName && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-slate-400">Tuan Rumah:</span>
                    <span className="font-medium text-neutral-800">{issuedPass.hostName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-slate-400">Jam Kunjungan:</span>
                  <span className="font-mono text-neutral-800">
                    {issuedPass.scheduledStartTime.split("T")[1]?.substring(0, 5)} - {issuedPass.scheduledEndTime.split("T")[1]?.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-slate-400">Waktu Masuk:</span>
                  <span className="font-mono text-blue-700 font-medium">
                    {new Date(issuedPass.actualCheckInTimeUtc).toLocaleTimeString()}
                  </span>
                </div>

                {/* Credential Sync Status */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                  <span className="text-neutral-500 font-medium">Sinkronisasi Terminal:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
                        issuedPass.credentialSyncStatus === "Applied"
                          ? "bg-emerald-100 text-emerald-800"
                          : issuedPass.credentialSyncStatus === "Failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {issuedPass.credentialSyncStatus}
                    </span>
                    {(issuedPass.credentialSyncStatus === "Failed" ||
                      issuedPass.credentialSyncStatus === "Syncing" ||
                      issuedPass.credentialSyncStatus === "Unknown") && (
                      <button
                        type="button"
                        onClick={handleRetrySync}
                        disabled={isRetryingSync}
                        className="rounded bg-neutral-200 px-2 py-0.5 text-3xs font-medium text-neutral-800 hover:bg-neutral-300 cursor-pointer"
                      >
                        {isRetryingSync ? "Mengulang..." : "Kirim Ulang"}
                      </button>
                    )}
                  </div>
                </div>
                {syncFeedback && <p className="text-3xs text-emerald-700 pt-1">{syncFeedback}</p>}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
              >
                <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Lencana Tamu
              </button>
              <button
                type="button"
                onClick={() => setIssuedPass(null)}
                className="flex-1 rounded-lg bg-neutral-900 py-2 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
