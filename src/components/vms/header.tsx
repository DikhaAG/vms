"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { idDict } from "@/lib/vms/i18n/id";
import type { Facility } from "@/lib/vms/vms-contract";

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

function getBreadcrumbTitle(path: string): string {
  if (path.includes("/reception")) return "Meja Resepsionis";
  if (path.includes("/active-monitoring")) return "Monitoring Tamu & Pintu";
  if (path.includes("/approvals")) return "Persetujuan Kunjungan";
  if (path.includes("/pre-registration")) return "Buat Undangan Tamu";
  if (path.includes("/group-registration")) return "Pendaftaran Rombongan";
  if (path.includes("/access-levels")) return "Hak Akses Pintu";
  if (path.includes("/visitors")) return "Buku Tamu & Biometrik";
  return "Beranda Operasional";
}

export function Header({
  facilities = [],
  selectedFacilityId,
  onSelectFacility,
  currentPath: propPath,
  onOpenMobileMenu,
  systemHealthy = true,
  operatorRole = idDict.header.operatorRole,
}: HeaderProps) {
  let hookPath = "";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hookPath = usePathname() || "";
  } catch {
    hookPath = "";
  }

  const activePath = propPath || hookPath || "";
  const selectedFacility =
    facilities.find((f) => f.id === selectedFacilityId) || facilities[0];

  const tz = selectedFacility?.timezone || "Asia/Jakarta";
  const tzAbbr = getTimezoneAbbreviation(tz);

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

  const breadcrumb = getBreadcrumbTitle(activePath);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 dark:text-slate-400">
          <Link href="/vms/reception" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            VMS
          </Link>
          <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {breadcrumb}
          </span>
        </nav>
      </div>

      {/* Right Controls: Facility & Live Clock, System Health, Operator Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Facility Selector & Live Clock */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>

          {facilities.length > 0 ? (
            <select
              aria-label={idDict.header.selectFacility}
              value={selectedFacility?.id}
              onChange={(e) => onSelectFacility?.(e.target.value)}
              className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-transparent border-0 focus:ring-0 cursor-pointer pr-2 outline-hidden"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id} className="dark:bg-slate-900">
                  {fac.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Jakarta Corporate HQ
            </span>
          )}

          <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Timezone Clock */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-medium">
              {currentTime || "10:00:00"}
            </span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-200/70 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
              {tzAbbr}
            </span>
          </div>
        </div>

        {/* System Health Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>{systemHealthy ? idDict.header.systemConnected : idDict.header.systemDisconnected}</span>
        </div>

        {/* Operator Profile Avatar & Role */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
            PR
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="text-xs font-medium text-slate-900 dark:text-white leading-tight">
              {operatorRole}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">
              Aktif • Lobi Utama
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
