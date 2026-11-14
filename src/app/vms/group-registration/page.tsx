import { defaultVmsRepository } from "@/lib/vms/repository";
import { GroupRegistrationClient } from "./group-registration-client";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Pendaftaran Rombongan & Delegasi | VMS",
  description:
    "Daftarkan rombongan tamu, tim vendor, atau delegasi klien dalam satu grup janji temu terpadu dengan hak akses serentak.",
};

export default async function GroupRegistrationPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const allAccessLevels = await defaultVmsRepository.listAccessLevels();

  const pageInfo = idDict.pages.groupRegistration;

  return (
    <div className="space-y-6">
      {/* Page Header with Guide Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {pageInfo.title}
            </h1>
            <span className="rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border dark:border-indigo-800 px-2.5 py-0.5 text-xs font-semibold">
              Kunjungan Kolektif
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            {pageInfo.subtitle}
          </p>
        </div>

        <div>
          <PageGuideModal pageKey="groupRegistration" />
        </div>
      </div>

      <GroupRegistrationClient
        facilities={facilities}
        allAccessLevels={allAccessLevels}
      />
    </div>
  );
}
