import Link from "next/link";
import { getPublicInvitationMetadata } from "@/lib/vms/invitation-service";
import { InviteForm } from "./invite-form";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict } from "@/lib/vms/i18n/id";
import type { VisitReasonType } from "@/lib/vms/vms-contract";

export const metadata = {
  title: "Pendaftaran Mandiri Tamu | VMS",
  description:
    "Portal pendaftaran mandiri tamu undangan dengan verifikasi foto biometrik wajah dan penerbitan tiket QR akses pintu.",
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
        <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xs">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              isConsumed
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                : isExpired
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isConsumed ? "✓" : isExpired ? "⏳" : "✕"}
          </div>

          <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-950 dark:text-white sm:text-2xl">
            {isConsumed
              ? "Pendaftaran Sudah Selesai"
              : isExpired
                ? "Tautan Undangan Kedaluwarsa"
                : "Tautan Undangan Tidak Ditemukan"}
          </h1>

          <p className="mt-2 text-sm text-neutral-600 dark:text-slate-400">
            {isConsumed
              ? "Tautan pendaftaran mandiri ini telah digunakan sebelumnya. Jika Anda telah menyelesaikan pendaftaran, tiket akses kunjungan Anda telah aktif di sistem pintu kontrol gedung."
              : isExpired
                ? "Tautan undangan ini telah melewati batas waktu masa berlaku jadwal kunjungan. Silakan hubungi karyawan tuan rumah yang mengundang Anda untuk meminta tautan undangan baru."
                : "Kode token undangan tidak valid atau tidak terdaftar di sistem. Silakan periksa kembali tautan yang Anda buka atau hubungi pihak pengundang."}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 dark:bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 dark:hover:bg-blue-700"
            >
              Kembali ke Halaman Awal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const data = result.data;
  const reasonText =
    (data.visitReasonType !== undefined
      ? idDict.visitReasons[data.visitReasonType as VisitReasonType]
      : null) ?? data.visitReasonLabel;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Portal Header */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
            <span>Tiket Akses Tamu</span>
            <span>•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Pendaftaran Mandiri</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
            Pendaftaran Mandiri Tamu
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-slate-400">
            Lengkapi data diri dan foto wajah Anda untuk mendapatkan akses gerbang otomatis tanpa antre di resepsionis.
          </p>
        </div>

        <div>
          <PageGuideModal pageKey="publicInvite" />
        </div>
      </header>

      {/* Invitation Details Card */}
      <section className="mb-8 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
          Rincian Jadwal Kunjungan
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-neutral-500 dark:text-slate-400">Gedung / Lokasi</span>
            <p className="font-semibold text-neutral-900 dark:text-white">
              {data.facility.name}
            </p>
            {data.facility.address && (
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-slate-400">
                {data.facility.address}
              </p>
            )}
          </div>

          <div>
            <span className="text-xs text-neutral-500 dark:text-slate-400">Karyawan Tuan Rumah</span>
            <p className="font-semibold text-neutral-900 dark:text-white">
              {data.host?.name ?? "Tuan Rumah Internal"}
            </p>
          </div>

          <div>
            <span className="text-xs text-neutral-500 dark:text-slate-400">Keperluan Kunjungan</span>
            <p className="font-medium text-neutral-800 dark:text-slate-200">
              {reasonText}
              {data.visitReasonDetail ? ` — ${data.visitReasonDetail}` : ""}
            </p>
          </div>

          <div>
            <span className="text-xs text-neutral-500 dark:text-slate-400">
              Waktu Kunjungan ({data.facility.timezone})
            </span>
            <p className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">
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
