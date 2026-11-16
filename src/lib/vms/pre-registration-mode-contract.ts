/**
 * HikCentral dispatch mode shared by every write contract ("live" calls the
 * real API, "stub" uses the dev fixtures). Kept in a leaf module so contracts
 * that `vms-contract.ts` itself re-exports (e.g. `checkout-contract.ts`) can
 * use the schema without a circular import.
 * Safe for Client Components (zero Node.js dependencies, zero process.env reads).
 */
import { z } from "zod";

export const PRE_REGISTRATION_MODES = ["live", "stub"] as const;
export const preRegistrationModeSchema = z.enum(PRE_REGISTRATION_MODES, {
  error: `Mode must be one of: ${PRE_REGISTRATION_MODES.join(", ")}.`,
});
export type PreRegistrationMode = z.infer<typeof preRegistrationModeSchema>;
