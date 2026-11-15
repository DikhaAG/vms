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
  formatFacePhotoSize,
  isFacePhotoSizeValid,
  processBrowserImageFile,
  toJpegDataUri,
} from "@/lib/vms/face-normalizer";
import { useModalFocusTrap } from "@/components/vms/use-modal-focus-trap";

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

  const handleClearPhoto = useCallback(() => {
    setWalkInFacePhoto("");
    setWalkInFaceByteSize(0);
    setFaceError(null);
  }, []);

  const verifyModalRef = useRef<HTMLDivElement>(null);
  const walkInModalRef = useRef<HTMLDivElement>(null);
  const issuedPassModalRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap({
    ref: verifyModalRef,
    isOpen: Boolean(verifyingVisit),
    onClose: () => {
      setVerifyingVisit(null);
      setCheckInError(null);
    },
  });

  useModalFocusTrap({
    ref: walkInModalRef,
    isOpen: isWalkInModalOpen,
    onClose: () => {
      setIsWalkInModalOpen(false);
      setWalkInError(null);
      handleStopCamera();
    },
  });

  useModalFocusTrap({
    ref: issuedPassModalRef,
    isOpen: Boolean(issuedPass),
    onClose: () => {
      setIssuedPass(null);
      setSyncFeedback(null);
    },
  });

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
      <div className="flex flex-col gap-4 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
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
            <p className="text-xs text-[var(--ks-text-muted)] mt-0.5">
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
            className="ks-btn inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--ks-radius-sm)] bg-[var(--ks-ink)] px-4 py-2 text-sm font-semibold text-[var(--ks-paper-raised)] shadow-xs transition hover:bg-[var(--ks-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-patina-deep)] cursor-pointer"
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
      <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--ks-text-faint)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tamu berdasarkan nama, nomor telepon, nomor identitas, atau kode QR..."
              className="w-full rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule)] bg-[var(--ks-paper-deep)] py-2 pl-9 pr-8 text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-text-faint)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)] outline-hidden"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)] cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          {/* Facility Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor={`${formId}-facility`} className="text-xs font-semibold text-[var(--ks-text-muted)] whitespace-nowrap">
              Gedung:
            </label>
            <select
              id={`${formId}-facility`}
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule)] bg-[var(--ks-paper-deep)] px-3 py-2 text-xs font-semibold text-[var(--ks-ink)] focus:border-[var(--ks-edge)] outline-hidden"
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
        <div className="flex border-b border-[var(--ks-rule)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("expected")}
            className={`pb-2.5 px-3.5 border-b-2 font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "expected"
                ? "border-[var(--ks-patina-deep)] text-[var(--ks-ink)]"
                : "border-transparent text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)]"
            }`}
          >
            <span>Tamu Diharapkan Hari Ini</span>
            <span className={`rounded-[var(--ks-radius-pill)] px-2 py-0.5 text-xs font-mono font-bold ${
              activeTab === "expected" ? "bg-[var(--ks-patina)]/20 text-[var(--ks-patina-deep)]" : "bg-[var(--ks-paper-deep)] text-[var(--ks-text-muted)]"
            }`}>
              {countExpected}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checked_in")}
            className={`pb-2.5 px-3.5 border-b-2 font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "checked_in"
                ? "border-[var(--ks-kinpaku-rich)] text-[var(--ks-ink)]"
                : "border-transparent text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)]"
            }`}
          >
            <span>Sedang di Gedung</span>
            <span className={`rounded-[var(--ks-radius-pill)] px-2 py-0.5 text-xs font-mono font-bold ${
              activeTab === "checked_in" ? "bg-[var(--ks-kinpaku)]/25 text-[var(--ks-ink)]" : "bg-[var(--ks-paper-deep)] text-[var(--ks-text-muted)]"
            }`}>
              {countCheckedIn}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`pb-2.5 px-3.5 border-b-2 font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "all"
                ? "border-[var(--ks-ink)] text-[var(--ks-ink)]"
                : "border-transparent text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)]"
            }`}
          >
            <span>Semua Kunjungan</span>
            <span className="rounded-[var(--ks-radius-pill)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--ks-text-muted)]">
              {countAll}
            </span>
          </button>
        </div>
      </div>

      {/* Arrival Queue / Visits Display */}
      {isSearching ? (
        <div className="rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-12 text-center text-sm text-[var(--ks-text-muted)] shadow-xs">
          Memuat antrean kedatangan tamu...
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="rounded-[var(--ks-radius-md)] border border-dashed border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-12 text-center shadow-xs">
          <svg
            className="mx-auto h-10 w-10 text-[var(--ks-text-faint)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-3 text-sm font-bold text-[var(--ks-ink)] tracking-tight">
            {searchQuery ? "Tidak Ada Tamu Ditemukan" : "Belum Ada Kunjungan Terdaftar Hari Ini"}
          </h3>
          <p className="mt-1 text-xs text-[var(--ks-text-muted)] max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada tamu yang cocok dengan "${searchQuery}". Coba gunakan kata kunci lain atau daftarkan tamu datang langsung (walk-in).`
              : "Buat jadwal kunjungan baru melalui menu Pra-Registrasi atau layani tamu datang langsung (Walk-in)."}
          </p>
          <button
            type="button"
            onClick={() => {
              resetWalkInForm();
              setIsWalkInModalOpen(true);
            }}
            className="ks-btn mt-4 inline-flex items-center rounded-[var(--ks-radius-sm)] bg-[var(--ks-ink)] px-3.5 py-2 text-xs font-semibold text-[var(--ks-paper-raised)] transition hover:bg-[var(--ks-text)] cursor-pointer shadow-xs"
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
                className={`flex flex-col justify-between rounded-[var(--ks-radius-md)] border bg-[var(--ks-paper-raised)] p-5 shadow-2xs transition hover:shadow-xs hover:border-[var(--ks-edge)] ${
                  isCheckedIn
                    ? "border-[var(--ks-kinpaku-rich)]/40 bg-[var(--ks-kinpaku)]/5"
                    : isApproved
                      ? "border-[var(--ks-patina)]/40"
                      : "border-[var(--ks-rule)]"
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
                          className="h-12 w-12 rounded-[var(--ks-radius-pill)] object-cover border border-[var(--ks-rule)] shadow-2xs"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--ks-radius-pill)] bg-[var(--ks-paper-deep)] text-[var(--ks-ink)] font-bold text-sm border border-[var(--ks-rule)]">
                          {visit.visitorGivenName[0]}
                          {visit.visitorFamilyName[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-[var(--ks-ink)] leading-tight tracking-tight">
                          {visit.visitorGivenName} {visit.visitorFamilyName}
                        </h4>
                        <p className="text-xs text-[var(--ks-text-muted)] font-mono mt-0.5">
                          {visit.certificateType
                            ? CERTIFICATE_TYPE_LABELS[visit.certificateType]
                            : "ID"}
                          : {visit.certificateNo || "None"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-[var(--ks-radius-pill)] px-2.5 py-0.5 text-2xs font-bold ${
                          isCheckedIn
                            ? "bg-[var(--ks-kinpaku)]/20 text-[var(--ks-ink)] border border-[var(--ks-kinpaku-rich)]/30"
                            : isApproved
                              ? "bg-[var(--ks-patina)]/15 text-[var(--ks-patina-deep)] border border-[var(--ks-patina)]/30 ks-led-patina"
                              : "bg-[var(--ks-paper-deep)] text-[var(--ks-ink)] border border-[var(--ks-rule)]"
                        }`}
                      >
                        {visit.status.replace("_", " ")}
                      </span>
                      {visit.credentialSyncStatus && (
                        <span
                          className={`rounded-[var(--ks-radius-pill)] px-2 py-0.2 text-3xs font-mono font-medium ${
                            visit.credentialSyncStatus === "Applied"
                              ? "bg-[var(--ks-patina)]/10 text-[var(--ks-patina-deep)] border border-[var(--ks-patina)]/30"
                              : visit.credentialSyncStatus === "Failed"
                                ? "bg-[var(--ks-vermilion)]/10 text-[var(--ks-vermilion)] border border-[var(--ks-vermilion)]/30"
                                : "bg-[#d97706]/10 text-[#b45309] border border-[#d97706]/30"
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
                      <span className="text-[var(--ks-text-muted)]">Karyawan Tuan Rumah:</span>
                      <span className="font-semibold text-[var(--ks-ink)]">
                        {visit.hostName || "Tamu Meja Depan"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ks-text-muted)]">Gedung:</span>
                      <span className="font-medium text-[var(--ks-ink)]">{visit.facilityName || visit.facilityId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ks-text-muted)]">Keperluan:</span>
                      <span className="font-semibold text-[var(--ks-ink)]">
                        {VISIT_REASON_LABELS[visit.visitReasonType]}
                        {visit.visitReasonDetail ? ` (${visit.visitReasonDetail})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ks-text-muted)]">Jadwal:</span>
                      <span className="font-mono text-[var(--ks-ink)] font-semibold">
                        {visit.scheduledStartTimeFacility.split("T")[1]?.substring(0, 5)} - {visit.scheduledEndTimeFacility.split("T")[1]?.substring(0, 5)}
                      </span>
                    </div>
                    {visit.actualCheckInTimeUtc && (
                      <div className="flex items-center justify-between text-[var(--ks-patina-deep)]">
                        <span>Waktu Masuk:</span>
                        <span className="font-mono font-semibold">
                          {new Date(visit.actualCheckInTimeUtc).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {visit.hikCentral?.pinCode && (
                      <div className="flex items-center justify-between bg-[var(--ks-paper-deep)] border border-[var(--ks-rule)] rounded-[var(--ks-radius-sm)] px-2 py-1">
                        <span className="text-[var(--ks-text-muted)]">Kode PIN:</span>
                        <span className="font-mono font-bold tracking-wider text-[var(--ks-ink)]">
                          {visit.hikCentral.pinCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[var(--ks-rule)] flex gap-2">
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyingVisit(visit);
                        setCheckInError(null);
                        setCheckInNotes("");
                      }}
                      className="ks-btn w-full inline-flex min-h-9 items-center justify-center rounded-[var(--ks-radius-sm)] bg-[var(--ks-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--ks-paper-raised)] transition hover:bg-[var(--ks-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-patina-deep)] cursor-pointer shadow-xs"
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
                      className="w-full inline-flex min-h-9 items-center justify-center rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule)] bg-[var(--ks-paper-deep)] px-3 py-1.5 text-xs font-semibold text-[var(--ks-ink)] transition hover:border-[var(--ks-edge)] cursor-pointer shadow-2xs"
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
          ref={verifyModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ks-ink)]/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-6 shadow-[var(--ks-lift-2)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--ks-rule)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--ks-ink)] tracking-tight">
                  Verifikasi Identitas Tamu
                </h3>
                <p className="text-xs text-[var(--ks-text-muted)] mt-0.5">
                  Periksa kesesuaian foto dan dokumen identitas fisik sebelum mengaktifkan hak akses pintu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingVisit(null)}
                className="text-[var(--ks-text-faint)] hover:text-[var(--ks-ink)] cursor-pointer text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {checkInError && (
              <div className="mt-3 rounded-[var(--ks-radius-sm)] border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/10 p-3 text-xs text-[var(--ks-vermilion)]">
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
                    className="h-28 w-28 rounded-[var(--ks-radius-md)] object-cover border-2 border-[var(--ks-patina)] shadow-sm"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-[var(--ks-radius-md)] bg-[var(--ks-paper-deep)] text-[var(--ks-text-muted)] font-medium text-xs border border-[var(--ks-rule)]">
                    Tanpa Foto Wajah
                  </div>
                )}
                <span className="mt-1.5 text-3xs font-medium text-[var(--ks-text-muted)]">
                  {verifyingVisit.facePhoto ? "Biometrik Wajah Terdaftar" : "Hanya Lencana Fisik / Kartu"}
                </span>
              </div>

              {/* Identity details */}
              <div className="flex-1 space-y-1.5 text-xs text-[var(--ks-text)]">
                <div>
                  <span className="text-[var(--ks-text-muted)]">Nama Lengkap:</span>
                  <p className="font-bold text-[var(--ks-ink)] text-sm tracking-tight">
                    {verifyingVisit.visitorGivenName} {verifyingVisit.visitorFamilyName}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--ks-text-muted)]">Nomor Identitas:</span>
                  <p className="font-mono text-[var(--ks-ink)] font-semibold">
                    {verifyingVisit.certificateType
                      ? CERTIFICATE_TYPE_LABELS[verifyingVisit.certificateType]
                      : "ID"}
                    : {verifyingVisit.certificateNo || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--ks-text-muted)]">Tuan Rumah &amp; Fasilitas:</span>
                  <p className="text-[var(--ks-ink)] font-semibold">
                    {verifyingVisit.hostName || "Host"} &bull; {verifyingVisit.facilityName || verifyingVisit.facilityId}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--ks-text-muted)]">Jam Kunjungan:</span>
                  <p className="font-mono text-[var(--ks-ink)] font-semibold">
                    {verifyingVisit.scheduledStartTimeFacility.split("T")[1]?.substring(0, 5)} - {verifyingVisit.scheduledEndTimeFacility.split("T")[1]?.substring(0, 5)}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Method Radio Selection */}
            <div className="mt-5 border-t border-[var(--ks-rule)] pt-4">
              <label className="block text-xs font-bold text-[var(--ks-ink)] mb-2">
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
                      className={`flex items-center gap-2 rounded-[var(--ks-radius-sm)] border p-2 cursor-pointer transition ${
                        verificationMethod === m
                          ? "border-[var(--ks-patina-deep)] bg-[var(--ks-patina)]/15 text-[var(--ks-ink)] font-bold shadow-2xs"
                          : "border-[var(--ks-rule)] bg-[var(--ks-paper-deep)] hover:border-[var(--ks-edge)] text-[var(--ks-text)]"
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

            {/* Receptionist Notes */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-[var(--ks-text)] mb-1">
                Catatan Resepsionis (Opsional):
              </label>
              <input
                type="text"
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Contoh: Kartu KTP asli telah diperiksa dan sesuai identitas tamu."
                className="w-full rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule)] bg-[var(--ks-paper-deep)] px-3 py-1.5 text-xs text-[var(--ks-ink)] placeholder:text-[var(--ks-text-faint)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)] outline-hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVerifyingVisit(null)}
                disabled={isCheckingIn}
                className="rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule)] bg-[var(--ks-paper-deep)] px-4 py-2 text-xs font-semibold text-[var(--ks-ink)] hover:border-[var(--ks-edge)] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckIn}
                disabled={isCheckingIn}
                className="ks-btn inline-flex items-center justify-center rounded-[var(--ks-radius-sm)] bg-[var(--ks-ink)] px-5 py-2 text-xs font-semibold text-[var(--ks-paper-raised)] shadow-xs hover:bg-[var(--ks-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-patina-deep)] disabled:opacity-50 cursor-pointer"
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
          ref={walkInModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ks-ink)]/60 p-4 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-2xl my-8 text-[var(--ks-text)]">
            <div className="flex items-center justify-between border-b border-[var(--ks-rule-subtle)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--ks-ink)]">
                  Pendaftaran Tamu Datang Langsung (Walk-in)
                </h3>
                <p className="text-xs text-[var(--ks-muted)]">
                  Pendaftaran kilat dan pengaktifan hak akses pintu untuk tamu lobi tanpa janji temu sebelumnya.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWalkInModalOpen(false);
                  handleStopCamera();
                }}
                className="text-[var(--ks-muted)] hover:text-[var(--ks-ink)] cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {walkInError && (
              <div className="mt-3 rounded-lg border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/10 p-3 text-xs text-[var(--ks-vermilion)]">
                {walkInError}
              </div>
            )}

            <form onSubmit={handleSubmitWalkIn} className="mt-4 space-y-4">
              {/* Facility & Host row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Gedung Fasilitas *
                  </label>
                  <select
                    value={walkInFacilityId}
                    onChange={(e) => setWalkInFacilityId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.timezone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Karyawan Tuan Rumah *
                  </label>
                  <select
                    value={walkInHostId}
                    onChange={(e) => {
                      setWalkInHostId(e.target.value);
                      const option = e.target.options[e.target.selectedIndex];
                      setWalkInHostName(option.text);
                    }}
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
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
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Nama Depan *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInGivenName}
                    onChange={(e) => setWalkInGivenName(e.target.value)}
                    placeholder="Contoh: Hendra"
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Nama Belakang / Marga *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInFamilyName}
                    onChange={(e) => setWalkInFamilyName(e.target.value)}
                    placeholder="Contoh: Gunawan"
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>
              </div>

              {/* Contact row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="+628..."
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    placeholder="tamu@instansi.com"
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>
              </div>

              {/* Certificate row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Jenis Kartu Identitas
                  </label>
                  <select
                    value={walkInCertType}
                    onChange={(e) => setWalkInCertType(Number(e.target.value) as CertificateType)}
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  >
                    {CERTIFICATE_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {CERTIFICATE_TYPE_LABELS[ct]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="walk-in-cert-no" className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
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
                      className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] font-mono focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                    />
                    {isLookingUpWalkIn && (
                      <span className="absolute right-2 top-1.5 text-[11px] text-[var(--ks-muted)]">
                        Mencari data...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Returning Visitor Recognized Banner */}
              {walkInReturningProfile && (
                <div className="rounded-lg border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/10 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {walkInReturningProfile.facePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={walkInReturningProfile.facePhoto}
                        alt="Foto Wajah Tersimpan"
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover border border-[var(--ks-patina)]/40"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ks-patina)]/20 text-xs font-bold text-[var(--ks-patina)]">
                        {walkInReturningProfile.givenName?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-[var(--ks-ink)]">
                        Tamu Sebelumnya Ditemukan!
                      </p>
                      <p className="text-[11px] text-[var(--ks-muted)]">
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
                    className="rounded-md bg-[var(--ks-patina)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:brightness-110 transition cursor-pointer"
                  >
                    Isi Otomatis Data &amp; Foto
                  </button>
                </div>
              )}

              {/* Purpose row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Keperluan Kunjungan *
                  </label>
                  <select
                    value={walkInReasonType}
                    onChange={(e) => setWalkInReasonType(Number(e.target.value) as VisitReasonType)}
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-2 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  >
                    {VISIT_REASON_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {VISIT_REASON_LABELS[rt]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1">
                    Rincian Keperluan {walkInReasonType === 4 ? "*" : "(opsional)"}
                  </label>
                  <input
                    type="text"
                    required={walkInReasonType === 4}
                    value={walkInReasonDetail}
                    onChange={(e) => setWalkInReasonDetail(e.target.value)}
                    placeholder="Contoh: Pemeliharaan perangkat server vendor"
                    className="w-full rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-3 py-1.5 text-xs text-[var(--ks-ink)] focus:border-[var(--ks-kinpaku)] focus:outline-hidden focus:ring-1 focus:ring-[var(--ks-kinpaku)]"
                  />
                </div>
              </div>

              {/* Access Levels selection */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ks-ink)] mb-1.5">
                  Hak Akses Pintu Fisik (Khusus Gedung Terpilih):
                </label>
                {availableAccessLevels.length === 0 ? (
                  <p className="text-xs text-[var(--ks-muted)] italic">
                    Belum ada kelompok hak akses yang terdaftar untuk fasilitas ini.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableAccessLevels.map((al) => (
                      <label
                        key={al.id}
                        className={`flex items-start gap-2 rounded-lg border p-2 text-xs cursor-pointer transition-colors ${
                          walkInAccessLevelIds.includes(al.id)
                            ? "border-[var(--ks-kinpaku)] bg-[var(--ks-kinpaku)]/10 text-[var(--ks-ink)] shadow-xs"
                            : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] text-[var(--ks-muted)] hover:border-[var(--ks-rule)]"
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
                          className="mt-0.5 accent-[var(--ks-kinpaku)]"
                        />
                        <div>
                          <div className="font-medium text-[var(--ks-ink)]">{al.name}</div>
                          {al.description && <div className="text-3xs text-[var(--ks-muted)]">{al.description}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Tap Quota Configuration */}
              <div className="rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] p-3">
                <span className="block text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-ink)] mb-2">
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
                      className="accent-[var(--ks-kinpaku)]"
                    />
                    <span className="text-[var(--ks-text)]">Limited Taps:</span>
                  </label>
                  {walkInTapQuotaMode === "limited" && (
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={walkInMaxTaps}
                      onChange={(e) => setWalkInMaxTaps(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 rounded border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-2 py-1 text-xs font-mono text-[var(--ks-ink)]"
                    />
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="tapQuotaMode"
                      value="unlimited"
                      checked={walkInTapQuotaMode === "unlimited"}
                      onChange={() => setWalkInTapQuotaMode("unlimited")}
                      className="accent-[var(--ks-kinpaku)]"
                    />
                    <span className="text-[var(--ks-text)]">Unlimited during visiting hours</span>
                  </label>
                </div>
              </div>

              {/* Photo Enrollment (Webcam or Upload) */}
              <div className="rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-ink)]">
                    Biometric Face Photo (MinMoe Terminal Enrollment)
                  </span>
                  {walkInFacePhoto && (
                    <span
                      className={`text-3xs font-semibold px-2 py-0.5 rounded-full border ${
                        isFacePhotoSizeValid(walkInFaceByteSize)
                          ? "border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 text-[var(--ks-patina)]"
                          : "border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/15 text-[var(--ks-vermilion)]"
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
                        className="rounded-lg bg-[var(--ks-patina)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:brightness-110 cursor-pointer"
                      >
                        {isNormalizing ? "Processing..." : "Capture Photo"}
                      </button>
                      <button
                        type="button"
                        onClick={handleStopCamera}
                        className="rounded-lg bg-[var(--ks-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--ks-paper-raised)] hover:bg-black cursor-pointer"
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
                      className="h-20 w-20 rounded-lg object-cover border border-[var(--ks-rule-subtle)]"
                    />
                    <div className="space-y-1">
                      <p className="text-xs text-[var(--ks-muted)]">
                        Normalized Base64 JPEG photo ready for physical terminal distribution.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="text-xs text-[var(--ks-vermilion)] hover:underline cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3 py-1.5 text-xs font-medium text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer"
                    >
                      <svg className="h-4 w-4 text-[var(--ks-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Buka Kamera Resepsionis
                    </button>
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-3 py-1.5 text-xs font-medium text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer">
                      <span>Unggah Berkas Foto</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                )}
                {cameraError && <p className="mt-2 text-xs text-[var(--ks-vermilion)]">{cameraError}</p>}
                {faceError && <p className="mt-2 text-xs text-[var(--ks-vermilion)]">{faceError}</p>}
              </div>

              {/* Form submit footer */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-[var(--ks-rule-subtle)] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsWalkInModalOpen(false);
                    handleStopCamera();
                  }}
                  disabled={isSubmittingWalkIn}
                  className="rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-4 py-2 text-xs font-semibold text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn || isNormalizing}
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] border border-[var(--ks-ink)] px-5 py-2 text-xs font-bold uppercase tracking-[0.08em] shadow-sm hover:brightness-110 disabled:opacity-50 cursor-pointer"
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
          ref={issuedPassModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ks-ink)]/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-2xl text-[var(--ks-text)] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--ks-rule-subtle)] pb-3">
              <div>
                <span className="rounded-full border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 px-2.5 py-0.5 text-3xs font-bold uppercase tracking-wider text-[var(--ks-patina)]">
                  Lencana Masuk Aktif
                </span>
                <h3 className="text-base font-bold text-[var(--ks-ink)] mt-1">
                  {issuedPass.facilityName || "Lencana Kunjungan Tamu"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIssuedPass(null)}
                className="text-[var(--ks-muted)] hover:text-[var(--ks-ink)] cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {/* Pass Body */}
            <div className="mt-4 flex flex-col items-center text-center">
              {/* QR Code Pass */}
              <div className="rounded-xl border border-[var(--ks-rule-subtle)] bg-white p-4 shadow-sm">
                {issuedPass.qrCodeImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`data:image/png;base64,${issuedPass.qrCodeImage}`}
                    alt="QR Akses Masuk Tamu"
                    className="h-44 w-44 object-contain"
                  />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center rounded-lg bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] font-mono text-xs">
                    Lencana QR Aktif
                  </div>
                )}
              </div>

              {/* PIN Code */}
              {issuedPass.pinCode && (
                <div className="mt-3 w-full rounded-xl bg-[var(--ks-ink)] py-2.5 text-[var(--ks-paper-raised)] border border-black">
                  <span className="block text-3xs uppercase tracking-widest text-[var(--ks-muted)] font-mono">
                    Kode PIN Masuk Terminal Pintu
                  </span>
                  <span className="font-mono text-2xl font-bold tracking-widest text-[var(--ks-kinpaku)]">
                    {issuedPass.pinCode}
                  </span>
                </div>
              )}

              {/* Visitor Details */}
              <div className="mt-4 w-full space-y-1.5 text-left text-xs bg-[var(--ks-paper-deep)] p-3.5 rounded-xl border border-[var(--ks-rule-subtle)]">
                <div className="flex justify-between">
                  <span className="text-[var(--ks-muted)]">Nama Tamu:</span>
                  <span className="font-bold text-[var(--ks-ink)]">{issuedPass.visitorName}</span>
                </div>
                {issuedPass.hostName && (
                  <div className="flex justify-between">
                    <span className="text-[var(--ks-muted)]">Tuan Rumah:</span>
                    <span className="font-medium text-[var(--ks-ink)]">{issuedPass.hostName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--ks-muted)]">Jam Kunjungan:</span>
                  <span className="font-mono text-[var(--ks-ink)]">
                    {issuedPass.scheduledStartTime.split("T")[1]?.substring(0, 5)} - {issuedPass.scheduledEndTime.split("T")[1]?.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ks-muted)]">Waktu Masuk:</span>
                  <span className="font-mono text-[var(--ks-patina)] font-medium">
                    {new Date(issuedPass.actualCheckInTimeUtc).toLocaleTimeString()}
                  </span>
                </div>

                {/* Credential Sync Status */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--ks-rule-subtle)]">
                  <span className="text-[var(--ks-muted)] font-medium">Sinkronisasi Terminal:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-2xs font-semibold border ${
                        issuedPass.credentialSyncStatus === "Applied"
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
                      <button
                        type="button"
                        onClick={handleRetrySync}
                        disabled={isRetryingSync}
                        className="rounded border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] px-2 py-0.5 text-3xs font-medium text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer"
                      >
                        {isRetryingSync ? "Mengulang..." : "Kirim Ulang"}
                      </button>
                    )}
                  </div>
                </div>
                {syncFeedback && <p className="text-3xs text-[var(--ks-patina)] pt-1">{syncFeedback}</p>}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] py-2 text-xs font-semibold text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] cursor-pointer"
              >
                <svg className="h-4 w-4 text-[var(--ks-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Lencana Tamu
              </button>
              <button
                type="button"
                onClick={() => setIssuedPass(null)}
                className="flex-1 rounded-lg bg-[var(--ks-ink)] py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ks-paper-raised)] hover:brightness-110 cursor-pointer"
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
