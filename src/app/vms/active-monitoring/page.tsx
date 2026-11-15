import { Suspense } from "react";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { ActiveMonitoringClient } from "./active-monitoring-client";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { UiLoadingFallback } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Monitoring Tamu & Pintu Aktif | VMS",
  description:
    "Pemantauan real-time kehadiran tamu, peringatan overstay toleransi kepulangan, penegakan jatah tap pintu, dan izin akses darurat sementara.",
};

export default async function ActiveMonitoringPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const initialVisits = await defaultActiveMonitoringService.getActiveVisits();
  const doors = await defaultVmsRepository.listDoors();

  const pageInfo = idDict.pages.activeMonitoring;

  return (
    <div className="space-y-6">
      {/* Page Header with Guide Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--ks-rule-subtle)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ks-ink)]">
              {pageInfo.title}
            </h1>
            <span className="rounded-full border border-[var(--ks-kinpaku)]/30 bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)] px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider">
              {idDict.header.liveMonitoring}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ks-muted)] max-w-3xl">
            {pageInfo.subtitle}
          </p>
        </div>

        <div>
          <PageGuideModal pageKey="activeMonitoring" />
        </div>
      </div>

      <Suspense fallback={<UiLoadingFallback message={idDict.common.loading} />}>
        <ActiveMonitoringClient
          facilities={facilities}
          initialVisits={initialVisits}
          doors={doors}
        />
      </Suspense>
    </div>
  );
}
