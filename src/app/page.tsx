import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
        VMS
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        HikCentral Professional OpenAPI V3.1.1 foundation workspace.
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Host Pre-Registration
          </h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Ticket 01 & 02
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Multi-facility host pre-registration with IANA timezone translations,
          UTC normalization, biometric face normalization, and HikCentral OpenAPI appointment reservation.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/vms/pre-registration"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Open Host Pre-Registration &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Public Self-Registration Portal
          </h2>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            Ticket 03
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Single-use, expiring visitor invitation links (`/invite/[token]`). External
          guests complete identity details, capture a compliant selfie with real-time 10–100 KB
          normalization, and receive their digital QR access pass.
        </p>
        <div className="mt-4">
          <Link
            href="/vms/pre-registration"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Generate Invite Link in Host Portal &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-neutral-900">Prototypes</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Verify foundation signing and HTTP client wiring before building
          domain modules.
        </p>
        <div className="mt-4">
          <Link
            href="/prototype/version-check"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Open Version Connection Test &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}

