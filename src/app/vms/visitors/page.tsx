import { defaultVmsRepository } from "@/lib/vms/repository";
import { VisitorsClient } from "./visitors-client";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Buku Tamu & Basis Data Biometrik | VMS",
  description:
    "Basis data profil tamu, retensi foto biometrik wajah terenkripsi, kepatuhan privasi data PDP, dan daftar pantauan keamanan.",
};

export default async function VisitorsPage() {
  const initialProfiles = await defaultVmsRepository.listVisitorProfiles({
    includeDeleted: true,
  });

  const pageInfo = idDict.pages.visitors;

  return (
    <div className="space-y-6">
      {/* Page Header with Guide Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {pageInfo.title}
            </h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800 px-2.5 py-0.5 text-xs font-semibold">
              Privasi &amp; Biometrik
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            {pageInfo.subtitle}
          </p>
        </div>

        <div>
          <PageGuideModal pageKey="visitors" />
        </div>
      </div>

      <VisitorsClient initialProfiles={initialProfiles} />
    </div>
  );
}
