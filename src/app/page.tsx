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

