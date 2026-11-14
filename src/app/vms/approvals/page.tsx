import { defaultVmsRepository } from "@/lib/vms/repository";
import { listPendingApprovals } from "@/lib/vms/approval-service";
import { ApprovalsClient } from "./approvals-client";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Persetujuan Kunjungan Tamu | VMS",
  description:
    "Antrean pemeriksaan dan otorisasi izin kunjungan tamu oleh Karyawan Tuan Rumah dan Petugas Keamanan sebelum akses terminal fisik diaktifkan.",
};

export default async function ApprovalsPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const initialData = await listPendingApprovals();

  const pageInfo = idDict.pages.approvals;

  return (
    <div className="space-y-6">
      {/* Page Header with Guide Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {pageInfo.title}
            </h1>
            <span className="rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 dark:border dark:border-purple-800 px-2.5 py-0.5 text-xs font-semibold">
              Otorisasi Akses
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            {pageInfo.subtitle}
          </p>
        </div>

        <div>
          <PageGuideModal pageKey="approvals" />
        </div>
      </div>

      <ApprovalsClient
        facilities={facilities}
        initialPendingVisits={initialData.pendingVisits}
        initialEscalatedVisits={initialData.escalatedVisits}
      />
    </div>
  );
}
