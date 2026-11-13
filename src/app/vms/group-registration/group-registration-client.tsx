"use client";

import { useState } from "react";
import Image from "next/image";
import type { Facility } from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";
import type {
  GroupVisitResult,
  VisitorProfile,
} from "@/lib/vms/group-contract";
import {
  CERTIFICATE_TYPE_LABELS,
  VISIT_REASON_LABELS,
} from "@/lib/vms/vms-contract";

interface VisitorFormRow {
  visitorFamilyName: string;
  visitorGivenName: string;
  visitorPhone: string;
  visitorEmail: string;
  certificateType: number;
  certificateNo: string;
  facePhoto?: string;
  lookupResult?: {
    checked: boolean;
    found: boolean;
    profile?: VisitorProfile;
  };
  isLookingUp?: boolean;
}

interface GroupRegistrationClientProps {
  facilities: Facility[];
  allAccessLevels: AccessLevel[];
}

export function GroupRegistrationClient({
  facilities,
  allAccessLevels,
}: GroupRegistrationClientProps) {
  // Group Header States
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "fac-jakarta");
  const [visitorGroupName, setVisitorGroupName] = useState("");
  const [hostId, setHostId] = useState("emp-101");
  const [hostName, setHostName] = useState("Budi Santoso");
  const [visitReasonType, setVisitReasonType] = useState<number>(3); // Meeting
  const [visitReasonDetail, setVisitReasonDetail] = useState("");

  // Default times: today at 14:00 to 17:00 local time
  const today = new Date().toISOString().split("T")[0];
  const [scheduledStartTime, setScheduledStartTime] = useState(`${today}T14:00`);
  const [scheduledEndTime, setScheduledEndTime] = useState(`${today}T17:00`);

  // Access & Quota
  const [selectedAccessLevelIds, setSelectedAccessLevelIds] = useState<string[]>([]);
  const [tapQuotaMode, setTapQuotaMode] = useState<"unlimited" | "limited">("unlimited");
  const [maxTaps, setMaxTaps] = useState<number>(4);

  // Visitors dynamic rows
  const [visitors, setVisitors] = useState<VisitorFormRow[]>([
    {
      visitorFamilyName: "",
      visitorGivenName: "",
      visitorPhone: "",
      visitorEmail: "",
      certificateType: 111,
      certificateNo: "",
    },
    {
      visitorFamilyName: "",
      visitorGivenName: "",
      visitorPhone: "",
      visitorEmail: "",
      certificateType: 111,
      certificateNo: "",
    },
  ]);

  // Mode and stub controls
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GroupVisitResult | null>(null);

  const selectedFacility = facilities.find((f) => f.id === facilityId);
  const availableAccessLevels = allAccessLevels.filter(
    (al) => al.facilityId === facilityId,
  );

  // Auto-fill lookup helper
  async function checkReturningVisitor(index: number, certNo: string) {
    const trimmed = certNo.trim();
    if (!trimmed) return;

    setVisitors((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, isLookingUp: true } : row,
      ),
    );

    try {
      const res = await fetch(
        `/api/vms/visitors/lookup?certificateNo=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();

      setVisitors((prev) =>
        prev.map((row, i) => {
          if (i !== index) return row;
          return {
            ...row,
            isLookingUp: false,
            lookupResult: {
              checked: true,
              found: data.ok && data.found,
              profile: data.profile,
            },
          };
        }),
      );
    } catch {
      setVisitors((prev) =>
        prev.map((row, i) =>
          i === index ? { ...row, isLookingUp: false } : row,
        ),
      );
    }
  }

  function applyReturningProfile(index: number, profile: VisitorProfile) {
    setVisitors((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return {
          ...row,
          visitorFamilyName: profile.familyName || row.visitorFamilyName,
          visitorGivenName: profile.givenName || row.visitorGivenName,
          visitorPhone: profile.phone || row.visitorPhone,
          visitorEmail: profile.email || row.visitorEmail,
          certificateType: profile.certificateType,
          certificateNo: profile.certificateNo,
          facePhoto: profile.facePhoto || row.facePhoto,
          lookupResult: {
            checked: true,
            found: true,
            profile,
          },
        };
      }),
    );
  }

  function handlePhotoUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setVisitors((prev) =>
        prev.map((row, i) => (i === index ? { ...row, facePhoto: base64 } : row)),
      );
    };
    reader.readAsDataURL(file);
  }

  function addVisitorRow() {
    setVisitors((prev) => [
      ...prev,
      {
        visitorFamilyName: "",
        visitorGivenName: "",
        visitorPhone: "",
        visitorEmail: "",
        certificateType: 111,
        certificateNo: "",
      },
    ]);
  }

  function removeVisitorRow(index: number) {
    if (visitors.length <= 1) return;
    setVisitors((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleAccessLevel(id: string) {
    setSelectedAccessLevelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      facilityId,
      hostId,
      hostName,
      visitorGroupName: visitorGroupName.trim(),
      scheduledStartTime,
      scheduledEndTime,
      visitReasonType,
      visitReasonDetail: visitReasonDetail.trim() || undefined,
      accessLevelIds:
        selectedAccessLevelIds.length > 0 ? selectedAccessLevelIds : undefined,
      tapQuota:
        tapQuotaMode === "limited"
          ? { mode: "limited", maxTaps }
          : { mode: "unlimited" },
      visitors: visitors.map((v) => ({
        visitorFamilyName: v.visitorFamilyName.trim(),
        visitorGivenName: v.visitorGivenName.trim(),
        visitorPhone: v.visitorPhone.trim() || undefined,
        visitorEmail: v.visitorEmail.trim() || undefined,
        certificateType: v.certificateType,
        certificateNo: v.certificateNo.trim() || undefined,
        facePhoto: v.facePhoto,
      })),
      mode: "stub",
      stubScenario: "success",
    };

    try {
      const res = await fetch("/api/vms/group-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        const errorMsg =
          data.error?.message ||
          (data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).join(", ")
            : "Failed to create group visit.");
        setSubmitError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      setResult(data.data);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Network error creating group visit.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Group Visit Confirmed
              </span>
              <h2 className="mt-2 text-xl font-bold text-neutral-900">
                {result.visitorGroupName}
              </h2>
              <p className="mt-1 text-xs font-mono text-neutral-600">
                Group ID: {result.groupId}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900">
                {result.successCount} of {result.memberVisits.length} Registered
              </p>
              {result.failureCount > 0 && (
                <p className="text-xs font-semibold text-red-600">
                  {result.failureCount} Failed
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-semibold text-neutral-900">
            Registered Group Members & QR Passes
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.memberVisits.map((member, idx) => (
              <div
                key={member.visitId || `failed-${idx}`}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-neutral-900">
                      {member.visitorName}
                    </h4>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        member.status === "PENDING_APPROVAL"
                          ? "bg-amber-100 text-amber-800"
                          : member.status === "SECURITY_ESCALATED"
                            ? "bg-purple-100 text-purple-800"
                            : member.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>

                  {member.certificateNo && (
                    <p className="mt-1 text-xs text-neutral-500">
                      ID: {member.certificateNo}
                    </p>
                  )}

                  {member.appointCode && (
                    <p className="mt-2 text-sm font-medium text-neutral-700">
                      Appoint Code:{" "}
                      <span className="font-mono font-bold text-neutral-950">
                        {member.appointCode}
                      </span>
                    </p>
                  )}

                  {member.error && (
                    <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                      Error: {member.error}
                    </p>
                  )}
                </div>

                {member.qrCodeImage && (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                    <Image
                      src={
                        member.qrCodeImage.startsWith("data:")
                          ? member.qrCodeImage
                          : `data:image/png;base64,${member.qrCodeImage}`
                      }
                      alt={`QR Code Pass for ${member.visitorName}`}
                      width={128}
                      height={128}
                      className="rounded"
                      unoptimized
                    />
                    <span className="mt-2 text-[10px] text-neutral-500 font-mono">
                      Dynamic Pass
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setVisitorGroupName("");
              setVisitors([
                {
                  visitorFamilyName: "",
                  visitorGivenName: "",
                  visitorPhone: "",
                  visitorEmail: "",
                  certificateType: 111,
                  certificateNo: "",
                },
                {
                  visitorFamilyName: "",
                  visitorGivenName: "",
                  visitorPhone: "",
                  visitorEmail: "",
                  certificateType: 111,
                  certificateNo: "",
                },
              ]);
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Schedule Another Group Visit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Registration Failed</p>
          <p className="mt-1 text-xs">{submitError}</p>
        </div>
      )}

      {/* 1. Group & Facility Booking Details */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-5">
        <h2 className="text-base font-semibold text-neutral-900">
          1. Group Booking & Schedule
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-700">
              Visitor Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PT Telkom Project Delegation, Vendor Inspection Team"
              value={visitorGroupName}
              onChange={(e) => setVisitorGroupName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Auto-creates or groups under this name in HikCentral Visitor Management.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Target Facility <span className="text-red-500">*</span>
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.timezone})
                </option>
              ))}
            </select>
            {selectedFacility && (
              <p className="mt-1 text-[11px] text-neutral-500">
                Timezone: <span className="font-mono">{selectedFacility.timezone}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="group-host-id" className="block text-xs font-semibold text-neutral-700">
              Host Employee ID
            </label>
            <input
              id="group-host-id"
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              placeholder="e.g. emp-101"
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Host Employee Name
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Host Name"
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Visit Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={visitReasonType}
              onChange={(e) => setVisitReasonType(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
            >
              {Object.entries(VISIT_REASON_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {visitReasonType === 4 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Purpose Detail <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={visitReasonDetail}
                onChange={(e) => setVisitReasonDetail(e.target.value)}
                placeholder="Specific purpose for Others"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Scheduled Start (Facility Local) <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledStartTime}
              onChange={(e) => setScheduledStartTime(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Scheduled End (Facility Local) <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledEndTime}
              onChange={(e) => setScheduledEndTime(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
            />
          </div>
        </div>
      </section>

      {/* 2. Physical Access Privileges & Tap Quota */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-neutral-900">
          2. Access Privileges & Quota
        </h2>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Assign Access Levels for Group
          </label>
          {availableAccessLevels.length === 0 ? (
            <p className="text-xs text-neutral-500">
              No access levels configured for this facility. Default turnstile access will apply.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableAccessLevels.map((al) => {
                const isChecked = selectedAccessLevelIds.includes(al.id);
                return (
                  <label
                    key={al.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                      isChecked
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 bg-white hover:bg-neutral-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAccessLevel(al.id)}
                      className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">
                        {al.name}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {al.description || `${al.doors.length} doors assigned`}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Door Tap Quota Mode
            </label>
            <select
              value={tapQuotaMode}
              onChange={(e) =>
                setTapQuotaMode(e.target.value as "unlimited" | "limited")
              }
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
            >
              <option value="unlimited">Unlimited Taps (Valid Meeting Duration)</option>
              <option value="limited">Limited Tap Count</option>
            </select>
          </div>

          {tapQuotaMode === "limited" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Max Allowed Taps per Visitor
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxTaps}
                onChange={(e) => setMaxTaps(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
              />
            </div>
          )}
        </div>
      </section>

      {/* 3. Dynamic Visitors List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              3. Group Members ({visitors.length} Visitors)
            </h2>
            <p className="text-xs text-neutral-500">
              Provide identity details for each visitor. Returning visitors are automatically recognized by ID number.
            </p>
          </div>
          <button
            type="button"
            onClick={addVisitorRow}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            + Add Visitor
          </button>
        </div>

        <div className="space-y-4">
          {visitors.map((visitor, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Visitor #{idx + 1}
                </span>
                {visitors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVisitorRow(idx)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 transition"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Returning Visitor Auto-Fill Banner */}
              {visitor.lookupResult?.found && visitor.lookupResult.profile && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {visitor.lookupResult.profile.facePhoto ? (
                      <Image
                        src={visitor.lookupResult.profile.facePhoto}
                        alt="Stored Face Photo"
                        width={36}
                        height={36}
                        className="rounded-full object-cover border border-blue-200"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">
                        {visitor.lookupResult.profile.givenName?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-blue-950">
                        Returning Visitor Recognized: {visitor.lookupResult.profile.fullName}
                      </p>
                      <p className="text-[11px] text-blue-800">
                        Saved profile and encrypted face photo available.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      applyReturningProfile(idx, visitor.lookupResult!.profile!)
                    }
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                  >
                    Auto-fill Details & Photo
                  </button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Given / First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={visitor.visitorGivenName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorGivenName: val } : r,
                        ),
                      );
                    }}
                    placeholder="e.g. Demis"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Family / Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={visitor.visitorFamilyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorFamilyName: val } : r,
                        ),
                      );
                    }}
                    placeholder="e.g. Hassabis"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Certificate Type
                  </label>
                  <select
                    value={visitor.certificateType}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, certificateType: val } : r,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
                  >
                    {Object.entries(CERTIFICATE_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`group-cert-no-${idx}`} className="block text-xs font-semibold text-neutral-700">
                    Identity / KTP / Passport No.
                  </label>
                  <div className="relative mt-1">
                    <input
                      id={`group-cert-no-${idx}`}
                      type="text"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={visitor.certificateNo}
                      onBlur={() =>
                        checkReturningVisitor(idx, visitor.certificateNo)
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setVisitors((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  certificateNo: val,
                                  lookupResult: undefined,
                                }
                              : r,
                          ),
                        );
                      }}
                      placeholder="e.g. 3171012345670001"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
                    />
                    {visitor.isLookingUp && (
                      <span className="absolute right-2.5 top-2 text-xs text-neutral-400">
                        Searching...
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={visitor.visitorPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorPhone: val } : r,
                        ),
                      );
                    }}
                    placeholder="+628111222333"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={visitor.visitorEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVisitors((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, visitorEmail: val } : r,
                        ),
                      );
                    }}
                    placeholder="visitor@example.com"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Biometric Face Photo (Optional)
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => handlePhotoUpload(idx, e)}
                      className="text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-neutral-800 hover:file:bg-neutral-200"
                    />
                    {visitor.facePhoto && (
                      <div className="flex items-center gap-2">
                        <Image
                          src={visitor.facePhoto}
                          alt="Face Preview"
                          width={32}
                          height={32}
                          className="rounded object-cover border border-neutral-200"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setVisitors((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, facePhoto: undefined } : r,
                              ),
                            )
                          }
                          className="text-[11px] text-red-600 hover:underline"
                        >
                          Remove Photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <p className="text-xs text-neutral-500">
          Orchestrates {visitors.length} individual appointment calls to HikCentral with automated profile retention.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSubmitting
            ? "Scheduling Group Visit..."
            : `Confirm & Register Group Visit (${visitors.length} Visitors)`}
        </button>
      </div>
    </form>
  );
}
