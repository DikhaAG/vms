"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { idDict, type NavigationItem, type NavIconKey } from "@/lib/vms/i18n/id";
import { useSafePathname } from "./use-safe-pathname";

export interface SidebarProps {
  currentPath?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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
}: SidebarProps) {
  const activePath = useSafePathname(propPath);
  const groups = Object.entries(idDict.navigation.groups);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation & focus trapping for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMobile?.();
        return;
      }

      if (event.key === "Tab") {
        if (!drawerRef.current) return;
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const renderNavLinks = (isDrawer = false) => (
    <div className="space-y-6">
      {groups.map(([groupKey, group]) => (
        <div key={groupKey}>
          {(!collapsed || isDrawer) && (
            <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
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
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-400 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors"
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
        className={`hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 z-30 shrink-0 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          {!collapsed ? (
            <Link href="/vms/reception" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                VMS
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {idDict.appName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {idDict.appShortName}
                </span>
              </div>
            </Link>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              V
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? idDict.navigation.expandMenu : idDict.navigation.collapseMenu}
            aria-expanded={!collapsed}
            className={`p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors dark:hover:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
              collapsed ? "mx-auto mt-2" : ""
            }`}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          {renderNavLinks(false)}
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
            className="relative flex flex-col w-72 max-w-[80vw] bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 z-10 animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
              <Link href="/vms/reception" onClick={onCloseMobile} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  VMS
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {idDict.appName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {idDict.appShortName}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Tutup menu navigasi"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors dark:hover:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
