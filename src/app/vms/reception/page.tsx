import Link from "next/link";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultCheckInService } from "@/lib/vms/checkin-service";
import { ReceptionClient } from "./reception-client";

export const metadata = {
  title: "Front-Desk Reception & Fast Check-in | VMS",
  description:
    "Fast visitor lookup, photo verification, one-click check-in, and walk-in registration for receptionists.",
};

export default async function ReceptionPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const allAccessLevels = await defaultVmsRepository.listAccessLevels();
  const initialVisits = await defaultCheckInService.searchArrivingVisitors("");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6">
        <Link
          href="/"
          className="text-xs font-medium text-neutral-600 transition hover:text-neutral-900"
        >
          &larr; Back to Home
        </Link>
      </nav>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            Front-Desk Reception & Fast Check-in
          </h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Ticket 06
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
          Dedicated receptionist dashboard for instant visitor lookup by name, phone, identity number,
          or QR scan. Verify photo credentials, execute one-click physical check-in via HikCentral
          registerment, register lobby walk-in guests, and monitor live hardware controller synchronization.
        </p>
      </div>

      <ReceptionClient
        facilities={facilities}
        allAccessLevels={allAccessLevels}
        initialVisits={initialVisits}
      />
    </main>
  );
}
