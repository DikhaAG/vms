import { defaultVmsRepository } from "@/lib/vms/repository";
import { listPendingApprovals } from "@/lib/vms/approval-service";
import { ApprovalsClient } from "./approvals-client";
import { PageHeader } from "@/components/vms/ui";

export const metadata = {
  title: "Persetujuan Kunjungan Tamu | VMS",
  description:
    "Antrean pemeriksaan dan otorisasi izin kunjungan tamu oleh Karyawan Tuan Rumah dan Petugas Keamanan sebelum akses terminal fisik diaktifkan.",
};

export default async function ApprovalsPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const initialData = await listPendingApprovals();

  return (
    <div className="space-y-6">
      <PageHeader
        pageKey="approvals"
        badge="Otorisasi Akses"
      />

      <ApprovalsClient
        facilities={facilities}
        initialPendingVisits={initialData.pendingVisits}
        initialEscalatedVisits={initialData.escalatedVisits}
      />
    </div>
  );
}
