import React from "react";
import { AppShell } from "@/components/vms/app-shell";
import { VmsProviders } from "@/components/vms/vms-providers";
import { defaultVmsRepository } from "@/lib/vms/repository";

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

