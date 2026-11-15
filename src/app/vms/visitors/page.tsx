import { defaultVmsRepository } from "@/lib/vms/repository";
import { VisitorsClient } from "./visitors-client";
import { PageHeader } from "@/components/vms/ui";

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

      <VisitorsClient initialProfiles={initialProfiles} />
    </div>
  );
}
