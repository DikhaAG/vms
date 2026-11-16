import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultCheckInService } from "@/lib/vms/checkin-service";
import { ReceptionClient } from "./reception-client";
import { PageHeader } from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";

export const metadata = {
  title: "Meja Resepsionis Lobi | VMS",
  description:
    "Pencarian cepat data tamu, verifikasi foto biometrik wajah, check-in satu klik, dan pendaftaran tamu datang langsung (walk-in).",
};

export default async function ReceptionPage() {
  const settings = await defaultVmsRepository.getSettings();
  const allAccessLevels = await defaultVmsRepository.listAccessLevels();
  const hosts = await defaultVmsRepository.listHosts();
  const initialVisits = await defaultCheckInService.searchArrivingVisitors("");
  const pageInfo = idDict.pages.reception;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageInfo.title}
        subtitle={pageInfo.subtitle}
        badge="Lobi Utama"
        pageKey="reception"
      />
      <ReceptionClient
        systemTimezone={settings.timezone}
        allAccessLevels={allAccessLevels}
        hosts={hosts}
        initialVisits={initialVisits}
      />
    </div>
  );
}