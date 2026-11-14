import Link from "next/link";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { ActiveMonitoringClient } from "./active-monitoring-client";

export const metadata = {
  title: "Active Attendance & Check-out Monitor | VMS",
  description:
    "Real-time monitoring of on-premise guests, overstay grace period alerts, door tap quota enforcement, and hardware terminal check-out.",
};

export default async function ActiveMonitoringPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const initialVisits = await defaultActiveMonitoringService.getActiveVisits();
  const doors = await defaultVmsRepository.listDoors();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            Active Attendance & Security Monitor
          </h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Ticket 07
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
          Real-time security dashboard tracking checked-in guests currently on-premise.
          Enforces door tap quotas (via physical access events), calculates facility overstay grace periods,
          tracks door directionality &amp; implicit room transitions, manages time-bounded emergency access escalations,
          and enables one-click normal or forced check-out which immediately deauthorizes terminal permissions
          via HikCentral <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">POST /artemis/api/visitor/v1/visitor/out</code>.
        </p>
      </div>

      <ActiveMonitoringClient
        facilities={facilities}
        initialVisits={initialVisits}
        doors={doors}
      />
    </main>
  );
}
