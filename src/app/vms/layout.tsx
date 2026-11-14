import React from "react";
import { AppShell } from "@/components/vms/app-shell";

export const metadata = {
  title: "Sistem Manajemen Tamu (VMS) - HikCentral",
  description: "Pengelolaan Kunjungan, Hak Akses Pintu Fisik, dan Keamanan Terpadu Gedung",
};

export default function VmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

