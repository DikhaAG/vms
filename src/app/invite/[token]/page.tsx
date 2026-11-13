import Link from "next/link";
import { getPublicInvitationMetadata } from "@/lib/vms/invitation-service";
import { InviteForm } from "./invite-form";

export const metadata = {
  title: "Visitor Self-Registration | VMS",
  description:
    "External visitor self-registration portal with biometric face enrollment and digital QR pass issuance.",
};

export interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const result = await getPublicInvitationMetadata(token);

  if (!result.ok || !result.data) {
    const isConsumed = result.status === "consumed";
    const isExpired = result.status === "expired";

    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xs">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              isConsumed
                ? "bg-blue-100 text-blue-700"
                : isExpired
                  ? "bg-amber-100 text-amber-700"
                  : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {isConsumed ? "✓" : isExpired ? "⏳" : "✕"}
          </div>

          <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
            {isConsumed
              ? "Invitation Already Completed"
              : isExpired
                ? "Invitation Link Expired"
                : "Invitation Not Found"}
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            {isConsumed
              ? "This self-registration invitation link has already been used. If you have already completed your registration, your appointment pass is active in the facility access control system."
              : isExpired
                ? "This invitation link has expired because the visit scheduled time window has passed or the link exceeded its validity period. Please contact your host to issue a new invitation link."
                : "The invitation token in the link is invalid or does not exist. Please check the URL or request a new invitation link from your host."}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const data = result.data;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Portal Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          <span>Facility Visitor Pass</span>
          <span>•</span>
          <span className="text-emerald-700">Self-Registration</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
          Visitor Self-Registration
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Complete your visitor details and upload a photo for seamless turnstile
          access before your visit.
        </p>
      </header>

      {/* Invitation Details Card */}
      <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Visit Invitation Details
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-neutral-500">Facility</span>
            <p className="font-semibold text-neutral-900">
              {data.facility.name}
            </p>
            {data.facility.address && (
              <p className="mt-0.5 text-xs text-neutral-600">
                {data.facility.address}
              </p>
            )}
          </div>

          <div>
            <span className="text-xs text-neutral-500">Host Employee</span>
            <p className="font-semibold text-neutral-900">
              {data.host?.name ?? "Host Sponsor"}
            </p>
          </div>

          <div>
            <span className="text-xs text-neutral-500">Visit Purpose</span>
            <p className="font-medium text-neutral-800">
              {data.visitReasonLabel}
              {data.visitReasonDetail ? ` — ${data.visitReasonDetail}` : ""}
            </p>
          </div>

          <div>
            <span className="text-xs text-neutral-500">
              Scheduled Window ({data.facility.timezone})
            </span>
            <p className="font-mono text-xs font-semibold text-neutral-900">
              {data.scheduledStartTimeFacility.replace("T", " ")} —{" "}
              {data.scheduledEndTimeFacility.replace("T", " ")}
            </p>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <InviteForm token={token} initialData={data} />
    </main>
  );
}
