import React from "react";
import { AppShell } from "@/components/vms/app-shell";
import { VmsProviders } from "@/components/vms/vms-providers";
import { defaultVmsRepository } from "@/lib/vms/repository";

// Every /vms page reads live data from PostgreSQL, so render per request
// instead of prerendering at build time (when no database is available).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sistem Manajemen Tamu (VMS) - HikCentral",
  description: "Pengelolaan Kunjungan, Hak Akses Pintu Fisik, dan Keamanan Terpadu Gedung",
};

export default async function VmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await defaultVmsRepository.getSettings();

  return (
    <VmsProviders>
      <AppShell siteName={settings.siteName} timezone={settings.timezone}>
        {children}
      </AppShell>
    </VmsProviders>
  );
}

