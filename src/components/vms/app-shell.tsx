"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export interface AppShellProps {
  children: React.ReactNode;
  currentPath?: string;
  siteName?: string;
  timezone?: string;
}

export function AppShell({
  children,
  currentPath,
  siteName,
  timezone,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--ks-paper)] text-[var(--ks-text)] flex antialiased">
      {/* Sidebar Navigation (Desktop Rail/Drawer + Mobile Drawer) */}
      <Sidebar
        currentPath={currentPath}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        siteName={siteName}
        timezone={timezone}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          siteName={siteName}
          timezone={timezone}
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
