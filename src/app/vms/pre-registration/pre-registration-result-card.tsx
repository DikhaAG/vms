"use client";

import React from "react";
import Image from "next/image";
import { toJpegDataUri, toPngDataUri } from "@/lib/vms/face-normalizer";
import { formatInFacilityTimezone } from "@/lib/vms/timezone";
import {
  DEFAULT_SYSTEM_SETTINGS,
  type CredentialSyncStatus,
  type Visit,
} from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";
import { UiBadge, UiButton, UiCard } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

export interface PreRegistrationResultCardProps {
  visit: Visit;
  accessLevels: AccessLevel[];
  systemTimezone?: string;
  credentialSyncStatus: CredentialSyncStatus;
  isRetryingSync: boolean;
  retrySyncMessage: string | null;
  onRetrySync: () => void;
}

export function PreRegistrationResultCard({
  visit,
  accessLevels,
  systemTimezone = DEFAULT_SYSTEM_SETTINGS.timezone,
  credentialSyncStatus,
  isRetryingSync,
  retrySyncMessage,
  onRetrySync,
}: PreRegistrationResultCardProps) {
  const formattedLocalStart = formatInFacilityTimezone(
    visit.scheduledStartTimeUtc,
    systemTimezone,
  );
  const formattedLocalEnd = formatInFacilityTimezone(
    visit.scheduledEndTimeUtc,
    systemTimezone,
  );

  return (
    <UiCard
      aria-label="Detail Kunjungan Terjadwal"
      className="border-[var(--ks-patina)]/40 p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ks-rule-subtle)] pb-4">
        <div>
          <UiBadge status={visit.status} />
          <h2 className="mt-2 text-lg font-bold text-[var(--ks-ink)]">
            Janji Temu Berhasil Terjadwal
          </h2>
        </div>
        <div className="text-right">
          <span className="text-xs text-[var(--ks-muted)]">
            ID Kunjungan Internal
          </span>
          <p className="font-mono text-xs font-semibold text-[var(--ks-ink)]">
            {visit.id}
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
              {visit.visitorGivenName} {visit.visitorFamilyName}
            </p>
            <p className="text-xs text-[var(--ks-muted)]">
              {visit.visitorPhone || "Tanpa nomor telepon"} &bull;{" "}
              {visit.visitorEmail || "Tanpa email"}
            </p>
            {visit.certificateNo ? (
              <p className="mt-1 text-xs text-[var(--ks-muted)]">
                No. Identitas:{" "}
                <span className="font-mono font-medium text-[var(--ks-ink)]">
                  {visit.certificateNo}
                </span>{" "}
                (
                {visit.certificateType
                  ? idDict.certificateTypes[visit.certificateType] ??
                  `Tipe ${visit.certificateType}`
                  : ""}
                )
              </p>
            ) : null}
          </div>

          <div className="border-t border-[var(--ks-rule-subtle)] pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ks-muted)]">
              Jadwal Kunjungan
            </h3>
            <div className="mt-1 space-y-1 text-xs text-[var(--ks-text)]">
              <p>
                <span className="font-medium text-[var(--ks-muted)]">
                  Waktu Lokal ({systemTimezone}):
                </span>{" "}
                <span className="font-semibold text-[var(--ks-ink)]">
                  {formattedLocalStart} &rarr; {formattedLocalEnd}
                </span>
              </p>
              <p>
                <span className="font-medium text-[var(--ks-muted)]">
                  ISO 8601 Offset:
                </span>{" "}
                <span className="font-mono">
                  {visit.scheduledStartTimeFacility} &rarr;{" "}
                  {visit.scheduledEndTimeFacility}
                </span>
              </p>
              <p>
                <span className="font-medium text-[var(--ks-muted)]">
                  Waktu UTC Dinormalisasi:
                </span>{" "}
                <span className="font-mono">
                  {visit.scheduledStartTimeUtc} &rarr;{" "}
                  {visit.scheduledEndTimeUtc}
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
                {visit.accessLevelIds && visit.accessLevelIds.length > 0 ? (
                  <span className="font-semibold text-[var(--ks-ink)]">
                    {visit.accessLevelIds
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
                {visit.tapQuota?.mode === "limited" ? (
                  <UiBadge variant="warning">
                    {visit.tapQuota.maxTaps} kali akses masuk diizinkan
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
                  {visit.hikCentral?.appointRecordId ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--ks-muted)]">
                  visitorId
                </dt>
                <dd className="font-semibold text-[var(--ks-ink)]">
                  {visit.hikCentral?.visitorId ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--ks-muted)]">
                  appointCode
                </dt>
                <dd className="font-semibold text-[var(--ks-ink)]">
                  {visit.hikCentral?.appointCode ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--ks-muted)]">
                  ID Karyawan Tuan Rumah
                </dt>
                <dd className="font-semibold text-[var(--ks-ink)]">
                  {visit.hostId ?? "-"}
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
              {visit.visitorGivenName} {visit.visitorFamilyName}
            </p>
          </div>

          {/* Face Photo Preview in Result Card */}
          {visit.facePhoto ? (
            <div className="flex flex-col items-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-[var(--ks-radius-md)] border-2 border-[var(--ks-patina)] bg-[var(--ks-paper-raised)] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toJpegDataUri(visit.facePhoto)}
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
              {visit.hikCentral?.qrCodeImage ? (
                <Image
                  src={toPngDataUri(visit.hikCentral.qrCodeImage)}
                  alt={`Tiket QR Tamu untuk ${visit.visitorGivenName}`}
                  width={112}
                  height={112}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-xs text-[var(--ks-muted)]">
                  Tanpa Kode QR
                </div>
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
                label={
                  idDict.syncStatuses[credentialSyncStatus] ??
                  credentialSyncStatus
                }
              />
            </div>

            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetrySync}
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
  );
}