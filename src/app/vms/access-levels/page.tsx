import Link from "next/link";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { AccessLevelsClient } from "./access-levels-client";

export const metadata = {
  title: "Dynamic Access Level Management | VMS",
  description:
    "Configure physical door and elevator floor bundles, time schedule templates, and tap quotas for visitor access control.",
};

export default async function AccessLevelsPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const accessLevels = await defaultVmsRepository.listAccessLevels();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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
            Dynamic Access Level Management
          </h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Ticket 05
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
          Security Administrator portal for managing dynamic Access Levels (Privilege Groups).
          Bundle physical doors, turnstiles, elevator floors, and time schedule templates.
          Assign access levels and configure tap quotas when scheduling visits to enforce least-privilege physical security.
        </p>
      </div>

      <AccessLevelsClient
        facilities={facilities}
        initialAccessLevels={accessLevels}
      />
    </main>
  );
}
