// src/app/vms/active-monitoring/page.tsx
import { Suspense } from "react";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { ActiveMonitoringClient } from "./active-monitoring-client";
import { PageHeader, UiLoadingFallback } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Monitoring Tamu & Pintu Aktif | VMS",
  description:
    "Pemantauan real-time kehadiran tamu, peringatan overstay toleransi kepulangan, penegakan jatah tap pintu, dan izin akses darurat sementara.",
};

export default async function ActiveMonitoringPage() {
  const settings = await defaultVmsRepository.getSettings();
  const initialVisits = await defaultActiveMonitoringService.getActiveVisits();
  const doors = await defaultVmsRepository.listDoors();
  const pageInfo = idDict.pages.activeMonitoring;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageInfo.title}
        subtitle={pageInfo.subtitle}
        badge={idDict.header.liveMonitoring}
        guidePageKey="activeMonitoring"
      />

      <Suspense fallback={<UiLoadingFallback message={idDict.common.loading} />}>
        <ActiveMonitoringClient
          systemTimezone={settings.timezone}
          initialVisits={initialVisits}
          doors={doors}
        />
      </Suspense>
    </div>
  );
}