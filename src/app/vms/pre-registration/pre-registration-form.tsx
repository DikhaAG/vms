"use client";

import { useId, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  PRE_REGISTRATION_MODES,
  STUB_SCENARIOS,
  VISIT_REASON_LABELS,
  VISIT_REASON_TYPES,
  validatePreRegistrationInput,
  type CertificateType,
  type Facility,
  type PreRegistrationMode,
  type PreRegistrationResult,
  type StubScenario,
  type Visit,
  type VisitReasonType,
} from "@/lib/vms/vms-contract";

interface PreRegistrationFormProps {
  initialFacilities: Facility[];
}

export function PreRegistrationForm({
  initialFacilities,
}: PreRegistrationFormProps) {
  const formId = useId();

  // Facility Selection
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    initialFacilities[0]?.id ?? "fac-jakarta",
  );

  // Form Fields
  const [visitorFamilyName, setVisitorFamilyName] = useState("Pratama");
  const [visitorGivenName, setVisitorGivenName] = useState("Rian");
  const [visitorPhone, setVisitorPhone] = useState("+628123456789");
  const [visitorEmail, setVisitorEmail] = useState("rian.pratama@example.com");
  const [certificateType, setCertificateType] = useState<CertificateType>(111);
  const [certificateNo, setCertificateNo] = useState("3171012345670001");
  const [visitReasonType, setVisitReasonType] = useState<VisitReasonType>(0);
  const [visitReasonDetail, setVisitReasonDetail] = useState("");
  const [hostId, setHostId] = useState("emp-host-01");
  const [hostName, setHostName] = useState("Budi Santoso");

  // Scheduled Dates (defaulting to tomorrow 10:00 - 12:00)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);
  const [scheduledStartTime, setScheduledStartTime] = useState(
    `${tomorrowDateStr}T10:00`,
  );
  const [scheduledEndTime, setScheduledEndTime] = useState(
    `${tomorrowDateStr}T12:00`,
  );

  // Execution & Simulation Controls
  const [mode, setMode] = useState<PreRegistrationMode>("stub");
  const [stubScenario, setStubScenario] = useState<StubScenario>("success");

  // Status and Validation State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [createdVisit, setCreatedVisit] = useState<Visit | null>(null);

  const selectedFacility =
    initialFacilities.find((f) => f.id === selectedFacilityId) ??
    initialFacilities[0];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    const payload = {
      facilityId: selectedFacilityId,
      hostId: hostId.trim() || undefined,
      hostName: hostName.trim() || undefined,
      visitorFamilyName: visitorFamilyName.trim(),
      visitorGivenName: visitorGivenName.trim(),
      visitorPhone: visitorPhone.trim() || undefined,
      visitorEmail: visitorEmail.trim() || undefined,
      certificateType,
      certificateNo: certificateNo.trim() || undefined,
      visitReasonType,
      visitReasonDetail: visitReasonDetail.trim() || undefined,
      scheduledStartTime,
      scheduledEndTime,
      mode,
      ...(mode === "stub" ? { stubScenario } : {}),
    };

    const validation = validatePreRegistrationInput(payload);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/vms/pre-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: PreRegistrationResult = await response.json();
      if (result.ok && result.visit) {
        setCreatedVisit(result.visit);
      } else {
        if (result.error?.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        setGlobalError(
          result.error?.message ?? "Failed to create pre-registration.",
        );
      }
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Network error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs"
      >
        {/* Section 1: Facility Selection */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-neutral-900">
            1. Select Facility & Timezone
          </legend>
          <p className="text-xs text-neutral-600">
            Each physical site operates under its canonical IANA timezone.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {initialFacilities.map((fac) => {
              const checked = fac.id === selectedFacilityId;
              return (
                <label
                  key={fac.id}
                  htmlFor={`${formId}-fac-${fac.id}`}
                  className={`flex cursor-pointer flex-col justify-between rounded-lg border p-3.5 transition ${
                    checked
                      ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-900">
                        {fac.name}
                      </span>
                      <input
                        id={`${formId}-fac-${fac.id}`}
                        type="radio"
                        name="facility"
                        value={fac.id}
                        checked={checked}
                        onChange={() => setSelectedFacilityId(fac.id)}
                        className="h-4 w-4 text-neutral-900 focus:ring-neutral-900"
                      />
                    </div>
                    <span className="mt-1 inline-block rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800">
                      {fac.timezone}
                    </span>
                    {fac.address ? (
                      <p className="mt-2 text-[11px] text-neutral-500 line-clamp-2">
                        {fac.address}
                      </p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Section 2: Visitor Details */}
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className="text-sm font-semibold text-neutral-900">
            2. Visitor Identity Information
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-given-name`}
                className="block text-xs font-medium text-neutral-700"
              >
                Given Name / First Name *
              </label>
              <input
                id={`${formId}-given-name`}
                type="text"
                required
                value={visitorGivenName}
                onChange={(e) => setVisitorGivenName(e.target.value)}
                autoCorrect="off"
                spellCheck={false}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
              {fieldErrors.visitorGivenName ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.visitorGivenName}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-family-name`}
                className="block text-xs font-medium text-neutral-700"
              >
                Family Name / Last Name *
              </label>
              <input
                id={`${formId}-family-name`}
                type="text"
                required
                value={visitorFamilyName}
                onChange={(e) => setVisitorFamilyName(e.target.value)}
                autoCorrect="off"
                spellCheck={false}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
              {fieldErrors.visitorFamilyName ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.visitorFamilyName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-phone`}
                className="block text-xs font-medium text-neutral-700"
              >
                Phone Number
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+628123456789"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-email`}
                className="block text-xs font-medium text-neutral-700"
              >
                Email Address
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="visitor@company.com"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-cert-type`}
                className="block text-xs font-medium text-neutral-700"
              >
                Certificate / ID Type
              </label>
              <select
                id={`${formId}-cert-type`}
                value={certificateType}
                onChange={(e) =>
                  setCertificateType(Number(e.target.value) as CertificateType)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              >
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CERTIFICATE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-cert-no`}
                className="block text-xs font-medium text-neutral-700"
              >
                Certificate Number (e.g. NIK KTP / Passport No)
              </label>
              <input
                id={`${formId}-cert-no`}
                type="text"
                value={certificateNo}
                onChange={(e) => setCertificateNo(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="3171..."
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>
          </div>
        </fieldset>

        {/* Section 3: Visit Schedule & Reason */}
        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className="text-sm font-semibold text-neutral-900">
            3. Visit Schedule & Purpose
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-start-time`}
                className="block text-xs font-medium text-neutral-700"
              >
                Scheduled Start Time (
                <span className="font-semibold text-neutral-900">
                  {selectedFacility?.timezone}
                </span>
                ) *
              </label>
              <input
                id={`${formId}-start-time`}
                type="datetime-local"
                required
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
              {fieldErrors.scheduledStartTime ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.scheduledStartTime}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-end-time`}
                className="block text-xs font-medium text-neutral-700"
              >
                Scheduled End Time (
                <span className="font-semibold text-neutral-900">
                  {selectedFacility?.timezone}
                </span>
                ) *
              </label>
              <input
                id={`${formId}-end-time`}
                type="datetime-local"
                required
                value={scheduledEndTime}
                onChange={(e) => setScheduledEndTime(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
              {fieldErrors.scheduledEndTime ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.scheduledEndTime}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor={`${formId}-visit-reason`}
                className="block text-xs font-medium text-neutral-700"
              >
                Visit Purpose Type
              </label>
              <select
                id={`${formId}-visit-reason`}
                value={visitReasonType}
                onChange={(e) =>
                  setVisitReasonType(Number(e.target.value) as VisitReasonType)
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              >
                {VISIT_REASON_TYPES.map((reason) => (
                  <option key={reason} value={reason}>
                    {VISIT_REASON_LABELS[reason]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-host-id`}
                className="block text-xs font-medium text-neutral-700"
              >
                Host Employee ID
              </label>
              <input
                id={`${formId}-host-id`}
                type="text"
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="emp-host-01"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-host-name`}
                className="block text-xs font-medium text-neutral-700"
              >
                Host Name
              </label>
              <input
                id={`${formId}-host-name`}
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                autoCorrect="off"
                spellCheck={false}
                placeholder="Budi Santoso"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
            </div>
          </div>

          {visitReasonType === 4 ? (
            <div>
              <label
                htmlFor={`${formId}-visit-detail`}
                className="block text-xs font-medium text-neutral-700"
              >
                Specific Purpose Detail (Required for &apos;Others&apos;) *
              </label>
              <input
                id={`${formId}-visit-detail`}
                type="text"
                required
                value={visitReasonDetail}
                onChange={(e) => setVisitReasonDetail(e.target.value)}
                placeholder="e.g. Vendor server rack maintenance"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
              />
              {fieldErrors.visitReasonDetail ? (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.visitReasonDetail}
                </p>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        {/* Section 4: Execution Mode Controls */}
        <fieldset className="space-y-3 border-t border-neutral-100 pt-6">
          <legend className="text-sm font-semibold text-neutral-900">
            4. Execution & Testing Mode
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            {PRE_REGISTRATION_MODES.map((m) => {
              const checked = mode === m;
              return (
                <label
                  key={m}
                  htmlFor={`${formId}-mode-${m}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                    checked
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <input
                    id={`${formId}-mode-${m}`}
                    type="radio"
                    name="mode"
                    value={m}
                    checked={checked}
                    onChange={() => setMode(m)}
                    className="mt-0.5 h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div>
                    <span className="block text-sm font-medium text-neutral-900 capitalize">
                      {m} Mode
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-600">
                      {m === "stub"
                        ? "Deterministic offline responses without live HikCentral hardware."
                        : "Executes real signed HTTPS requests using server .env config."}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {mode === "stub" ? (
            <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3">
              <label
                htmlFor={`${formId}-stub-scenario`}
                className="block text-xs font-medium text-neutral-700"
              >
                Simulation Scenario
              </label>
              <select
                id={`${formId}-stub-scenario`}
                value={stubScenario}
                onChange={(e) => setStubScenario(e.target.value as StubScenario)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none"
              >
                {STUB_SCENARIOS.map((scen) => (
                  <option key={scen} value={scen}>
                    {scen === "success"
                      ? "Success — Returns appointment & visitor IDs with QR pass"
                      : scen === "auth-error"
                        ? "Auth Error — Simulates invalid Artemis signature (0x00072002)"
                        : "Network Error — Simulates socket timeout or connection refused"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </fieldset>

        {globalError ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"
          >
            <p className="font-semibold">Pre-Registration Failed</p>
            <p className="mt-1">{globalError}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-500">
            Initial status will be set to{" "}
            <span className="font-semibold text-neutral-800">
              PENDING_APPROVAL
            </span>
            .
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Dispatching Appointment..." : "Submit Pre-Registration"}
          </button>
        </div>
      </form>

      {/* Result Display Card */}
      {createdVisit ? (
        <section
          aria-label="Created Pre-Registration Details"
          className="rounded-xl border border-emerald-300 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                {createdVisit.status}
              </span>
              <h2 className="mt-2 text-lg font-bold text-neutral-950">
                Visit Scheduled Successfully
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-500">Internal Visit ID</span>
              <p className="font-mono text-xs font-semibold text-neutral-800">
                {createdVisit.id}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* Left 2 Cols: Details */}
            <div className="space-y-4 md:col-span-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Visitor Information
                </h3>
                <p className="mt-1 text-base font-semibold text-neutral-900">
                  {createdVisit.visitorGivenName} {createdVisit.visitorFamilyName}
                </p>
                <p className="text-xs text-neutral-600">
                  {createdVisit.visitorPhone || "No phone"} &bull;{" "}
                  {createdVisit.visitorEmail || "No email"}
                </p>
                {createdVisit.certificateNo ? (
                  <p className="mt-1 text-xs text-neutral-600">
                    ID:{" "}
                    <span className="font-mono">
                      {createdVisit.certificateNo}
                    </span>{" "}
                    (Type {createdVisit.certificateType})
                  </p>
                ) : null}
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Facility & Schedule
                </h3>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {createdVisit.facilityName}
                </p>
                <div className="mt-1 space-y-1 text-xs text-neutral-700">
                  <p>
                    <span className="font-medium text-neutral-500">
                      Facility Local Time:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeFacility} &rarr;{" "}
                      {createdVisit.scheduledEndTimeFacility}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-neutral-500">
                      UTC Normalized:
                    </span>{" "}
                    <span className="font-mono">
                      {createdVisit.scheduledStartTimeUtc} &rarr;{" "}
                      {createdVisit.scheduledEndTimeUtc}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  HikCentral OpenAPI Execution Details
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 font-mono text-xs">
                  <div>
                    <dt className="text-[11px] text-neutral-500">
                      appointRecordId
                    </dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hikCentral?.appointRecordId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500">visitorId</dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hikCentral?.visitorId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500">
                      appointCode
                    </dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hikCentral?.appointCode ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-neutral-500">
                      receptionistId
                    </dt>
                    <dd className="font-semibold text-neutral-900">
                      {createdVisit.hostId ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Right Col: Digital QR Pass Preview */}
            <div className="flex flex-col items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Digital QR Pass Preview
                </span>
                <p className="mt-1 text-xs font-semibold text-neutral-900">
                  {createdVisit.visitorGivenName} {createdVisit.visitorFamilyName}
                </p>
              </div>

              <div className="my-3 flex h-36 w-36 items-center justify-center rounded-lg border border-neutral-200 bg-white p-2 shadow-xs">
                {createdVisit.hikCentral?.qrCodeImage ? (
                  <Image
                    src={`data:image/png;base64,${createdVisit.hikCentral.qrCodeImage}`}
                    alt={`Visitor QR Pass for ${createdVisit.visitorGivenName}`}
                    width={128}
                    height={128}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-neutral-400">No QR Code</div>
                )}
              </div>

              <div className="w-full rounded bg-amber-50 py-1 text-[11px] font-medium text-amber-800">
                Pending Approval
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
