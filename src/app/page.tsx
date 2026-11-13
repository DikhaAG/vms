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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Approval Workflow & Security Screening
          </h2>
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            Ticket 04
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Review pending visitor requests across facilities, inspect biometric photos and identity numbers,
          and screen against HikCentral Monitoring Lists (Blacklists) with security officer escalation queues.
        </p>
        <div className="mt-4">
          <Link
            href="/vms/approvals"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Open Approvals & Screening Dashboard &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Dynamic Access Level Management
          </h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Ticket 05
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Security Administrator interface to bundle physical turnstiles, elevator floors, and time schedule templates
          into reusable Access Levels, and configure precise door tap quotas.
        </p>
        <div className="mt-4">
          <Link
            href="/vms/access-levels"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Manage Dynamic Access Levels &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Front-Desk Reception & Fast Check-in
          </h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Ticket 06
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Receptionist lookup engine with instant visitor search, photo verification modal,
          one-click check-in via HikCentral registerment, unscheduled walk-in guest registration,
          and live controller synchronization tracking.
        </p>
        <div className="mt-4">
          <Link
            href="/vms/reception"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Open Front-Desk Reception &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Active Attendance & Security Monitor
          </h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Ticket 07
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Live on-premise attendance monitor, door tap quota enforcement with automated revocation,
          facility overstay grace period alerts, and single-click normal or forced check-out via HikCentral.
        </p>
        <div className="mt-4">
          <Link
            href="/vms/active-monitoring"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            Open Active Attendance Monitor &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Multi-Visitor Group Visits
          </h2>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            Ticket 08
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Register client teams and vendor delegations under unified HikCentral visitor groups.
          Features dynamic multi-guest input, automatic returning visitor recognition, and instant credential QR pass generation.
        </p>
        <div className="mt-4">
          <Link
            href="/vms/group-registration"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Open Group Visit Registration &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Visitor Profiles & Biometric Soft-Delete Directory
          </h2>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            Ticket 08 & ADR 0004
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Search and manage retained visitor profiles and encrypted face photos.
          Enables one-click returning visitor auto-fill, lifetime visit tracking, and PDP soft-delete compliance.
        </p>
        <div className="mt-4">
          <Link
            href="/vms/visitors"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Open Visitor Profiles Directory &rarr;
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

