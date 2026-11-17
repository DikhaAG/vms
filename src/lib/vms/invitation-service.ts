import { randomBytes, randomUUID } from "node:crypto";
import {
  type CreateInvitationInput,
  type CreateInvitationResult,
  type InvitationStatus,
  type InvitationToken,
  type PublicInvitationMetadata,
  validateCreateInvitationInput,
} from "./invitation-contract";
import {
  type Visit,
  VISIT_REASON_LABELS,
} from "./vms-contract";
import { siteFromSettings, type Site } from "./site-contract";
import { formatFacilityIso, parseLocalDateTimeToUtc } from "./timezone";
import type { PostgresVmsRepository } from "./postgres-repository";
import { defaultVmsRepository } from "./repository";
import { resolveFallbackTimezone } from "./system-settings-defaults";

export interface InvitationServiceDeps {
  repository?: PostgresVmsRepository;
  tokenGenerator?: () => string;
  idGenerator?: () => string;
  now?: () => Date;
}

export function generateSecureInvitationToken(): string {
  return randomBytes(24).toString("hex");
}

export interface ValidationOutcomeSuccess {
  valid: true;
  status: "valid";
  token: InvitationToken;
  visit: Visit;
  site: Site;
}

export interface ValidationOutcomeFailure {
  valid: false;
  status: Exclude<InvitationStatus, "valid">;
  error: string;
  token?: InvitationToken;
  visit?: Visit;
  site?: Site;
}

export type TokenValidationResult =
  | ValidationOutcomeSuccess
  | ValidationOutcomeFailure;

/**
 * Creates a Visit in DRAFT status and generates a cryptographically secure,
 * time-bounded single-use invitation token.
 */
export async function createInvitation(
  rawInput: CreateInvitationInput,
  deps: InvitationServiceDeps = {},
): Promise<CreateInvitationResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const generateToken = deps.tokenGenerator ?? generateSecureInvitationToken;
  const generateId = deps.idGenerator ?? randomUUID;
  const getNow = deps.now ?? (() => new Date());

  // 1. Validate input schema
  const validation = validateCreateInvitationInput(rawInput);
  if (!validation.valid) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Invitation input validation failed.",
        fieldErrors: validation.errors,
      },
    };
  }

  const input = validation.input;

  // 2. Resolve single-site context (timezone) from global system settings
  const settings = await repository.getSettings();
  const timezone = settings.timezone || resolveFallbackTimezone();

  // 3. Normalize times to UTC and site-local ISO
  let startUtc: Date;
  let endUtc: Date;
  try {
    startUtc = parseLocalDateTimeToUtc(input.scheduledStartTime, timezone);
    endUtc = parseLocalDateTimeToUtc(input.scheduledEndTime, timezone);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message:
          err instanceof Error
            ? err.message
            : "Invalid scheduled time format for site timezone.",
      },
    };
  }

  if (endUtc.getTime() <= startUtc.getTime()) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Scheduled end time must be after scheduled start time.",
        fieldErrors: {
          scheduledEndTime: "Scheduled end time must be after start time.",
        },
      },
    };
  }

  const scheduledStartTimeFacility = formatFacilityIso(startUtc, timezone);
  const scheduledEndTimeFacility = formatFacilityIso(endUtc, timezone);

  // 4. Calculate token expiration
  // Default expiry: 7 days from now, but capped if visit ends earlier, or configured days
  const now = getNow();
  let expiresAtUtc: string;
  if (input.expiresInDays) {
    const customExpiry = new Date(
      now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000,
    );
    expiresAtUtc = customExpiry.toISOString();
  } else {
    // 7 days default
    const defaultExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // If scheduled end time is further than 7 days, allow up to scheduled end time
    expiresAtUtc =
      endUtc.getTime() > defaultExpiry.getTime()
        ? endUtc.toISOString()
        : defaultExpiry.toISOString();
  }

  const tokenString = generateToken();
  const visitId = generateId();
  const nowIso = now.toISOString();

  // 5. Create Draft Visit
  const visit: Visit = {
    id: visitId,
    hostId: input.hostId,
    hostName: input.hostName,
    visitorFamilyName: input.visitorFamilyName ?? "",
    visitorGivenName: input.visitorGivenName ?? "",
    visitorPhone: input.visitorPhone,
    visitorEmail: input.visitorEmail,
    visitReasonType: input.visitReasonType,
    visitReasonDetail: input.visitReasonDetail,
    scheduledStartTimeUtc: startUtc.toISOString(),
    scheduledEndTimeUtc: endUtc.toISOString(),
    scheduledStartTimeFacility,
    scheduledEndTimeFacility,
    status: "DRAFT",
    invitationToken: tokenString,
    createdAtUtc: nowIso,
    updatedAtUtc: nowIso,
  };

  const invitation: InvitationToken = {
    token: tokenString,
    visitId,
    expiresAtUtc,
    isConsumed: false,
    createdAtUtc: nowIso,
  };

  await repository.saveVisit(visit);
  await repository.createInvitationToken(invitation);

  return {
    ok: true,
    invitation,
    inviteUrl: `/invite/${tokenString}`,
    visit,
  };
}

/**
 * Validates an invitation token against single-use and expiration constraints.
 */
export async function validateInvitationToken(
  token: string,
  deps: InvitationServiceDeps = {},
): Promise<TokenValidationResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const getNow = deps.now ?? (() => new Date());

  const tokenRecord = await repository.getInvitationToken(token);
  if (!tokenRecord) {
    return {
      valid: false,
      status: "invalid",
      error: "Invitation token not found or invalid.",
    };
  }

  const visit = await repository.getVisit(tokenRecord.visitId);
  if (!visit) {
    return {
      valid: false,
      status: "invalid",
      error: "Associated visit record not found.",
      token: tokenRecord,
    };
  }

  const settings = await repository.getSettings();
  const site = siteFromSettings(settings);

  // Check single-use
  if (tokenRecord.isConsumed) {
    return {
      valid: false,
      status: "consumed",
      error: "This invitation link has already been used.",
      token: tokenRecord,
      visit,
      site,
    };
  }

  // Check expiration (both token expiresAtUtc and visit scheduledEndTimeUtc)
  const now = getNow();
  const tokenExpires = new Date(tokenRecord.expiresAtUtc);
  const visitEnds = new Date(visit.scheduledEndTimeUtc);

  if (now.getTime() > tokenExpires.getTime() || now.getTime() > visitEnds.getTime()) {
    return {
      valid: false,
      status: "expired",
      error: "This invitation link has expired.",
      token: tokenRecord,
      visit,
      site,
    };
  }

  return {
    valid: true,
    status: "valid",
    token: tokenRecord,
    visit,
    site,
  };
}

export interface GetPublicInvitationMetadataResult {
  ok: boolean;
  status: InvitationStatus;
  httpStatus: number;
  message?: string;
  data?: PublicInvitationMetadata;
}

/**
 * Retrieves public-facing metadata for an invitation token without sensitive internal fields.
 */
export async function getPublicInvitationMetadata(
  token: string,
  deps: InvitationServiceDeps = {},
): Promise<GetPublicInvitationMetadataResult> {
  const validation = await validateInvitationToken(token, deps);

  if (!validation.valid) {
    const httpStatus =
      validation.status === "invalid"
        ? 404
        : 410; // 410 Gone for expired or consumed
    return {
      ok: false,
      status: validation.status,
      httpStatus,
      message: validation.error,
    };
  }

  const { token: tokenRecord, visit, site } = validation;

  const data: PublicInvitationMetadata = {
    token: tokenRecord.token,
    visitId: visit.id,
    status: "valid",
    site,
    host: {
      id: visit.hostId,
      name: visit.hostName,
    },
    visitReasonType: visit.visitReasonType,
    visitReasonLabel:
      VISIT_REASON_LABELS[visit.visitReasonType] ?? "Visitor",
    visitReasonDetail: visit.visitReasonDetail,
    scheduledStartTimeFacility: visit.scheduledStartTimeFacility,
    scheduledEndTimeFacility: visit.scheduledEndTimeFacility,
    scheduledStartTimeUtc: visit.scheduledStartTimeUtc,
    scheduledEndTimeUtc: visit.scheduledEndTimeUtc,
    expiresAtUtc: tokenRecord.expiresAtUtc,
    isConsumed: tokenRecord.isConsumed,
    prefilledVisitor:
      visit.visitorFamilyName || visit.visitorGivenName || visit.visitorEmail
        ? {
            familyName: visit.visitorFamilyName || undefined,
            givenName: visit.visitorGivenName || undefined,
            phone: visit.visitorPhone,
            email: visit.visitorEmail,
          }
        : undefined,
  };

  return {
    ok: true,
    status: "valid",
    httpStatus: 200,
    data,
  };
}
