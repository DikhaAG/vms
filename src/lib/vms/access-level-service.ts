import { randomUUID } from "node:crypto";
import {
  validateAccessLevelInput,
  validateUpdateAccessLevelInput,
  type AccessLevel,
  type CreateAccessLevelInput,
  type UpdateAccessLevelInput,
} from "./access-level-contract";
import { defaultVmsRepository, type IVmsRepository } from "./repository";
import {
  createVisitorPrivilegeGroup,
  updateVisitorPrivilegeGroup,
  deleteVisitorPrivilegeGroup,
} from "./hikcentral-access-level-adapter";
import { HikCentralError } from "../hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "./vms-contract";

export interface AccessLevelServiceDeps {
  repository?: IVmsRepository;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  idGenerator?: () => string;
}

export type AccessLevelErrorKind =
  | "validation"
  | "not_found"
  | "config"
  | "upstream";

export interface AccessLevelError {
  kind: AccessLevelErrorKind;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
  code?: string;
}

export interface AccessLevelResult {
  ok: boolean;
  accessLevel?: AccessLevel;
  error?: AccessLevelError;
}

export interface DeleteAccessLevelResult {
  ok: boolean;
  error?: AccessLevelError;
}

/**
 * Lists access levels, optionally filtered by facility.
 */
export async function listAccessLevelsService(
  filter: { facilityId?: string } = {},
  deps: AccessLevelServiceDeps = {},
): Promise<AccessLevel[]> {
  const repository = deps.repository ?? defaultVmsRepository;
  return repository.listAccessLevels(filter.facilityId);
}

/**
 * Retrieves a single access level by ID.
 */
export async function getAccessLevelService(
  id: string,
  deps: AccessLevelServiceDeps = {},
): Promise<AccessLevel | undefined> {
  const repository = deps.repository ?? defaultVmsRepository;
  return repository.getAccessLevel(id);
}

/**
 * Validates, registers with HikCentral, and persists a new Access Level.
 */
export async function createAccessLevelService(
  rawInput: unknown,
  deps: AccessLevelServiceDeps = {},
): Promise<AccessLevelResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const generateId = deps.idGenerator ?? randomUUID;
  const mode = deps.mode ?? "stub";

  // 1. Validate payload
  const validation = validateAccessLevelInput(rawInput);
  if (!validation.valid) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Access level validation failed.",
        fieldErrors: validation.errors,
      },
    };
  }

  const input: CreateAccessLevelInput = validation.input;

  // 2. Validate facility existence only if facilityId is provided
  if (input.facilityId) {
    const facility = await repository.getFacility(input.facilityId);
    if (!facility) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          message: `Facility '${input.facilityId}' not found.`,
        },
      };
    }
  }

  // 3. Generate ID and prepare access level
  const id = `acc-${generateId().slice(0, 8)}`;
  const now = new Date().toISOString();

  // 4. Synchronize with HikCentral OpenAPI
  try {
    await createVisitorPrivilegeGroup(
      {
        privilegeGroupId: id,
        privilegeGroupName: input.name,
        description: input.description,
        isDefault: input.isDefault ? 1 : 0,
        timeScheduleIndexCode: String(input.timeScheduleId),
      },
      {
        mode,
        stubScenario: deps.stubScenario,
      },
    );
  } catch (error) {
    const isHik = error instanceof HikCentralError;
    return {
      ok: false,
      error: {
        kind: isHik && error.kind === "config" ? "config" : "upstream",
        message:
          error instanceof Error
            ? error.message
            : "Failed to synchronize privilege group with HikCentral.",
        status: isHik ? error.status : undefined,
        code: isHik ? error.code : undefined,
      },
    };
  }

  // 5. Persist into local repository
  const accessLevel: AccessLevel = {
    id,
    ...(input.facilityId ? { facilityId: input.facilityId } : {}),
    name: input.name,
    description: input.description ?? "",
    doors: input.doors,
    floors: input.floors,
    timeScheduleId: input.timeScheduleId,
    isDefault: Boolean(input.isDefault),
    createdAtUtc: now,
    updatedAtUtc: now,
  };

  await repository.saveAccessLevel(accessLevel);

  return {
    ok: true,
    accessLevel,
  };
}

/**
 * Updates an existing Access Level and synchronizes updates with HikCentral.
 */
export async function updateAccessLevelService(
  id: string,
  rawUpdates: unknown,
  deps: AccessLevelServiceDeps = {},
): Promise<AccessLevelResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const mode = deps.mode ?? "stub";

  const existing = await repository.getAccessLevel(id);
  if (!existing) {
    return {
      ok: false,
      error: {
        kind: "not_found",
        message: `Access level '${id}' not found.`,
      },
    };
  }

  const validation = validateUpdateAccessLevelInput(rawUpdates);
  if (!validation.valid) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Access level update validation failed.",
        fieldErrors: validation.errors,
      },
    };
  }

  const updates: UpdateAccessLevelInput = validation.input;

  // If facility changed, verify new facility exists
  if (updates.facilityId && updates.facilityId !== existing.facilityId) {
    const facility = await repository.getFacility(updates.facilityId);
    if (!facility) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          message: `Facility '${updates.facilityId}' not found.`,
        },
      };
    }
  }

  // Sync to HikCentral
  try {
    await updateVisitorPrivilegeGroup(
      {
        privilegeGroupId: id,
        privilegeGroupName: updates.name ?? existing.name,
        description: updates.description ?? existing.description,
        isDefault:
          updates.isDefault !== undefined
            ? updates.isDefault
              ? 1
              : 0
            : existing.isDefault
              ? 1
              : 0,
        timeScheduleIndexCode: String(
          updates.timeScheduleId ?? existing.timeScheduleId,
        ),
      },
      {
        mode,
        stubScenario: deps.stubScenario,
      },
    );
  } catch (error) {
    const isHik = error instanceof HikCentralError;
    return {
      ok: false,
      error: {
        kind: isHik && error.kind === "config" ? "config" : "upstream",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update privilege group on HikCentral.",
        status: isHik ? error.status : undefined,
        code: isHik ? error.code : undefined,
      },
    };
  }

  const updated: AccessLevel = {
    ...existing,
    ...updates,
    updatedAtUtc: new Date().toISOString(),
  };

  await repository.saveAccessLevel(updated);

  return {
    ok: true,
    accessLevel: updated,
  };
}

/**
 * Deletes an Access Level and removes it from HikCentral.
 */
export async function deleteAccessLevelService(
  id: string,
  deps: AccessLevelServiceDeps = {},
): Promise<DeleteAccessLevelResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const mode = deps.mode ?? "stub";

  const existing = await repository.getAccessLevel(id);
  if (!existing) {
    return {
      ok: false,
      error: {
        kind: "not_found",
        message: `Access level '${id}' not found.`,
      },
    };
  }

  try {
    await deleteVisitorPrivilegeGroup(id, {
      mode,
      stubScenario: deps.stubScenario,
    });
  } catch (error) {
    const isHik = error instanceof HikCentralError;
    return {
      ok: false,
      error: {
        kind: isHik && error.kind === "config" ? "config" : "upstream",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete privilege group from HikCentral.",
        status: isHik ? error.status : undefined,
        code: isHik ? error.code : undefined,
      },
    };
  }

  await repository.deleteAccessLevel(id);

  return { ok: true };
}

/**
 * Resolves the access levels a visit grants: the explicit selection, or the
 * building's default levels when none are selected. Names come from the
 * repository, falling back to a generic label for unknown ids.
 */
export async function resolveVisitAccessLevels(
  repository: IVmsRepository,
  selectedIds: string[] | undefined,
): Promise<{
  accessLevelIds: string[] | undefined;
  accessLevels: Array<{ id: string; name: string }> | undefined;
}> {
  const allAccessLevels = await repository.listAccessLevels();
  let accessLevelIds = selectedIds;
  if (!accessLevelIds || accessLevelIds.length === 0) {
    const defaultLevels = allAccessLevels.filter((al) => al.isDefault);
    if (defaultLevels.length > 0) {
      accessLevelIds = defaultLevels.map((al) => al.id);
    }
  }

  if (!accessLevelIds || accessLevelIds.length === 0) {
    return { accessLevelIds, accessLevels: undefined };
  }
  const levelMap = new Map(allAccessLevels.map((al) => [al.id, al.name]));
  return {
    accessLevelIds,
    accessLevels: accessLevelIds.map((id) => ({
      id,
      name: levelMap.get(id) ?? "Access Level",
    })),
  };
}
