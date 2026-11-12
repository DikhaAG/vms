import type { HikCentralErrorKind } from "./client";

export const VERSION_CHECK_MODES = ["live", "stub"] as const;
export type VersionCheckMode = (typeof VERSION_CHECK_MODES)[number];

export const STUB_SCENARIOS = [
  "success",
  "auth-error",
  "network-error",
] as const;
export type StubScenario = (typeof STUB_SCENARIOS)[number];

export interface VersionCheckInput {
  userId: string;
  mode?: VersionCheckMode;
  stubScenario?: StubScenario;
}

export interface HikCentralVersionData {
  produceName: string;
  softVersion: string;
}

export interface VersionCheckError {
  kind: HikCentralErrorKind | "validation";
  status?: number;
  code?: string;
  message: string;
}

export interface VersionCheckResult {
  ok: boolean;
  mode: VersionCheckMode;
  latencyMs: number;
  data?: HikCentralVersionData;
  error?: VersionCheckError;
}

export const MAX_USER_ID_LENGTH = 32;
const FORBIDDEN_USER_ID_CHARS = /['\/\\:*?"<>|]/;

export function isVersionCheckMode(value: unknown): value is VersionCheckMode {
  return (
    typeof value === "string" &&
    (VERSION_CHECK_MODES as readonly string[]).includes(value)
  );
}

export function isStubScenario(value: unknown): value is StubScenario {
  return (
    typeof value === "string" &&
    (STUB_SCENARIOS as readonly string[]).includes(value)
  );
}

export function isHikCentralVersionData(
  value: unknown,
): value is HikCentralVersionData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.produceName === "string" &&
    record.produceName.length > 0 &&
    typeof record.softVersion === "string" &&
    record.softVersion.length > 0
  );
}

/**
 * Validates the HikCentral userId field per Chapter 5.1.1 (1-32 chars, excluding forbidden punctuation).
 */
export function validateUserId(rawUserId: string): string | undefined {
  const trimmed = rawUserId.trim();
  if (trimmed.length === 0) {
    return "userId is required (1 to 32 characters).";
  }
  if (trimmed.length > MAX_USER_ID_LENGTH) {
    return "userId must be at most 32 characters.";
  }
  if (FORBIDDEN_USER_ID_CHARS.test(trimmed)) {
    return "userId cannot contain any of: ' / \\ : * ? \" < > |";
  }
  return undefined;
}
