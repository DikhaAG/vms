import { defaultVmsRepository } from "@/lib/vms/repository";
import { AccessLevelsClient } from "./access-levels-client";
import { PageHeader } from "@/components/vms/ui";

export const metadata = {
  title: "Pengaturan Hak Akses Pintu | VMS",
  description:
    "Konfigurasi kelompok pintu fisik, lantai lift, template jadwal waktu, dan batas tap untuk keamanan gedung.",
};

export default async function AccessLevelsPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const accessLevels = await defaultVmsRepository.listAccessLevels();
  const doors = await defaultVmsRepository.listDoors();

  return (
    <div className="space-y-6">
      <PageHeader
        pageKey="accessLevels"
        badge="Master Keamanan"
      />

      <AccessLevelsClient
        facilities={facilities}
        initialAccessLevels={accessLevels}
        initialDoors={doors}
      />
    </div>
  );
}
