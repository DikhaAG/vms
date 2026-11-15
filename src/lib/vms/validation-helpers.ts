/**
 * Isomorphic validation helpers for mapping Zod validation results to legacy VMS error shapes.
 * Strictly isomorphic: zero Node.js imports, zero process.env reads.
 */

import type { z } from "zod";

/**
 * Type guard for non-null, non-array plain objects.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Formats a ZodError into a flat Record<string, string> compatible with VMS contract tests.
 * Array indices are formatted as `prefix[index]` (e.g. `visitors[0].visitorFamilyName`).
 * Nested objects are formatted with dot notation (e.g. `tapQuota.maxTaps`).
 * Root-level issues without a path map to `_global`.
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    let key = issue.path.reduce<string>((acc, segment) => {
      if (typeof segment === "number") {
        return `${acc}[${segment}]`;
      }
      return acc ? `${acc}.${String(segment)}` : String(segment);
    }, "");

    if (!key) {
      key = "_global";
    }

    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return errors;
}
