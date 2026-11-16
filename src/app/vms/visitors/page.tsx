import { Suspense } from "react";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { VisitorsClient } from "./visitors-client";
import { PageHeader, UiLoadingFallback } from "@/components/vms/ui";
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

  return (
    <div className="space-y-6">
      <PageHeader pageKey="visitors" badge="Privasi & Biometrik" />

      <Suspense fallback={<UiLoadingFallback message={idDict.common.loading} />}>
        <VisitorsClient initialProfiles={initialProfiles} />
      </Suspense>
    </div>
  );
}
