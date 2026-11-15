"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { idDict } from "@/lib/vms/i18n/id";
import type { Facility } from "@/lib/vms/vms-contract";
import { useSafePathname } from "./use-safe-pathname";
import { HikCentralStatusBadge } from "./hikcentral-status-badge";

export interface HeaderProps {
  facilities?: Facility[];
  selectedFacilityId?: string;
  onSelectFacility?: (facilityId: string) => void;
  currentPath?: string;
  onOpenMobileMenu?: () => void;
  systemHealthy?: boolean;
  operatorRole?: string;
}

function getTimezoneAbbreviation(tz: string): string {
  if (tz === "Asia/Jakarta") return "WIB";
  if (tz === "Asia/Makassar") return "WITA";
  if (tz === "Asia/Jayapura") return "WIT";
  return tz;
}

function getBreadcrumbHierarchy(path: string): { group?: string; title: string } {
  if (path.includes("/reception")) return { group: "Operasional Utama", title: "Meja Resepsionis" };
  if (path.includes("/active-monitoring")) return { group: "Operasional Utama", title: "Monitoring Tamu & Pintu" };
  if (path.includes("/approvals")) return { group: "Operasional Utama", title: "Persetujuan Kunjungan" };
  if (path.includes("/pre-registration")) return { group: "Pendaftaran Undangan", title: "Buat Undangan Tamu" };
  if (path.includes("/group-registration")) return { group: "Pendaftaran Undangan", title: "Pendaftaran Rombongan" };
  if (path.includes("/access-levels")) return { group: "Master Keamanan", title: "Hak Akses Pintu" };
  if (path.includes("/visitors")) return { group: "Master Keamanan", title: "Buku Tamu & Biometrik" };
  return { title: "Beranda Operasional" };
}

export function Header({
  facilities = [],
  selectedFacilityId,
  onSelectFacility,
  currentPath: propPath,
  onOpenMobileMenu,
  systemHealthy,
  operatorRole = idDict.header.operatorRole,
}: HeaderProps) {
  const activePath = useSafePathname(propPath);
  const selectedFacility =
    facilities.find((f) => f.id === selectedFacilityId) || facilities[0];

  const tz = selectedFacility?.timezone || "Asia/Jakarta";
  const tzAbbr = getTimezoneAbbreviation(tz);

  // Initialize with empty string to ensure server HTML and client initial render
  // match identically ("--:--:--"), preventing React hydration mismatch.
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat("id-ID", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
        setCurrentTime(formatted);
      } catch {
        setCurrentTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [tz]);

  const breadcrumb = getBreadcrumbHierarchy(activePath);

  return (
    <header className="sticky top-0 z-20 h-16 bg-[var(--ks-paper-raised)] border-b border-[var(--ks-rule)] flex items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper-deep)] rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ks-patina-deep)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center text-xs text-[var(--ks-text-muted)]">
          <Link href="/vms/reception" className="hover:text-[var(--ks-ink)] transition-colors font-medium">
            VMS
          </Link>
          {breadcrumb.group && (
            <>
              <span className="mx-2 text-[var(--ks-rule)] font-bold">/</span>
              <span className="text-[var(--ks-text-muted)] hidden sm:inline">{breadcrumb.group}</span>
            </>
          )}
          <span className="mx-2 text-[var(--ks-rule)] font-bold">/</span>
          <span className="font-semibold text-[var(--ks-ink)]">
            {breadcrumb.title}
          </span>
        </nav>
      </div>

      {/* Right Controls: Facility & Live Clock, System Health, Operator Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Facility Selector & Live Clock */}
        <div className="flex items-center gap-2 bg-[var(--ks-paper-deep)] border border-[var(--ks-rule)] rounded-[var(--ks-radius-md)] px-2.5 py-1.5 shadow-2xs">
          <svg className="w-4 h-4 text-[var(--ks-text-faint)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>

          {facilities.length > 0 ? (
            <select
              aria-label={idDict.header.selectFacility}
              value={selectedFacility?.id}
              onChange={(e) => onSelectFacility?.(e.target.value)}
              className="text-xs font-semibold text-[var(--ks-ink)] bg-transparent border-0 focus:ring-0 cursor-pointer pr-2 outline-hidden"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id} className="bg-[var(--ks-paper-raised)] text-[var(--ks-ink)]">
                  {fac.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-semibold text-[var(--ks-ink)]">
              Jakarta Corporate HQ
            </span>
          )}

          <div className="h-3.5 w-px bg-[var(--ks-rule)] mx-1" />

          {/* Timezone Clock */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--ks-text-muted)]">
            <span
              suppressHydrationWarning
              className="font-mono tabular-nums text-[var(--ks-ink)] font-semibold"
            >
              {currentTime || "--:--:--"}
            </span>
            <span className="px-1.5 py-0.5 rounded-[var(--ks-radius-sm)] bg-[var(--ks-gray-2)] text-[10px] font-bold text-[var(--ks-ink)]">
              {tzAbbr}
            </span>
          </div>
        </div>

        {/* HikCentral Gateway Health Badge */}
        <div className="hidden md:flex items-center">
          <HikCentralStatusBadge
            initialStatus={
              systemHealthy !== undefined
                ? systemHealthy
                  ? "online"
                  : "offline"
                : "checking"
            }
            autoCheck={true}
          />
        </div>

        {/* Operator Profile Avatar & Role */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[var(--ks-rule)]">
          <div className="w-8 h-8 rounded-[var(--ks-radius-pill)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--ks-rule)] shadow-2xs">
            PR
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="text-xs font-semibold text-[var(--ks-ink)] leading-tight">
              {operatorRole}
            </span>
            <span className="text-[10px] text-[var(--ks-text-muted)] leading-tight">
              Aktif • Lobi Utama
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
