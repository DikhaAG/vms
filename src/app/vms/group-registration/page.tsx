import Link from "next/link";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { GroupRegistrationClient } from "./group-registration-client";

export const metadata = {
  title: "Group Visit Registration | VMS",
  description:
    "Schedule multi-visitor delegation bookings under unified HikCentral visitor groups with returning visitor auto-fill.",
};

export default async function GroupRegistrationPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const allAccessLevels = await defaultVmsRepository.listAccessLevels();

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
            Multi-Visitor Group Visits
          </h1>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            Ticket 08
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
          Register client teams, vendor delegations, or contractor groups in a
          single unified booking. Orchestrates individual visitor appointments to
          HikCentral under a shared <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs text-neutral-800 font-mono">visitorGroupName</code>,
          with instant returning visitor recognition, profile auto-fill, and
          biometric face credential reuse.
        </p>
      </div>

      <GroupRegistrationClient
        facilities={facilities}
        allAccessLevels={allAccessLevels}
      />
    </main>
  );
}
