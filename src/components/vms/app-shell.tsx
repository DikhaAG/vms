"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { Facility } from "@/lib/vms/vms-contract";

export interface AppShellProps {
  children: React.ReactNode;
  currentPath?: string;
  initialFacilities?: Facility[];
}

const DEFAULT_FACILITIES: Facility[] = [
  {
    id: "fac-jakarta",
    name: "Jakarta Corporate HQ",
    timezone: "Asia/Jakarta",
  },
  {
    id: "fac-bali",
    name: "Bali Innovation Center",
    timezone: "Asia/Makassar",
  },
  {
    id: "fac-jayapura",
    name: "Jayapura Logistics Hub",
    timezone: "Asia/Jayapura",
  },
];

export function AppShell({
  children,
  currentPath,
  initialFacilities = DEFAULT_FACILITIES,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState(
    initialFacilities[0]?.id || "fac-jakarta"
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
      <Sidebar
        currentPath={currentPath}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          facilities={initialFacilities}
          selectedFacilityId={selectedFacilityId}
          onSelectFacility={setSelectedFacilityId}
          currentPath={currentPath}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

