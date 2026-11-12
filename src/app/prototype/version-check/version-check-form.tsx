"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  isHikCentralVersionData,
  isVersionCheckMode,
  validateUserId,
  type StubScenario,
  type VersionCheckMode,
  type VersionCheckResult,
} from "@/lib/hikcentral/version-contract";

interface RadioOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

const MODE_OPTIONS: readonly RadioOption<VersionCheckMode>[] = [
  {
    value: "stub",
    label: "Stub simulator",
    description: "Deterministic local responses without a live HikCentral server.",
  },
  {
    value: "live",
    label: "Live server",
    description: "Executes signed POST /artemis/api/common/v1/version via .env config.",
  },
];

const STUB_SCENARIO_OPTIONS: readonly RadioOption<StubScenario>[] = [
  {
    value: "success",
    label: "Success",
    description: "Returns produceName (VMSPlatform) and softVersion (V2.1.0.0).",
  },
  {
    value: "auth-error",
    label: "Auth error (0x02401006)",
    description: "Simulates an Artemis API authentication/token error payload.",
  },
  {
    value: "network-error",
    label: "Network error",
    description: "Simulates a socket connection refusal to the upstream server.",
  },
];

function isVersionCheckResult(value: unknown): value is VersionCheckResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.ok !== "boolean" ||
    !isVersionCheckMode(record.mode) ||
    typeof record.latencyMs !== "number"
  ) {
    return false;
  }
  return record.ok ? isHikCentralVersionData(record.data) : true;
}

interface RadioCardFieldsetProps<T extends string> {
  legend: string;
  name: string;
  idPrefix: string;
  options: readonly RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  gridClassName: string;
  cardPaddingClassName?: string;
}

function RadioCardFieldset<T extends string>({
  legend,
  name,
  idPrefix,
  options,
  value,
  onChange,
  gridClassName,
  cardPaddingClassName = "p-3.5",
}: RadioCardFieldsetProps<T>) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-medium text-neutral-900">{legend}</legend>
      <div className={gridClassName}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={`${idPrefix}-${option.value}`}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border ${cardPaddingClassName} transition ${
                checked
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <input
                id={`${idPrefix}-${option.value}`}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="mt-0.5 h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="block">
                <span className="block text-sm font-medium text-neutral-900">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-600">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Interactive prototype form for testing HikCentral POST /artemis/api/common/v1/version.
 */
export function VersionCheckForm() {
  const [userId, setUserId] = useState("admin");
  const [hasEditedUserId, setHasEditedUserId] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<VersionCheckMode>("stub");
  const [stubScenario, setStubScenario] = useState<StubScenario>("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<VersionCheckResult | null>(null);

  const userIdInputRef = useRef<HTMLInputElement>(null);

  function handleUserIdChange(nextValue: string) {
    setUserId(nextValue);
    setHasEditedUserId(true);
    if (fieldError !== undefined) {
      setFieldError(validateUserId(nextValue));
    }
  }

  function handleUserIdBlur() {
    if (!hasEditedUserId) {
      return;
    }
    setFieldError(validateUserId(userId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateUserId(userId);
    if (validationError !== undefined) {
      setFieldError(validationError);
      userIdInputRef.current?.focus();
      return;
    }

    setFieldError(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/hikcentral/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.trim(),
          mode,
          ...(mode === "stub" ? { stubScenario } : {}),
        }),
      });

      const payload: unknown = await response.json().catch(() => null);
      if (isVersionCheckResult(payload)) {
        setResult(payload);
      } else {
        setResult({
          ok: false,
          mode,
          latencyMs: 0,
          error: {
            kind: "parse",
            status: response.status,
            message: `Unexpected non-JSON response (HTTP ${response.status}).`,
          },
        });
      }
    } catch (error) {
      setResult({
        ok: false,
        mode,
        latencyMs: 0,
        error: {
          kind: "network",
          message:
            error instanceof Error
              ? error.message
              : "Failed to reach /api/hikcentral/version.",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const userIdDescribedBy = fieldError
    ? "hikcentral-user-id-hint hikcentral-user-id-error"
    : "hikcentral-user-id-hint";

  return (
    <div className="space-y-6">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs"
      >
        <div>
          <label
            htmlFor="hikcentral-user-id"
            className="block text-sm font-medium text-neutral-900"
          >
            HikCentral User ID
          </label>
          <input
            ref={userIdInputRef}
            id="hikcentral-user-id"
            name="userId"
            type="text"
            required
            autoComplete="username"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={userId}
            onChange={(event) => handleUserIdChange(event.target.value)}
            onBlur={handleUserIdBlur}
            aria-invalid={fieldError !== undefined}
            aria-describedby={userIdDescribedBy}
            className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs transition focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15 aria-[invalid=true]:border-rose-600 aria-[invalid=true]:focus:ring-rose-600/20"
            placeholder="admin"
          />
          <p id="hikcentral-user-id-hint" className="mt-1.5 text-xs text-neutral-600">
            1 to 32 characters (Chapter 5.1.1). Cannot contain{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] text-neutral-800">
              &apos; / \ : * ? &quot; &lt; &gt; |
            </code>
          </p>
          {fieldError ? (
            <p
              id="hikcentral-user-id-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-rose-700"
            >
              {fieldError}
            </p>
          ) : null}
        </div>

        <RadioCardFieldset
          legend="Execution mode"
          name="mode"
          idPrefix="mode"
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          gridClassName="grid gap-3 sm:grid-cols-2"
        />

        {mode === "stub" ? (
          <RadioCardFieldset
            legend="Stub scenario"
            name="stubScenario"
            idPrefix="stub"
            options={STUB_SCENARIO_OPTIONS}
            value={stubScenario}
            onChange={setStubScenario}
            gridClassName="space-y-2"
            cardPaddingClassName="p-3"
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-600">
            Credentials (<code className="font-mono">AppKey</code> /{" "}
            <code className="font-mono">AppSecret</code>) remain strictly server-side.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Checking connection..." : "Test Connection"}
          </button>
        </div>
      </form>

      <div aria-live="polite" role="status">
        {!isSubmitting && result !== null ? (
          <section
            aria-label="Connection test result"
            className={`rounded-xl border p-6 shadow-xs ${
              result.ok
                ? "border-emerald-300 bg-emerald-50/50"
                : "border-rose-300 bg-rose-50/50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    result.ok
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-rose-100 text-rose-900"
                  }`}
                >
                  {result.ok ? "OK — Connected" : "FAILED — Error"}
                </span>
                <span className="rounded-full bg-neutral-200/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 uppercase">
                  {result.mode}
                </span>
              </div>
              <span className="font-mono text-xs text-neutral-700">
                Latency: {result.latencyMs} ms
              </span>
            </div>

            {result.ok && result.data ? (
              <dl className="mt-4 grid gap-4 border-t border-emerald-200/70 pt-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-neutral-600">
                    produceName
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                    {result.data.produceName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-600">
                    softVersion
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                    {result.data.softVersion}
                  </dd>
                </div>
              </dl>
            ) : null}

            {!result.ok && result.error ? (
              <dl className="mt-4 grid gap-4 border-t border-rose-200/70 pt-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-neutral-600">Kind</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                    {result.error.kind}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-600">
                    Code / HTTP Status
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                    {result.error.code ?? "—"}
                    {result.error.status !== undefined
                      ? ` (HTTP ${result.error.status})`
                      : ""}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-neutral-600">
                    Message (msg)
                  </dt>
                  <dd className="mt-1 rounded-md border border-rose-200 bg-white px-3 py-2 font-mono text-xs text-rose-900">
                    {result.error.message}
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
