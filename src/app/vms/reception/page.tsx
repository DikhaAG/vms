import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultCheckInService } from "@/lib/vms/checkin-service";
import { ReceptionClient } from "./reception-client";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Meja Resepsionis Lobi | VMS",
  description:
    "Pencarian cepat data tamu, verifikasi foto biometrik wajah, check-in satu klik, dan pendaftaran tamu datang langsung (walk-in).",
};

export default async function ReceptionPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const allAccessLevels = await defaultVmsRepository.listAccessLevels();
  const initialVisits = await defaultCheckInService.searchArrivingVisitors("");

  const pageInfo = idDict.pages.reception;

  return (
    <div className="space-y-6">
      {/* Page Header with Guide Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {pageInfo.title}
            </h1>
            <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:border dark:border-blue-800 px-2.5 py-0.5 text-xs font-semibold">
              Lobi Utama
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            {pageInfo.subtitle}
          </p>
        </div>

        <div>
          <PageGuideModal pageKey="reception" />
        </div>
      </div>

      <ReceptionClient
        facilities={facilities}
        allAccessLevels={allAccessLevels}
        initialVisits={initialVisits}
      />
    </div>
  );
}
