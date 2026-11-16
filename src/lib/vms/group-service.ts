import { randomUUID } from "node:crypto";
import {
  validateGroupVisitInput,
  type GroupVisitInput,
  type GroupVisitResult,
  type MemberVisitResult,
  type VisitorProfile,
} from "./group-contract";
import { DEFAULT_SYSTEM_SETTINGS, type Visit } from "./vms-contract";
import { formatFacilityIso, parseLocalDateTimeToUtc } from "./timezone";
import {
  dispatchHikCentralAppointment,
  type DispatchAppointmentOptions,
  type HikCentralAppointmentParams,
  type HikCentralAppointmentSuccess,
} from "./hikcentral-appointment-adapter";
import { defaultVmsRepository, type IVmsRepository } from "./repository";
import { resolveVisitAccessLevels } from "./access-level-service";
import { toJpegDataUri } from "./face-normalizer";
import { parseMonitoringListFlag } from "./hikcentral-approval-adapter";

export interface GroupServiceDeps {
  repository?: IVmsRepository;
  appointmentDispatcher?: (
    params: HikCentralAppointmentParams,
    options?: DispatchAppointmentOptions,
  ) => Promise<HikCentralAppointmentSuccess>;
  idGenerator?: () => string;
  now?: () => Date;
}

/**
 * Creates a multi-visitor Group Visit booking.
 * Validates group details, converts schedule to the global system timezone,
 * calls HikCentral OpenAPI individually per visitor under the unified visitorGroupName,
 * handles partial failures gracefully, persists visits and visitor profiles.
 */
export async function createGroupVisit(
  rawInput: GroupVisitInput,
  deps: GroupServiceDeps = {},
): Promise<GroupVisitResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const dispatchAppointment =
    deps.appointmentDispatcher ?? dispatchHikCentralAppointment;
  const generateId = deps.idGenerator ?? randomUUID;
  const getNow = deps.now ?? (() => new Date());

  // 1. Validate input payload
  const validation = validateGroupVisitInput(rawInput);
  if (!validation.valid) {
    const errorMessages = Object.entries(validation.errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    throw new Error(`Group visit input validation failed: ${errorMessages}`);
  }

  const input = validation.input;

  // 2. Single site: schedule against the global system timezone
  const settings = await repository.getSettings();
  const timezone = settings?.timezone || DEFAULT_SYSTEM_SETTINGS.timezone;

  // 3. Timezone conversion and normalization
  const startUtc = parseLocalDateTimeToUtc(input.scheduledStartTime, timezone);
  const endUtc = parseLocalDateTimeToUtc(input.scheduledEndTime, timezone);
  const scheduledStartTimeFacility = formatFacilityIso(startUtc, timezone);
  const scheduledEndTimeFacility = formatFacilityIso(endUtc, timezone);

  // 4. Resolve flat building access levels (fallback to defaults when none selected)
  const {
    accessLevelIds: effectiveAccessLevelIds,
    accessLevels: resolvedAccessLevels,
  } = await resolveVisitAccessLevels(repository, input.accessLevelIds);

  const qrCodeValidNum =
    input.tapQuota?.mode === "limited"
      ? (input.tapQuota.maxTaps ?? 1)
      : 0;

  // 5. Generate unified groupId
  const groupId = `grp-${generateId()}`;
  const currentTimeIso = getNow().toISOString();

  const memberVisits: MemberVisitResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  // 6. Iterate through each visitor in group
  for (const visitor of input.visitors) {
    const visitorName =
      `${visitor.visitorGivenName} ${visitor.visitorFamilyName}`.trim();
    const normalizedFacePhoto = visitor.facePhoto
      ? toJpegDataUri(visitor.facePhoto)
      : undefined;

    try {
      const hikResult = await dispatchAppointment(
        {
          hostId: input.hostId,
          appointStartTime: scheduledStartTimeFacility,
          appointEndTime: scheduledEndTimeFacility,
          visitReasonType: input.visitReasonType,
          visitReasonDetail: input.visitReasonDetail,
          visitorGroupName: input.visitorGroupName,
          visitorFamilyName: visitor.visitorFamilyName,
          visitorGivenName: visitor.visitorGivenName,
          visitorPhone: visitor.visitorPhone,
          visitorEmail: visitor.visitorEmail,
          certificateType: visitor.certificateType,
          certificateNo: visitor.certificateNo,
          facePhotoData: normalizedFacePhoto,
          accessLevels: resolvedAccessLevels,
          qrCodeValidNum,
        },
        {
          mode: input.mode,
          stubScenario: input.stubScenario,
        },
      );

      const monitoringFlag = parseMonitoringListFlag(hikResult);
      const visitStatus = monitoringFlag
        ? "SECURITY_ESCALATED"
        : "PENDING_APPROVAL";

      const visitId = generateId();
      const visit: Visit = {
        id: visitId,
        groupId,
        visitorGroupName: input.visitorGroupName,
        hostId: input.hostId,
        hostName: input.hostName,
        visitorFamilyName: visitor.visitorFamilyName,
        visitorGivenName: visitor.visitorGivenName,
        visitorPhone: visitor.visitorPhone,
        visitorEmail: visitor.visitorEmail,
        certificateType: visitor.certificateType,
        certificateNo: visitor.certificateNo,
        visitReasonType: input.visitReasonType,
        visitReasonDetail: input.visitReasonDetail,
        scheduledStartTimeUtc: startUtc.toISOString(),
        scheduledEndTimeUtc: endUtc.toISOString(),
        scheduledStartTimeFacility,
        scheduledEndTimeFacility,
        status: visitStatus,
        monitoringListFlag: monitoringFlag,
        facePhoto: normalizedFacePhoto,
        accessLevelIds: effectiveAccessLevelIds,
        tapQuota: input.tapQuota,
        credentialSyncStatus: "Applied",
        hikCentral: {
          appointRecordId: hikResult.appointRecordId,
          visitorId: hikResult.visitorId,
          appointCode: hikResult.appointCode,
          qrCodeImage: hikResult.qrCodeImage,
        },
        createdAtUtc: currentTimeIso,
        updatedAtUtc: currentTimeIso,
      };

      await repository.saveVisit(visit);

      // Save/update VisitorProfile if certificateNo is provided
      if (visitor.certificateNo) {
        const allProfiles = await repository.listVisitorProfiles({
          includeDeleted: true,
        });
        const existing = allProfiles.find(
          (p) => p.certificateNo === visitor.certificateNo,
        );

        const profile: VisitorProfile = {
          id: existing?.id ?? `prof-${generateId()}`,
          certificateType: visitor.certificateType ?? 111,
          certificateNo: visitor.certificateNo,
          fullName: visitorName,
          familyName: visitor.visitorFamilyName,
          givenName: visitor.visitorGivenName,
          phone: visitor.visitorPhone ?? existing?.phone,
          email: visitor.visitorEmail ?? existing?.email,
          facePhoto: normalizedFacePhoto ?? existing?.facePhoto,
          isDeleted: false,
          createdAtUtc: existing?.createdAtUtc ?? currentTimeIso,
          updatedAtUtc: currentTimeIso,
        };

        await repository.saveVisitorProfile(profile);
      }

      memberVisits.push({
        visitId,
        visitorName,
        status: visitStatus,
        appointCode: hikResult.appointCode,
        qrCodeImage: hikResult.qrCodeImage,
        certificateNo: visitor.certificateNo,
      });

      successCount++;
    } catch (err) {
      memberVisits.push({
        visitId: "",
        visitorName,
        status: "REJECTED",
        error:
          err instanceof Error ? err.message : "HikCentral appointment failed.",
        certificateNo: visitor.certificateNo,
      });

      failureCount++;
    }
  }

  return {
    groupId,
    visitorGroupName: input.visitorGroupName,
    memberVisits,
    successCount,
    failureCount,
  };
}

/**
 * Looks up a returning visitor by their certificate number (KTP, Passport, etc.).
 * Returns profile if found and not soft-deleted, enabling one-click auto-fill.
 */
export async function lookupReturningVisitor(
  certificateNo: string,
  deps: GroupServiceDeps = {},
): Promise<VisitorProfile | undefined> {
  const repository = deps.repository ?? defaultVmsRepository;
  return repository.findVisitorProfileByCertificate(certificateNo);
}

/**
 * Toggles the soft-delete state of a visitor profile for data privacy (PDP) compliance.
 */
export async function setProfileSoftDelete(
  id: string,
  isDeleted: boolean,
  reason?: string,
  deps: GroupServiceDeps = {},
): Promise<VisitorProfile> {
  const repository = deps.repository ?? defaultVmsRepository;
  return repository.softDeleteVisitorProfile(id, isDeleted, reason);
}
