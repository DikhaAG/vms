"use client";

import { useId, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  DEFAULT_SYSTEM_SETTINGS,
  VISIT_REASON_LABELS,
  VISIT_REASON_TYPES,
  preRegistrationInputSchema,
  type CertificateType,
  type CredentialSyncStatus,
  type PreRegistrationInput,
  type PreRegistrationResult,
  type Visit,
  type VisitReasonType,
} from "@/lib/vms/vms-contract";
import {
  TIME_SCHEDULE_LABELS,
  type AccessLevel,
} from "@/lib/vms/access-level-contract";
import {
  UiBadge,
  UiButton,
  UiCard,
  UiFormField,
  UiTextInput,
  UiSelect,
} from "@/components/vms/ui";
import { idDict } from "@/lib/vms/i18n/id";
import { PreRegistrationPhotoCapture } from "./pre-registration-photo-capture";
import { PreRegistrationResultCard } from "./pre-registration-result-card";
import { PreRegistrationInviteCard } from "./pre-registration-invite-card";

interface PreRegistrationFormProps {
  systemTimezone?: string;
  initialAccessLevels?: AccessLevel[];
}

function getTomorrowDateInTimezone(timeZone: string): string {
  const tomorrowMs = Date.now() + 24 * 60 * 60 * 1000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tomorrowMs));
}

export function PreRegistrationForm({
  systemTimezone,
  initialAccessLevels = [],
}: PreRegistrationFormProps) {
  const formId = useId();
  const effectiveTimezone =
    systemTimezone ?? DEFAULT_SYSTEM_SETTINGS.timezone;

  // Tomorrow 10:00 - 12:00 default schedule in canonical system timezone
  const tomorrowDateStr = getTomorrowDateInTimezone(effectiveTimezone);

  const defaultAccessLevelIds = (() => {
    const defaults = initialAccessLevels.filter((al) => al.isDefault);
    return defaults.length > 0
      ? defaults.map((d) => d.id)
      : initialAccessLevels.slice(0, 1).map((d) => d.id);
  })();

  const accessLevels = initialAccessLevels;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PreRegistrationInput>({
    resolver: zodResolver(preRegistrationInputSchema),
    defaultValues: {
      hostId: "emp-host-01",
      hostName: "Budi Santoso",
      visitorGivenName: "Rian",
      visitorFamilyName: "Pratama",
      visitorPhone: "+628123456789",
      visitorEmail: "rian.pratama@example.com",
      certificateType: 111,
      certificateNo: "3171012345670001",
      visitReasonType: 0,
      visitReasonDetail: "",
      scheduledStartTime: `${tomorrowDateStr}T10:00`,
      scheduledEndTime: `${tomorrowDateStr}T12:00`,
      facePhoto: "",
      accessLevelIds: defaultAccessLevelIds,
      tapQuota: {
        mode: "unlimited",
        maxTaps: 2,
      },
    },
    mode: "onBlur",
  });

  const watchVisitReasonType = useWatch({ control, name: "visitReasonType" });

  // Result & Sync States
  const [createdVisit, setCreatedVisit] = useState<Visit | null>(null);
  const [credentialSyncStatus, setCredentialSyncStatus] =
    useState<CredentialSyncStatus>("Unknown");
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [retrySyncMessage, setRetrySyncMessage] = useState<string | null>(null);

  // Returning Visitor Lookup State
  const [isLookingUpVisitor, setIsLookingUpVisitor] = useState(false);
  const [returningVisitorProfile, setReturningVisitorProfile] = useState<{
    givenName?: string;
    familyName?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    certificateType?: number;
    certificateNo?: string;
    facePhoto?: string;
  } | null>(null);

  async function checkReturningVisitor(cert?: string) {
    const trimmed = (cert ?? "").trim();
    if (!trimmed) {
      setReturningVisitorProfile(null);
      return;
    }
    setIsLookingUpVisitor(true);
    try {
      const res = await fetch(
        `/api/vms/visitors/lookup?certificateNo=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (data.ok && data.found && data.profile) {
        setReturningVisitorProfile(data.profile);
      } else {
        setReturningVisitorProfile(null);
      }
    } catch {
      setReturningVisitorProfile(null);
    } finally {
      setIsLookingUpVisitor(false);
    }
  }

  function applyReturningProfile(
    profile: NonNullable<typeof returningVisitorProfile>,
  ) {
    if (profile.givenName)
      setValue("visitorGivenName", profile.givenName, { shouldValidate: true });
    if (profile.familyName)
      setValue("visitorFamilyName", profile.familyName, {
        shouldValidate: true,
      });
    if (profile.phone)
      setValue("visitorPhone", profile.phone, { shouldValidate: true });
    if (profile.email)
      setValue("visitorEmail", profile.email, { shouldValidate: true });
    if (
      profile.certificateType &&
      [111, 414, 335, 222].includes(profile.certificateType)
    ) {
      setValue("certificateType", profile.certificateType as CertificateType, {
        shouldValidate: true,
      });
    }
    if (profile.facePhoto) {
      setValue("facePhoto", profile.facePhoto, { shouldValidate: true });
    }
    toast.success(idDict.pages.preRegistration.toasts.profileApplied);
  }

  // Invitation Link State
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(
    null,
  );
  const [copiedInvite, setCopiedInvite] = useState(false);

  async function handleRetrySync() {
    if (!createdVisit?.hikCentral?.visitorId) return;

    setIsRetryingSync(true);
    setRetrySyncMessage(null);

    try {
      const response = await fetch("/api/vms/credentials/retry-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: createdVisit.hikCentral.visitorId,
        }),
      });

      const json = await response.json();
      if (json.ok) {
        setCredentialSyncStatus(json.syncStatus as CredentialSyncStatus);
        setRetrySyncMessage(json.message);
        toast.success(
          json.message ?? idDict.pages.preRegistration.toasts.syncSuccess,
        );
      } else {
        const msg =
          json.error ?? idDict.pages.preRegistration.toasts.syncError;
        setRetrySyncMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat sinkronisasi ulang.";
      setRetrySyncMessage(msg);
      toast.error(msg);
    } finally {
      setIsRetryingSync(false);
    }
  }

  async function handleGenerateInviteLink() {
    setIsGeneratingInvite(true);
    setGeneratedInviteUrl(null);

    try {
      const currentValues = getValues();
      const payload = {
        hostId: currentValues.hostId?.trim() || undefined,
        hostName: currentValues.hostName?.trim() || undefined,
        visitReasonType: currentValues.visitReasonType,
        visitReasonDetail: currentValues.visitReasonDetail?.trim() || undefined,
        scheduledStartTime: currentValues.scheduledStartTime,
        scheduledEndTime: currentValues.scheduledEndTime,
        visitorFamilyName: currentValues.visitorFamilyName?.trim() || undefined,
        visitorGivenName: currentValues.visitorGivenName?.trim() || undefined,
        visitorPhone: currentValues.visitorPhone?.trim() || undefined,
        visitorEmail: currentValues.visitorEmail?.trim() || undefined,
      };

      const res = await fetch("/api/vms/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        const errorMsg =
          data.error?.message ??
          idDict.pages.preRegistration.toasts.inviteError;
        toast.error(errorMsg);
        return;
      }

      setGeneratedInviteUrl(data.inviteUrl);
      toast.success(idDict.pages.preRegistration.toasts.inviteSuccess);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat membuat tautan pendaftaran.",
      );
    } finally {
      setIsGeneratingInvite(false);
    }
  }

  function handleCopyInviteLink() {
    if (!generatedInviteUrl) return;
    const fullUrl = `${window.location.origin}${generatedInviteUrl}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
    toast.success(idDict.common.copied);
  }

  // Submission handler
  async function onSubmit(payload: PreRegistrationInput) {
    try {
      const response = await fetch("/api/vms/pre-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: PreRegistrationResult = await response.json();

      if (!response.ok || !data.ok || !data.visit) {
        const errorMsg =
          data.error?.message ??
          idDict.pages.preRegistration.toasts.error;
        toast.error(errorMsg);
        return;
      }

      setCreatedVisit(data.visit);
      setCredentialSyncStatus(data.visit.credentialSyncStatus ?? "Applied");
      toast.success(idDict.pages.preRegistration.toasts.success);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat memproses pendaftaran.",
      );
    }
  }

  function onInvalid() {
    toast.error(idDict.errors.validation);
  }

  return (
    <div className="space-y-8">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="space-y-8 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-xs"
      >
        {/* Section 1: Visitor Details */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-[var(--ks-ink)]">
            1. Data Identitas Tamu
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <UiFormField
              label="Nama Depan"
              required
              error={errors.visitorGivenName?.message}
            >
              <UiTextInput
                placeholder="Nama Depan Tamu"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                {...register("visitorGivenName")}
              />
            </UiFormField>

            <UiFormField
              label="Nama Belakang / Marga"
              required
              error={errors.visitorFamilyName?.message}
            >
              <UiTextInput
                placeholder="Nama Belakang Tamu"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                {...register("visitorFamilyName")}
              />
            </UiFormField>

            <UiFormField
              label="Nomor Telepon / WhatsApp"
              description="Contoh: +628123456789"
              error={errors.visitorPhone?.message}
            >
              <UiTextInput
                type="tel"
                placeholder="+628123456789"
                {...register("visitorPhone")}
              />
            </UiFormField>

            <UiFormField
              label="Alamat Email Tamu"
              error={errors.visitorEmail?.message}
            >
              <UiTextInput
                type="email"
                placeholder="rian.pratama@example.com"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                {...register("visitorEmail")}
              />
            </UiFormField>

            <UiFormField
              label="Jenis Tanda Pengenal"
              error={errors.certificateType?.message}
            >
              <UiSelect
                options={CERTIFICATE_TYPES.map((type) => ({
                  value: type,
                  label:
                    idDict.certificateTypes[type] ??
                    CERTIFICATE_TYPE_LABELS[type],
                }))}
                {...register("certificateType", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              />
            </UiFormField>

            <UiFormField
              label="Nomor Identitas (NIK KTP / No. Paspor)"
              error={errors.certificateNo?.message}
            >
              <div className="relative">
                <UiTextInput
                  placeholder="3171..."
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  {...register("certificateNo", {
                    onBlur: (e) => checkReturningVisitor(e.target.value),
                  })}
                />
                {isLookingUpVisitor && (
                  <span className="absolute right-2.5 top-2.5 text-xs text-[var(--ks-muted)]">
                    Mencari data...
                  </span>
                )}
              </div>
            </UiFormField>
          </div>

          {returningVisitorProfile && (
            <UiCard className="mt-3 border-[var(--ks-kinpaku)]/40 bg-[var(--ks-kinpaku)]/10 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {returningVisitorProfile.facePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={returningVisitorProfile.facePhoto}
                    alt="Foto Wajah Tersimpan"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover border border-[var(--ks-kinpaku)]/40"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ks-kinpaku)]/20 text-xs font-bold text-[var(--ks-ink)]">
                    {returningVisitorProfile.givenName?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-[var(--ks-ink)]">
                    Tamu Pernah Berkunjung Ditemukan!
                  </p>
                  <p className="text-[11px] text-[var(--ks-text)]">
                    {returningVisitorProfile.fullName ||
                      `${returningVisitorProfile.givenName} ${returningVisitorProfile.familyName}`}{" "}
                    &bull; Profil tersimpan & foto biometrik wajah terenkripsi siap digunakan
                  </p>
                </div>
              </div>
              <UiButton
                type="button"
                size="sm"
                variant="primary"
                onClick={() => applyReturningProfile(returningVisitorProfile)}
              >
                Isi Otomatis Data & Foto
              </UiButton>
            </UiCard>
          )}
        </fieldset>

        {/* Section 2: Biometric Face Photo Capture & Verification */}
        <Controller
          name="facePhoto"
          control={control}
          render={({ field }) => (
            <PreRegistrationPhotoCapture
              value={field.value ?? ""}
              onChange={field.onChange}
              formId={formId}
            />
          )}
        />

        {/* Section 3: Visit Schedule & Reason */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <legend className="text-sm font-semibold text-[var(--ks-ink)]">
            3. Jadwal Kunjungan & Keperluan
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <UiFormField
              label={
                <span>
                  Waktu Mulai Kunjungan (
                  <span className="font-semibold text-[var(--ks-ink)]">
                    {effectiveTimezone}
                  </span>
                  )
                </span>
              }
              required
              error={errors.scheduledStartTime?.message}
            >
              <UiTextInput
                type="datetime-local"
                {...register("scheduledStartTime")}
              />
            </UiFormField>

            <UiFormField
              label={
                <span>
                  Waktu Selesai Kunjungan (
                  <span className="font-semibold text-[var(--ks-ink)]">
                    {effectiveTimezone}
                  </span>
                  )
                </span>
              }
              required
              error={errors.scheduledEndTime?.message}
            >
              <UiTextInput
                type="datetime-local"
                {...register("scheduledEndTime")}
              />
            </UiFormField>

            <UiFormField
              label="Keperluan Kunjungan"
              required
              error={errors.visitReasonType?.message}
            >
              <UiSelect
                options={VISIT_REASON_TYPES.map((type) => ({
                  value: type,
                  label:
                    idDict.visitReasons[type] ?? VISIT_REASON_LABELS[type],
                }))}
                {...register("visitReasonType", {
                  setValueAs: (v) => Number(v) as VisitReasonType,
                })}
              />
            </UiFormField>

            <UiFormField
              label="Rincian Keperluan"
              badge={
                watchVisitReasonType === 4 ? undefined : (
                  <span className="text-[10px] text-[var(--ks-muted)]">
                    Opsional
                  </span>
                )
              }
              required={watchVisitReasonType === 4}
              error={errors.visitReasonDetail?.message}
            >
              <UiTextInput
                placeholder={
                  watchVisitReasonType === 4
                    ? "Wajib diisi untuk keperluan 'Lainnya'..."
                    : "cth. Pertemuan kerja sama bisnis vendor Q4"
                }
                {...register("visitReasonDetail")}
              />
            </UiFormField>
          </div>
        </fieldset>

        {/* Section 4: Internal Host Sponsorship */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <legend className="text-sm font-semibold text-[var(--ks-ink)]">
            4. Karyawan Tuan Rumah Internal
          </legend>
          <p className="text-xs text-[var(--ks-muted)]">
            Karyawan internal penanggung jawab yang mengundang atau menerima kedatangan tamu.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <UiFormField
              label="Nama Karyawan Tuan Rumah"
              error={errors.hostName?.message}
            >
              <UiTextInput
                placeholder="Nama Karyawan Tuan Rumah"
                {...register("hostName")}
              />
            </UiFormField>

            <UiFormField
              label="ID Karyawan Tuan Rumah"
              error={errors.hostId?.message}
            >
              <UiTextInput
                placeholder="emp-host-01"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                {...register("hostId")}
              />
            </UiFormField>
          </div>
        </fieldset>

        {/* Section 5: Dynamic Access Levels & Tap Quota */}
        <fieldset className="space-y-4 border-t border-[var(--ks-rule-subtle)] pt-6">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-semibold text-[var(--ks-ink)]">
              5. Kelompok Hak Akses Pintu & Batas Tap
            </legend>
            <UiBadge variant="normal" showDot={false}>
              Keamanan Terpadu
            </UiBadge>
          </div>
          <p className="text-xs text-[var(--ks-muted)]">
            Pilih area akses pintu fisik untuk kunjungan ini dan atur batas tap pintu putar.
          </p>

          <div className="space-y-3">
            <span className="block text-xs font-medium text-[var(--ks-text)]">
              Kelompok Hak Akses Tersedia
            </span>

            <Controller
              name="accessLevelIds"
              control={control}
              render={({ field }) => {
                const currentIds = field.value ?? [];

                if (accessLevels.length === 0) {
                  return (
                    <p className="text-xs text-[var(--ks-muted)] italic">
                      Belum ada kelompok hak akses khusus yang tersedia. Tamu akan menggunakan akses lobi standar.
                    </p>
                  );
                }

                return (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {accessLevels.map((lvl) => {
                      const isChecked = currentIds.includes(lvl.id);
                      return (
                        <label
                          key={lvl.id}
                          htmlFor={`access-level-${lvl.id}`}
                          className="block cursor-pointer"
                        >
                          <span className="sr-only">{lvl.name}</span>
                          <UiCard
                            className={`p-3 text-xs transition-colors flex items-start gap-3 ${isChecked
                              ? "border-[var(--ks-ink)] bg-[var(--ks-paper)] ring-1 ring-[var(--ks-ink)]"
                              : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:border-[var(--ks-edge)]"
                              }`}
                          >
                            <input
                              id={`access-level-${lvl.id}`}
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...currentIds, lvl.id]);
                                } else {
                                  field.onChange(
                                    currentIds.filter((id) => id !== lvl.id),
                                  );
                                }
                              }}
                              className="mt-0.5 h-4 w-4 rounded-[var(--ks-radius-sm)] accent-[var(--ks-ink)]"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[var(--ks-ink)]">
                                  {lvl.name}
                                </span>
                                {lvl.isDefault ? (
                                  <UiBadge variant="normal" showDot={false}>
                                    Standar
                                  </UiBadge>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-[var(--ks-muted)] line-clamp-1">
                                {lvl.description || "Hak akses fisik pintu"}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-1.5 py-0.5 text-[10px] text-[var(--ks-muted)]">
                                  {idDict.timeSchedules[lvl.timeScheduleId] ??
                                    TIME_SCHEDULE_LABELS[lvl.timeScheduleId] ??
                                    `Jadwal ${lvl.timeScheduleId}`}
                                </span>
                                <span className="rounded-[var(--ks-radius-sm)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-deep)] px-1.5 py-0.5 text-[10px] text-[var(--ks-muted)] font-mono">
                                  {lvl.doors.length} pintu
                                </span>
                              </div>
                            </div>
                          </UiCard>
                        </label>
                      );
                    })}
                  </div>
                );
              }}
            />
          </div>

          {/* Tap Quota Selection */}
          <Controller
            name="tapQuota"
            control={control}
            render={({ field }) => {
              const currentMode = field.value?.mode ?? "unlimited";
              const maxTapsValue = field.value?.maxTaps ?? 2;

              return (
                <UiCard className="mt-4 p-4 bg-[var(--ks-paper)]">
                  <span className="block text-xs font-semibold text-[var(--ks-ink)]">
                    Batas Buka Pintu / Kuota Tap Pintu Putar
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--ks-muted)]">
                    Batasi frekuensi buka pintu putar atau pintu akses fisik untuk tiket QR yang diterbitkan.
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label
                      htmlFor="tap-quota-unlimited"
                      className="block cursor-pointer"
                    >
                      <span className="sr-only">
                        {idDict.tapQuotaModes.unlimited.label}
                      </span>
                      <UiCard
                        className={`flex items-start gap-2.5 p-3 text-xs transition-colors ${currentMode === "unlimited"
                          ? "border-[var(--ks-ink)] bg-[var(--ks-paper-raised)] ring-1 ring-[var(--ks-ink)]"
                          : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:border-[var(--ks-edge)]"
                          }`}
                      >
                        <input
                          id="tap-quota-unlimited"
                          type="radio"
                          name="tap-quota-mode"
                          value="unlimited"
                          checked={currentMode === "unlimited"}
                          onChange={() =>
                            field.onChange({
                              mode: "unlimited",
                              maxTaps: undefined,
                            })
                          }
                          className="mt-0.5 h-4 w-4 accent-[var(--ks-ink)]"
                        />
                        <div>
                          <span className="font-semibold text-[var(--ks-ink)]">
                            {idDict.tapQuotaModes.unlimited.label}
                          </span>
                          <p className="mt-0.5 text-[var(--ks-muted)]">
                            {idDict.tapQuotaModes.unlimited.description}
                          </p>
                        </div>
                      </UiCard>
                    </label>

                    <label
                      htmlFor="tap-quota-limited"
                      className="block cursor-pointer"
                    >
                      <span className="sr-only">
                        {idDict.tapQuotaModes.limited.label}
                      </span>
                      <UiCard
                        className={`flex items-start gap-2.5 p-3 text-xs transition-colors ${currentMode === "limited"
                          ? "border-[var(--ks-ink)] bg-[var(--ks-paper-raised)] ring-1 ring-[var(--ks-ink)]"
                          : "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] hover:border-[var(--ks-edge)]"
                          }`}
                      >
                        <input
                          id="tap-quota-limited"
                          type="radio"
                          name="tap-quota-mode"
                          value="limited"
                          checked={currentMode === "limited"}
                          onChange={() =>
                            field.onChange({
                              mode: "limited",
                              maxTaps: maxTapsValue,
                            })
                          }
                          className="mt-0.5 h-4 w-4 accent-[var(--ks-ink)]"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-[var(--ks-ink)]">
                            {idDict.tapQuotaModes.limited.label}
                          </span>
                          <p className="mt-0.5 text-[var(--ks-muted)]">
                            {idDict.tapQuotaModes.limited.description}
                          </p>
                          {currentMode === "limited" ? (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                id="tap-quota-max-taps"
                                aria-label="Jumlah batas buka pintu"
                                type="number"
                                min={1}
                                max={1000}
                                value={maxTapsValue}
                                onChange={(e) =>
                                  field.onChange({
                                    mode: "limited",
                                    maxTaps: Math.max(
                                      1,
                                      Math.min(1000, Number(e.target.value)),
                                    ),
                                  })
                                }
                                className="w-24 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper)] px-2 py-1 text-xs font-semibold text-[var(--ks-ink)] shadow-xs focus:border-[var(--ks-edge)] focus:outline-hidden"
                              />
                              <span className="text-xs text-[var(--ks-muted)]">
                                kali masuk
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </UiCard>
                    </label>
                  </div>
                </UiCard>
              );
            }}
          />
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ks-rule-subtle)] pt-4">
          <p className="text-xs text-[var(--ks-muted)]">
            Status awal kunjungan akan ditetapkan sebagai{" "}
            <span className="font-semibold text-[var(--ks-ink)]">
              MENUNGGU PERSETUJUAN
            </span>{" "}
            (atau{" "}
            <span className="font-semibold text-[var(--ks-ink)]">DRAFT</span>{" "}
            untuk tautan undangan mandiri).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <UiButton
              type="button"
              variant="secondary"
              size="md"
              onClick={handleGenerateInviteLink}
              disabled={isGeneratingInvite || isSubmitting}
            >
              {isGeneratingInvite
                ? "Membuat Tautan..."
                : "Buat Tautan Pendaftaran Mandiri"}
            </UiButton>
            <UiButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Mengirim Janji Temu..."
                : "Kirim Janji Temu Tamu"}
            </UiButton>
          </div>
        </div>
      </form>

      {/* Generated Invitation Link Card */}
      {generatedInviteUrl ? (
        <PreRegistrationInviteCard
          inviteUrl={generatedInviteUrl}
          copied={copiedInvite}
          onCopy={handleCopyInviteLink}
        />
      ) : null}

      {/* Result Display Card */}
      {createdVisit ? (
        <PreRegistrationResultCard
          visit={createdVisit}
          accessLevels={accessLevels}
          systemTimezone={effectiveTimezone}
          credentialSyncStatus={credentialSyncStatus}
          isRetryingSync={isRetryingSync}
          retrySyncMessage={retrySyncMessage}
          onRetrySync={handleRetrySync}
        />
      ) : null}
    </div>
  );
}