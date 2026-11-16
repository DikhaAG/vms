/**
 * Isomorphic contract for the single Site this deployment governs (ADR 0010).
 * The Site has no record of its own: its display fields are derived from
 * System Settings, so there is no Site id and no per-building scoping.
 * Free of Node.js dependencies — safe for Client Components.
 */

import { z } from "zod";
import type { SystemSettings } from "./vms-contract";

export const siteSchema = z.object({
  name: z.string(),
  timezone: z.string(),
});
export type Site = z.infer<typeof siteSchema>;

export function siteFromSettings(
  settings: Pick<SystemSettings, "siteName" | "timezone">,
): Site {
  return { name: settings.siteName, timezone: settings.timezone };
}
