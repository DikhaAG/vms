import Link from "next/link";
import { VersionCheckForm } from "./version-check-form";

export const metadata = {
  title: "HikCentral Version Check Prototype | VMS",
  description:
    "Verify HikCentral OpenAPI V3.1.1 HMAC-SHA256 authentication and connectivity via POST /artemis/api/common/v1/version.",
};

export default function VersionCheckPrototypePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          &larr; Back to VMS home
        </Link>
      </nav>

      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Prototype &middot; Ticket 03
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
          HikCentral Version Connectivity Check
        </h1>
        <p className="text-sm text-neutral-600">
          Triggers a server-side{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-800">
            POST /artemis/api/common/v1/version
          </code>{" "}
          call (Chapter 5.1.1) using signed Artemis headers or the local stub
          simulator.
        </p>
      </header>

      <VersionCheckForm />
    </main>
  );
}

