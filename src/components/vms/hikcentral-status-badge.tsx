"use client";

import { useState, useEffect } from "react";
import { idDict } from "@/lib/vms/i18n/id";

export const GATEWAY_STATUSES = [
  "checking",
  "online",
  "offline",
  "config",
] as const;

export type GatewayStatus = (typeof GATEWAY_STATUSES)[number];

export function isGatewayStatus(value: unknown): value is GatewayStatus {
  return (
    typeof value === "string" &&
    (GATEWAY_STATUSES as readonly string[]).includes(value)
  );
}

export interface HikCentralStatusBadgeProps {
  initialStatus?: GatewayStatus;
  initialLatencyMs?: number;
  errorMessage?: string;
  autoCheck?: boolean;
}

interface GatewayHealthResult {
  status: GatewayStatus;
  latencyMs?: number;
  errorMessage?: string;
}

async function checkGatewayHealth(): Promise<GatewayHealthResult> {
  try {
    const res = await fetch("/api/hikcentral/version");
    const data = await res.json();

    if (data.ok) {
      return {
        status: "online",
        latencyMs: data.latencyMs ?? 0,
      };
    }

    return {
      status: data.error?.kind === "config" ? "config" : "offline",
      latencyMs: data.latencyMs,
      errorMessage:
        data.error?.message || "Tidak dapat terhubung ke server HikCentral.",
    };
  } catch (err) {
    return {
      status: "offline",
      errorMessage:
        err instanceof Error
          ? err.message
          : "Kegagalan jaringan saat menghubungi gateway.",
    };
  }
}

export function HikCentralStatusBadge({
  initialStatus = "checking",
  initialLatencyMs,
  errorMessage: initialErrorMessage,
  autoCheck = true,
}: HikCentralStatusBadgeProps) {
  const [status, setStatus] = useState<GatewayStatus>(initialStatus);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(initialLatencyMs);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    initialErrorMessage,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const applyHealthResult = (result: GatewayHealthResult) => {
    setStatus(result.status);
    setLatencyMs(result.latencyMs);
    setErrorMessage(result.errorMessage);
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const result = await checkGatewayHealth();
      applyHealthResult(result);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!autoCheck) return;
    let isCancelled = false;

    async function pingGateway() {
      const result = await checkGatewayHealth();
      if (isCancelled) return;
      applyHealthResult(result);
    }

    void pingGateway();

    const interval = setInterval(() => {
      void pingGateway();
    }, 60000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [autoCheck]);

  const badgeConfig = {
    checking: {
      dotBg: "bg-[var(--ks-text-faint)]",
      pillBg: "bg-[var(--ks-paper-deep)] text-[var(--ks-text-muted)] border-[var(--ks-rule)]",
      label: idDict.header.systemChecking,
    },
    online: {
      dotBg: "bg-[var(--ks-patina)] ks-led-patina",
      pillBg: "bg-[var(--ks-paper-deep)] text-[var(--ks-ink)] border-[var(--ks-rule)]",
      label: idDict.header.systemConnected,
    },
    offline: {
      dotBg: "bg-[var(--ks-vermilion)] ks-led-vermilion",
      pillBg: "bg-[var(--ks-vermilion)]/10 text-[var(--ks-vermilion)] border-[var(--ks-vermilion)]/30",
      label: idDict.header.systemDisconnected,
    },
    config: {
      dotBg: "bg-[var(--ks-amber)] ks-led-amber",
      pillBg: "bg-[var(--ks-amber)]/10 text-[var(--ks-amber-deep)] border-[var(--ks-amber)]/30",
      label: idDict.header.systemConfigIncomplete,
    },
  }[status];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Status Koneksi HikCentral"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--ks-radius-md)] border text-xs font-semibold transition cursor-pointer shadow-2xs hover:border-[var(--ks-edge)] ${badgeConfig.pillBg}`}
      >
        <span
          className={`inline-flex h-2 w-2 rounded-full shrink-0 ${badgeConfig.dotBg} ${
            status === "checking" || isChecking ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
        <span>{badgeConfig.label}</span>
        {latencyMs !== undefined && status === "online" ? (
          <span className="text-[10px] opacity-75 font-mono">({latencyMs}ms)</span>
        ) : null}
      </button>

      {/* Popover / Details Dialog */}
      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 z-40 w-76 rounded-[var(--ks-radius-md)] border border-[var(--ks-rule)] bg-[var(--ks-paper-raised)] p-4 shadow-[var(--ks-lift-2)] text-xs text-[var(--ks-text)]">
            <div className="flex items-center justify-between border-b border-[var(--ks-rule)] pb-2.5">
              <span className="font-bold text-[var(--ks-ink)] tracking-tight">
                Konektivitas HikCentral
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--ks-text-muted)] hover:text-[var(--ks-ink)] font-bold text-sm"
              >
                &times;
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              <div>
                <span className="text-[var(--ks-text-muted)] font-medium">Status Gateway:</span>
                <p className="font-bold capitalize text-[var(--ks-ink)] mt-0.5">{status}</p>
              </div>

              {latencyMs !== undefined ? (
                <div>
                  <span className="text-[var(--ks-text-muted)] font-medium">Latensi Respon:</span>
                  <p className="font-mono mt-0.5 font-bold text-[var(--ks-ink)]">{latencyMs} ms</p>
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-[var(--ks-radius-sm)] bg-[var(--ks-vermilion)]/10 p-2.5 text-[11px] text-[var(--ks-vermilion)] border border-[var(--ks-vermilion)]/30">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--ks-rule)] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void handleManualCheck();
                }}
                disabled={isChecking}
                className="ks-btn inline-flex items-center gap-1.5 rounded-[var(--ks-radius-sm)] bg-[var(--ks-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--ks-paper-raised)] shadow-xs transition hover:bg-[var(--ks-text)] disabled:opacity-50"
              >
                <span>{isChecking ? "⏳" : "🔄"}</span>
                {isChecking ? "Memeriksa..." : "Uji Koneksi Ulang"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
