import Link from "next/link";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { VisitorsClient } from "./visitors-client";

export const metadata = {
  title: "Visitor Profiles & Privacy Directory | VMS",
  description:
    "Manage indefinite biometric face retention, returning visitor auto-fill profiles, and PDP soft-delete compliance.",
};

export default async function VisitorsPage() {
  const initialProfiles = await defaultVmsRepository.listVisitorProfiles({
    includeDeleted: true,
  });

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
            Visitor Profiles & Privacy Directory
          </h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            PDP & Biometrics
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600 max-w-3xl">
          Per ADR 0004, visitor identity details and encrypted biometric photos
          are retained indefinitely in the application database to power instant
          recognition and 1-click pre-registration for returning visitors. Data
          Protection Officers and Administrators can soft-delete profiles upon
          request for Personal Data Protection (PDP) compliance without
          compromising historical audit logs.
        </p>
      </div>

      <VisitorsClient initialProfiles={initialProfiles} />
    </main>
  );
}
