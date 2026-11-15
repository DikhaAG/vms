"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  formatFacePhotoSize,
  isFacePhotoSizeValid,
  processBrowserImageFile,
} from "@/lib/vms/face-normalizer";
import { UiBadge, UiButton, UiCard } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

export interface PreRegistrationPhotoCaptureProps {
  value: string;
  onChange: (dataUri: string) => void;
  formId: string;
}

export function PreRegistrationPhotoCapture({
  value,
  onChange,
  formId,
}: PreRegistrationPhotoCaptureProps) {
  const faceByteSize = value ? Math.round((value.length * 3) / 4) : 0;
  const [faceError, setFaceError] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

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

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaceError(null);
    setIsNormalizing(true);
    try {
      const normalized = await processBrowserImageFile(file);
      onChange(normalized.dataUri);
      toast.success(idDict.pages.preRegistration.toasts.photoVerified);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal memproses gambar foto wajah.";
      setFaceError(msg);
      toast.error(msg);
    } finally {
      setIsNormalizing(false);
      e.target.value = "";
    }
  }

  async function handleStartCamera() {
    setFaceError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Akses kamera web tidak didukung oleh peramban Anda.";
      setFaceError(msg);
      toast.error(msg);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? `Gagal mengakses kamera: ${err.message}`
          : "Tidak dapat mengakses kamera. Pastikan izin kamera aktif.";
      setFaceError(msg);
      toast.error(msg);
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
        onChange(normalized.dataUri);
        toast.success(idDict.pages.preRegistration.toasts.photoNormalized);
      })
      .catch((err) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Gagal menormalkan foto dari kamera web.";
        setFaceError(msg);
        toast.error(msg);
      })
      .finally(() => {
        setIsNormalizing(false);
      });
  }

  function handleRemovePhoto() {
    onChange("");
    setFaceError(null);
    toast.success(idDict.pages.preRegistration.toasts.photoRemoved);
  }

  return (
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
        {value && faceByteSize ? (
          <UiBadge
            variant={isFacePhotoSizeValid(faceByteSize) ? "normal" : "danger"}
          >
            {formatFacePhotoSize(faceByteSize)} (
            {isFacePhotoSizeValid(faceByteSize)
              ? "Sesuai Standar 10–100 KB"
              : "Di Luar Batas Standar"}
            )
          </UiBadge>
        ) : null}
      </div>

      <div className="space-y-4">
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

          {value ? (
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

        {value ? (
          <UiCard className="flex items-center gap-4 bg-[var(--ks-paper)] p-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
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
          <p className="text-xs font-medium text-[var(--ks-vermilion)]">
            {faceError}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
