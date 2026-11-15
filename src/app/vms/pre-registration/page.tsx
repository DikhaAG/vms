import { defaultVmsRepository } from "@/lib/vms/repository";
import { PreRegistrationForm } from "./pre-registration-form";
import { PageHeader } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Buat Undangan Tamu Terjadwal | VMS",
  description:
    "Jadwalkan kunjungan tamu di muka dan kirimkan tautan pendaftaran mandiri foto biometrik wajah.",
};

export default async function PreRegistrationPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const accessLevels = await defaultVmsRepository.listAccessLevels();

  const pageInfo = idDict.pages.preRegistration;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageInfo.title}
        subtitle={pageInfo.subtitle}
        badge="Kunjungan Individual"
        guidePageKey="preRegistration"
      />

      <PreRegistrationForm
        initialFacilities={facilities}
        initialAccessLevels={accessLevels}
      />
    </div>
  );
}
