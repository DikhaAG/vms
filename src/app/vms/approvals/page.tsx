import Link from "next/link";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { listPendingApprovals } from "@/lib/vms/approval-service";
import { ApprovalsClient } from "./approvals-client";

export const metadata = {
  title: "Approval Workflow & Blacklist Screening | VMS",
  description:
    "Review pending visitor authorizations, inspect biometric photos, and investigate monitoring list security escalations.",
};

export default async function ApprovalsPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const initialData = await listPendingApprovals();

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
            Approval Workflow & Security Screening
          </h1>
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            Ticket 04
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
          Review and authorize pending visits before credentials arm physical access terminals.
          Screen visitor identity numbers against HikCentral Monitoring Lists (Blacklists) to
          intercept and escalate prohibited individuals for security officer review.
        </p>
      </div>

      <ApprovalsClient
        facilities={facilities}
        initialPendingVisits={initialData.pendingVisits}
        initialEscalatedVisits={initialData.escalatedVisits}
      />
    </main>
  );
}
