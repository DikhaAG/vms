import Link from "next/link";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { PreRegistrationForm } from "./pre-registration-form";

export const metadata = {
  title: "Host Pre-Registration | VMS",
  description:
    "Pre-register visitors across multi-facility IANA timezones with HikCentral OpenAPI synchronization.",
};

export default async function PreRegistrationPage() {
  const facilities = await defaultVmsRepository.listFacilities();
  const accessLevels = await defaultVmsRepository.listAccessLevels();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="mb-6">
        <Link
          href="/"
          className="text-xs font-medium text-neutral-600 transition hover:text-neutral-900"
        >
          &larr; Back to Home
        </Link>
      </nav>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            Host Pre-Registration
          </h1>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            Tracer Bullet
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Schedule upcoming visitor appointments bound to canonical facility
          IANA timezones. Timestamps are persisted in UTC and automatically
          translated to localized ISO 8601 offset strings for HikCentral OpenAPI
          execution.
        </p>
      </div>

      <PreRegistrationForm
        initialFacilities={facilities}
        initialAccessLevels={accessLevels}
      />
    </main>
  );
}
