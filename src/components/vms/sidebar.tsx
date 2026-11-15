"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { idDict, type NavigationItem, type NavIconKey } from "@/lib/vms/i18n/id";
import type { Facility } from "@/lib/vms/vms-contract";
import { useSafePathname } from "./use-safe-pathname";
import { useModalFocusTrap } from "./use-modal-focus-trap";
import { getTimezoneAbbreviation } from "./header";

export interface SidebarProps {
  currentPath?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  facilities?: Facility[];
  selectedFacilityId?: string;
  selectedFacility?: Facility;
}

function renderNavIcon(icon: NavIconKey) {
  switch (icon) {
    case "desk":
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "shield-check":
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "clipboard-check":
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "user-plus":
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    case "users":
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "key":
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    case "id-card":
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2H9.17A3.001 3.001 0 0112 14z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}

export function Sidebar({
  currentPath: propPath,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  facilities = [],
  selectedFacilityId,
  selectedFacility,
}: SidebarProps) {
  const activePath = useSafePathname(propPath);
  const groups = Object.entries(idDict.navigation.groups);
  const drawerRef = useRef<HTMLDivElement>(null);

  const activeFacility =
    selectedFacility ||
    facilities.find((f) => f.id === selectedFacilityId) ||
    facilities[0] || {
      id: "fac-jakarta",
      name: "Jakarta Corporate HQ",
      timezone: "Asia/Jakarta",
    };

  const tz = activeFacility.timezone || "Asia/Jakarta";
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

  // Keyboard navigation & focus trapping for mobile drawer
  useModalFocusTrap({
    ref: drawerRef,
    isOpen: mobileOpen,
    onClose: onCloseMobile,
  });

  const renderNavLinks = (isDrawer = false) => (
    <div className="space-y-6">
      {groups.map(([groupKey, group]) => (
        <div key={groupKey}>
          {(!collapsed || isDrawer) && (
            <h3 className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ks-text-faint)] mb-2">
              {group.title}
            </h3>
          )}
          <nav className="space-y-1">
            {group.items.map((item: NavigationItem) => {
              const isActive = activePath === item.href || activePath.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={isDrawer ? onCloseMobile : undefined}
                  aria-current={isActive ? "page" : undefined}
                  title={item.title}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-[var(--ks-radius-md)] text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[var(--ks-paper-deep)] text-[var(--ks-ink)] font-semibold shadow-2xs border-l-2 border-[var(--ks-kinpaku-rich)]"
                      : "text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper-deep)]/60"
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? "text-[var(--ks-kinpaku-deep)]"
                        : "text-[var(--ks-text-faint)] group-hover:text-[var(--ks-ink)] transition-colors"
                    }
                  >
                    {renderNavIcon(item.icon)}
                  </span>
                  {(!collapsed || isDrawer) && (
                    <span className="truncate">{item.title}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg screens) */}
      <aside
        className={`hidden lg:flex flex-col bg-[var(--ks-paper-raised)] border-r border-[var(--ks-rule)] transition-all duration-200 z-30 shrink-0 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Brand / Logo */}
        <div
          className={`h-16 px-4 border-b border-[var(--ks-rule)] flex items-center ${
            collapsed ? "justify-center px-2" : ""
          }`}
        >
          {!collapsed ? (
            <Link href="/vms/reception" className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-[var(--ks-radius-md)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] flex items-center justify-center font-bold text-sm shadow-xs border border-[var(--ks-rule)] shrink-0">
                VMS
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[var(--ks-ink)] truncate tracking-tight">
                  {idDict.appName}
                </span>
                <span className="text-[10px] text-[var(--ks-text-muted)] truncate">
                  {idDict.appShortName}
                </span>
              </div>
            </Link>
          ) : (
            <Link
              href="/vms/reception"
              title={idDict.appName}
              className="flex items-center justify-center"
            >
              <div className="w-9 h-9 rounded-[var(--ks-radius-md)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] flex items-center justify-center font-bold text-sm shadow-xs border border-[var(--ks-rule)]">
                V
              </div>
            </Link>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          {renderNavLinks(false)}
        </div>

        {/* Bottom Footer Dock: Ergonomic Collapse/Expand Toggle */}
        <div className="mt-auto border-t border-[var(--ks-rule)] p-2">
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={idDict.navigation.expandMenu}
              aria-expanded={false}
              title={idDict.navigation.expandMenu}
              className="w-full flex items-center justify-center p-2 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper-deep)] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ks-patina-deep)]"
            >
              <svg
                className="w-4 h-4 rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={idDict.navigation.collapseMenu}
              aria-expanded={true}
              title={idDict.navigation.collapseMenu}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] text-xs font-semibold text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper-deep)] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ks-patina-deep)]"
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              <span className="truncate">{idDict.navigation.collapseMenu}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (< 1024px) */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Mobile"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div
            ref={drawerRef}
            className="relative flex flex-col w-72 max-w-[80vw] bg-[var(--ks-paper-raised)] shadow-[var(--ks-lift-2)] border-r border-[var(--ks-rule)] z-10 animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--ks-rule)]">
              <Link href="/vms/reception" onClick={onCloseMobile} className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[var(--ks-radius-md)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] flex items-center justify-center font-bold text-xs shadow-xs border border-[var(--ks-rule)] shrink-0">
                  VMS
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-[var(--ks-ink)] truncate tracking-tight">
                    {idDict.appName}
                  </span>
                  <span className="text-[10px] text-[var(--ks-text-muted)] truncate">
                    {idDict.appShortName}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Tutup menu navigasi"
                className="p-1.5 text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper-deep)] rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule)] transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ks-patina-deep)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Drawer Telemetry Block (Active Facility + Live Clock) */}
            <div className="px-4 py-3 bg-[var(--ks-paper-deep)]/80 border-b border-[var(--ks-rule)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-[var(--ks-text-faint)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-xs font-semibold text-[var(--ks-ink)] truncate" title={activeFacility.name}>
                    {activeFacility.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--ks-text-muted)] shrink-0">
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
            </div>

            {/* Drawer Links */}
            <div className="flex-1 px-4 py-4 overflow-y-auto">
              {renderNavLinks(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
