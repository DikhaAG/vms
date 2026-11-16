import { defaultVmsRepository } from "@/lib/vms/repository";
import { GroupRegistrationClient } from "./group-registration-client";
import { PageHeader } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Pendaftaran Rombongan & Delegasi | VMS",
  description:
    "Daftarkan rombongan tamu, tim vendor, atau delegasi klien dalam satu grup janji temu terpadu dengan hak akses serentak.",
};

export default async function GroupRegistrationPage() {
  const allAccessLevels = await defaultVmsRepository.listAccessLevels();

  const pageInfo = idDict.pages.groupRegistration;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageInfo.title}
        subtitle={pageInfo.subtitle}
        badge="Kunjungan Kolektif"
        pageKey="groupRegistration"
      />

      <GroupRegistrationClient
        allAccessLevels={allAccessLevels}
      />
    </div>
  );
}
