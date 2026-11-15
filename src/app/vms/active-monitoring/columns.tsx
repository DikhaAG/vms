"use client";

import React from "react";
import Image from "next/image";
import { createColumnHelper } from "@tanstack/react-table";
import type { UiTableFeatures } from "@/components/vms/ui";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
  DoorAccessType,
  VisitLastSeenDoor,
} from "@/lib/vms/checkout-contract";
import { isEmergencyGrantActive } from "@/lib/vms/checkout-contract";

export type ActiveVisit = ActiveVisitSummary;

export function resolveDoorAccessType(
  lastSeenDoor: VisitLastSeenDoor | undefined,
  availableDoors: FacilityDoor[],
): DoorAccessType | undefined {
  if (lastSeenDoor?.accessType) {
    return lastSeenDoor.accessType;
  }
  if (lastSeenDoor?.doorIndexCode) {
    const match = availableDoors.find(
      (d) => d.doorIndexCode === lastSeenDoor.doorIndexCode,
    );
    return match?.accessType;
  }
  return undefined;
}

export interface ActiveVisitColumnOptions {
  doors: FacilityDoor[];
  actionLoadingId?: string | null;
  onGrantEmergency: (visit: ActiveVisit) => void;
  onNormalCheckOut: (visit: ActiveVisit) => void;
  onForceCheckOut: (visit: ActiveVisit) => void;
  onRevokeEmergencyAccess: (
    visit: ActiveVisit,
    grant: EmergencyAccessGrant,
  ) => void;
}

export function createActiveVisitColumns({
  doors,
  actionLoadingId,
  onGrantEmergency,
  onNormalCheckOut,
  onForceCheckOut,
  onRevokeEmergencyAccess,
}: ActiveVisitColumnOptions) {
  const columnHelper = createColumnHelper<UiTableFeatures, ActiveVisit>();

  return [
    // Column 1: Visitor details
    columnHelper.accessor((row): unknown => row.visitor.fullName, {
      id: "fullName",
      header: "Nama Tamu",
      enableSorting: true,
      cell: (info) => {
        const visit = info.row.original;
        return (
          <div className="flex items-start gap-3 min-w-[220px]">
            {visit.visitor.photo ? (
              <Image
                src={
                  visit.visitor.photo.startsWith("data:")
                    ? visit.visitor.photo
                    : `data:image/jpeg;base64,${visit.visitor.photo}`
                }
                alt={visit.visitor.fullName}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover border border-[var(--ks-rule-subtle)] shadow-xs shrink-0"
                unoptimized
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ks-paper-deep)] text-xs font-bold text-[var(--ks-ink)] border border-[var(--ks-rule-subtle)]">
                {visit.visitor.givenName?.[0] || visit.visitor.fullName[0]}
                {visit.visitor.familyName?.[0] || ""}
              </div>
            )}
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--ks-ink)] flex flex-wrap items-center gap-1.5 leading-snug">
                <span>{visit.visitor.fullName}</span>
                <span className="text-[11px] font-normal text-[var(--ks-muted)]">
                  ({visit.visitReason})
                </span>
                {visit.isFastTrack && (
                  <span
                    data-testid="fast-track-badge"
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-[var(--ks-patina)]"
                  >
                    Masuk Otomatis Tanpa Antre
                  </span>
                )}
              </h2>
              {visit.visitorGroupName && (
                <div>
                  <span className="inline-block rounded-md border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-2xs font-semibold text-[var(--ks-ink)]">
                    Rombongan: {visit.visitorGroupName}
                  </span>
                </div>
              )}
              <p className="text-xs text-[var(--ks-muted)]">
                {visit.visitor.phone || visit.visitor.email || "Tanpa data kontak"}
                {visit.visitor.certificateNo &&
                  ` • No. Identitas: ${visit.visitor.certificateNo}`}
              </p>
              <p className="text-[11px] font-mono text-[var(--ks-muted)]">
                {visit.visitId}
              </p>
            </div>
          </div>
        );
      },
    }),

    // Column 2: Facility & Host information
    columnHelper.accessor((row): unknown => row.facility.name, {
      id: "facilityAndHost",
      header: "Gedung & Tuan Rumah",
      enableSorting: true,
      cell: (info) => {
        const visit = info.row.original;
        const checkInFormatted = new Date(visit.checkInTimeUtc).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" },
        );
        const scheduledEndFormatted = new Date(
          visit.scheduledEndTimeUtc,
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        return (
          <div className="space-y-1 text-xs min-w-[180px]">
            <div>
              <span className="text-[var(--ks-muted)]">Gedung:</span>{" "}
              <span className="font-semibold text-[var(--ks-ink)]">
                {visit.facility.name}
              </span>
            </div>
            <div>
              <span className="text-[var(--ks-muted)]">Karyawan Tuan Rumah:</span>{" "}
              <span className="font-semibold text-[var(--ks-ink)]">
                {visit.host?.name || "Tamu Datang Langsung (Walk-in)"}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-0.5 font-mono text-2xs">
              <div>
                <span className="text-[var(--ks-muted)]">Waktu Masuk:</span>{" "}
                <span className="font-semibold text-[var(--ks-ink)]">
                  {checkInFormatted}
                </span>
              </div>
              <div>
                <span className="text-[var(--ks-muted)]">Jadwal Keluar:</span>{" "}
                <span
                  className={`font-semibold ${
                    visit.isOverstay
                      ? "text-[var(--ks-vermilion)]"
                      : "text-[var(--ks-ink)]"
                  }`}
                >
                  {scheduledEndFormatted}
                </span>
              </div>
            </div>
            {visit.appointRecordId && (
              <span className="inline-block text-3xs font-mono text-[var(--ks-muted)]">
                HC: {visit.appointRecordId}
              </span>
            )}
          </div>
        );
      },
    }),

    // Column 3: Status & Tap Quota
    columnHelper.accessor((row): unknown => row.status, {
      id: "status",
      header: "Status & Waktu",
      enableSorting: true,
      cell: (info) => {
        const visit = info.row.original;
        const tapRatio =
          visit.tapQuotaMode === "limited" && visit.maxTaps > 0
            ? Math.min(
                100,
                Math.round((visit.tapCount / visit.maxTaps) * 100),
              )
            : 0;

        return (
          <div className="space-y-2 min-w-[170px]">
            <div>
              {visit.isOverstay ? (
                <span className="inline-flex items-center rounded-full border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--ks-vermilion)]">
                  {visit.overstayMinutes}m Overstay
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[var(--ks-patina)]/30 bg-[var(--ks-patina)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--ks-patina)]">
                  Sesuai Jadwal
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-2xs">
                <span className="font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)]">
                  Jatah Buka Pintu (Kuota Tap):
                </span>
              </div>
              <div className="font-mono text-xs text-[var(--ks-ink)]">
                {visit.tapQuotaMode === "limited" ? (
                  <>
                    <strong
                      className={
                        visit.tapCount >= visit.maxTaps
                          ? "text-[var(--ks-vermilion)]"
                          : "text-[var(--ks-ink)]"
                      }
                    >
                      {visit.tapCount}
                    </strong>{" "}
                    / {visit.maxTaps} Tap{" "}
                    {visit.tapCount >= visit.maxTaps ? (
                      <span className="text-[var(--ks-vermilion)] font-bold">
                        (Habis)
                      </span>
                    ) : (
                      <span className="text-[var(--ks-muted)]">
                        ({visit.maxTaps - visit.tapCount} tersisa)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[var(--ks-patina)] font-semibold text-xs">
                    {visit.tapCount} Tap (Bebas / Tanpa Batas)
                  </span>
                )}
              </div>

              {visit.tapQuotaMode === "limited" && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ks-paper-deep)] border border-[var(--ks-rule-subtle)]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      visit.tapCount >= visit.maxTaps
                        ? "bg-[var(--ks-vermilion)]"
                        : tapRatio >= 75
                          ? "bg-[var(--ks-kinpaku)]"
                          : "bg-[var(--ks-ink)]"
                    }`}
                    style={{ width: `${tapRatio}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      },
    }),

    // Column 4: Door telemetry, movement breadcrumbs & emergency grants
    columnHelper.display({
      id: "doorTelemetry",
      header: "Telemetri Pintu & Akses",
      cell: (info) => {
        const visit = info.row.original;
        const doorAccessType = resolveDoorAccessType(
          visit.lastSeenDoor,
          doors,
        );

        return (
          <div className="space-y-2 min-w-[260px]">
            {/* Last seen door */}
            {visit.lastSeenDoor && (
              <div
                data-testid="visitor-last-seen-door"
                className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-[var(--ks-paper-deep)] px-2.5 py-1.5 text-xs border border-[var(--ks-rule-subtle)]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--ks-muted)] font-medium">
                    Lokasi Terakhir:
                  </span>
                  <span className="font-semibold text-[var(--ks-ink)]">
                    {visit.lastSeenDoor.doorName ||
                      visit.lastSeenDoor.doorIndexCode}
                  </span>
                  <span className="text-[11px] text-[var(--ks-muted)]">
                    ({visit.lastSeenDoor.direction === "in" ? "Masuk" : "Keluar"}{" "}
                    pada{" "}
                    {new Date(
                      visit.lastSeenDoor.tappedAtUtc,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </span>
                </div>
                {doorAccessType === "DUAL_DIRECTION" && (
                  <span
                    data-testid="directionality-badge-dual"
                    className="inline-flex items-center rounded-full border border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] px-2 py-0.5 text-2xs font-semibold text-[var(--ks-ink)]"
                  >
                    Pintu Dua Arah
                  </span>
                )}
                {doorAccessType === "SINGLE_DIRECTION_IN" && (
                  <span
                    data-testid="directionality-badge-single"
                    className="inline-flex items-center rounded-full border border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/20 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-[var(--ks-ink)]"
                  >
                    Pintu Masuk Saja
                  </span>
                )}
              </div>
            )}

            {/* Movement Breadcrumbs */}
            {visit.movementBreadcrumbs &&
              visit.movementBreadcrumbs.length > 0 && (
                <div className="rounded-lg border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] p-2">
                  <div className="text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ks-muted)] mb-1 flex items-center gap-1">
                    <span>Riwayat Pergerakan Pintu</span>
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-1 text-xs text-[var(--ks-ink)]"
                    data-testid="movement-breadcrumbs"
                  >
                    {visit.movementBreadcrumbs.map((crumb, idx) => {
                      const isImplicit = Boolean(
                        crumb.isImplicit || crumb.implicit,
                      );
                      return (
                        <span
                          key={crumb.id || `${crumb.doorIndexCode}-${idx}`}
                          className="inline-flex items-center gap-1"
                        >
                          {idx > 0 && (
                            <span className="text-[var(--ks-muted)] font-bold">
                              →
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium border ${
                              isImplicit
                                ? "bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)] border-[var(--ks-kinpaku)]/30 font-semibold"
                                : "bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] border-[var(--ks-rule-subtle)] shadow-2xs"
                            }`}
                          >
                            <span>{crumb.doorName || crumb.doorIndexCode}</span>
                            <span
                              className={
                                isImplicit
                                  ? "text-[var(--ks-ink)] font-bold"
                                  : "text-[var(--ks-muted)]"
                              }
                            >
                              (
                              {isImplicit
                                ? "Keluar Otomatis"
                                : crumb.direction === "in"
                                  ? "Masuk"
                                  : "Keluar"}
                              )
                            </span>
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Emergency Grants */}
            {visit.emergencyGrants && visit.emergencyGrants.length > 0 && (
              <div
                className="space-y-1.5"
                data-testid="emergency-grants-list"
              >
                {visit.emergencyGrants.map((grant) => {
                  const isActive = isEmergencyGrantActive(grant);
                  const isRevoked = grant.status === "REVOKED";
                  const isExpired =
                    grant.status === "EXPIRED" || (!isActive && !isRevoked);

                  const msRemaining =
                    new Date(grant.expiresAtUtc).getTime() - Date.now();
                  const minsRemaining = Math.max(
                    0,
                    Math.ceil(msRemaining / (60 * 1000)),
                  );
                  const remainingLabel =
                    minsRemaining >= 60
                      ? `${Math.floor(minsRemaining / 60)}j ${
                          minsRemaining % 60
                        }m tersisa`
                      : `${minsRemaining}m tersisa`;

                  const expiryFormatted = new Date(
                    grant.expiresAtUtc,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={grant.id}
                      className={`flex flex-wrap items-center justify-between gap-1.5 rounded-lg p-2 text-xs border ${
                        isActive
                          ? "border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 text-[var(--ks-ink)]"
                          : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] opacity-75"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--ks-ink)] flex items-center gap-1">
                            <span>Izin Akses Darurat Sementara:</span>
                            <span>
                              {grant.doorNames?.join(", ") ||
                                grant.doorIndexCodes?.join(", ")}
                            </span>
                          </span>
                          {isActive && (
                            <span className="rounded-full border border-[var(--ks-vermilion)]/30 bg-[var(--ks-vermilion)]/15 px-2 py-0.5 text-3xs font-bold text-[var(--ks-vermilion)]">
                              {remainingLabel}
                            </span>
                          )}
                          {isRevoked && (
                            <span className="rounded-full border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-3xs font-medium text-[var(--ks-muted)]">
                              Dicabut
                            </span>
                          )}
                          {isExpired && !isRevoked && (
                            <span className="rounded-full border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-2 py-0.5 text-3xs font-medium text-[var(--ks-muted)]">
                              Kedaluwarsa
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--ks-muted)]">
                          <span className="font-medium text-[var(--ks-ink)]">
                            Alasan:
                          </span>{" "}
                          {grant.reason} •{" "}
                          <span className="font-medium text-[var(--ks-ink)]">
                            Berakhir:
                          </span>{" "}
                          {expiryFormatted} •{" "}
                          <span className="font-medium text-[var(--ks-ink)]">
                            Oleh:
                          </span>{" "}
                          {grant.grantedByName || grant.grantedByUserId}
                        </p>
                      </div>

                      {isActive && (
                        <button
                          type="button"
                          onClick={() => onRevokeEmergencyAccess(visit, grant)}
                          disabled={actionLoadingId === grant.id}
                          className="ks-btn inline-flex items-center rounded-md border border-[var(--ks-vermilion)]/40 bg-[var(--ks-paper-raised)] px-2 py-0.5 text-xs font-semibold text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/10 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === grant.id
                            ? "Mencabut..."
                            : "Cabut Izin Akses"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      },
    }),

    // Column 5: Operational Actions
    columnHelper.display({
      id: "actions",
      header: "Aksi Operator",
      cell: (info) => {
        const visit = info.row.original;
        const isLoading = actionLoadingId === visit.visitId;
        const canGrantEmergency =
          visit.status === "CHECKED_IN" ||
          visit.status === "OVERSTAY" ||
          visit.isOverstay;

        return (
          <div className="flex flex-col gap-1.5 min-w-[130px]">
            {canGrantEmergency && (
              <button
                type="button"
                onClick={() => onGrantEmergency(visit)}
                disabled={isLoading}
                className="ks-btn inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--ks-ink)] shadow-2xs hover:brightness-105 active:scale-98 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <span>Izin Akses Darurat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNormalCheckOut(visit)}
              disabled={isLoading}
              className="ks-btn inline-flex items-center justify-center rounded-lg bg-[var(--ks-patina)] px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:brightness-110 active:scale-98 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? "Memproses..." : "Check-Out Normal"}
            </button>

            <button
              type="button"
              onClick={() => onForceCheckOut(visit)}
              disabled={isLoading}
              className="ks-btn inline-flex items-center justify-center rounded-lg border border-[var(--ks-vermilion)]/40 bg-[var(--ks-vermilion)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--ks-vermilion)] hover:bg-[var(--ks-vermilion)]/20 active:scale-98 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Check-Out Paksa
            </button>
          </div>
        );
      },
    }),
  ];
}
