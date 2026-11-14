"use client";

import { useState, useEffect } from "react";
import { idDict } from "@/lib/vms/i18n/id";

export type GatewayStatus = "checking" | "online" | "offline" | "config";

export interface HikCentralStatusBadgeProps {
  initialStatus?: GatewayStatus;
  initialLatencyMs?: number;
  errorMessage?: string;
  autoCheck?: boolean;
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

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/hikcentral/version");
      const data = await res.json();

      if (data.ok) {
        setStatus("online");
        setLatencyMs(data.latencyMs ?? 0);
        setErrorMessage(undefined);
      } else {
        if (data.error?.kind === "config") {
          setStatus("config");
        } else {
          setStatus("offline");
        }
        setLatencyMs(data.latencyMs);
        setErrorMessage(
          data.error?.message || "Tidak dapat terhubung ke server HikCentral.",
        );
      }
    } catch (err) {
      setStatus("offline");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Kegagalan jaringan saat menghubungi gateway.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!autoCheck) return;
    let isCancelled = false;

    async function pingGateway() {
      try {
        const res = await fetch("/api/hikcentral/version");
        const data = await res.json();
        if (isCancelled) return;

        if (data.ok) {
          setStatus("online");
          setLatencyMs(data.latencyMs ?? 0);
          setErrorMessage(undefined);
        } else {
          if (data.error?.kind === "config") {
            setStatus("config");
          } else {
            setStatus("offline");
          }
          setLatencyMs(data.latencyMs);
          setErrorMessage(
            data.error?.message || "Tidak dapat terhubung ke server HikCentral.",
          );
        }
      } catch (err) {
        if (isCancelled) return;
        setStatus("offline");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Kegagalan jaringan saat menghubungi gateway.",
        );
      }
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
      dotBg: "bg-slate-400",
      pillBg: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      label: "Memeriksa Gateway...",
    },
    online: {
      dotBg: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
      pillBg: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      label: idDict.header.systemConnected,
    },
    offline: {
      dotBg: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]",
      pillBg: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      label: idDict.header.systemDisconnected,
    },
    config: {
      dotBg: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]",
      pillBg: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      label: "Konfigurasi Belum Lengkap",
    },
  }[status];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Status Koneksi HikCentral"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${badgeConfig.pillBg}`}
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
          <div className="absolute right-0 mt-2 z-40 w-72 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-lg text-xs text-neutral-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-2">
              <span className="font-semibold text-neutral-900 dark:text-white">
                Konektivitas HikCentral
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <span className="text-neutral-500 dark:text-slate-400">Status Gateway:</span>
                <p className="font-semibold capitalize mt-0.5">{status}</p>
              </div>

              {latencyMs !== undefined ? (
                <div>
                  <span className="text-neutral-500 dark:text-slate-400">Latensi Respon:</span>
                  <p className="font-mono mt-0.5">{latencyMs} ms</p>
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-2 text-[11px] text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void handleManualCheck();
                }}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 dark:hover:bg-blue-700 disabled:opacity-50"
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
