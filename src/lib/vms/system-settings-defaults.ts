/**
 * Server-only defaults for the global System Settings singleton.
 *
 * Reads `APP_TIMEZONE` from the environment, so it lives outside the
 * isomorphic `vms-contract.ts` (which must stay free of `process.env` reads).
 */
import { DEFAULT_SYSTEM_SETTINGS, type SystemSettings } from "./vms-contract";
import { isValidIanaTimezone } from "./timezone";

type Env = Record<string, string | undefined>;

/**
 * Timezone used when no System Settings row exists (or it has no timezone):
 * `APP_TIMEZONE` if it names a valid IANA zone, otherwise Asia/Jakarta.
 */
export function resolveFallbackTimezone(env: Env = process.env): string {
  const fromEnv = env.APP_TIMEZONE?.trim();
  return fromEnv && isValidIanaTimezone(fromEnv)
    ? fromEnv
    : DEFAULT_SYSTEM_SETTINGS.timezone;
}

export function defaultSystemSettings(env: Env = process.env): SystemSettings {
  return {
    id: "default",
    siteName: DEFAULT_SYSTEM_SETTINGS.siteName,
    timezone: resolveFallbackTimezone(env),
    overstayGraceMinutes: DEFAULT_SYSTEM_SETTINGS.overstayGraceMinutes,
    autoCheckInEarlyBufferMinutes:
      DEFAULT_SYSTEM_SETTINGS.autoCheckInEarlyBufferMinutes,
    updatedAt: new Date().toISOString(),
  };
}
