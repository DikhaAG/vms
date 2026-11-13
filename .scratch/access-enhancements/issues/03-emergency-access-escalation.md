# 03: Time-Bounded Emergency Access Escalation

**What to build:** Provide security officers and hosts with the ability to grant immediate, temporary access to additional doors or rooms for an active visit on-the-fly. The grant requires a documented business justification, specifies an explicit expiration timestamp (e.g. 1 to 4 hours), synchronizes privileges to HikCentral access controllers immediately, permits door taps on the designated doors while active, and automatically revokes access upon expiration or visit check-out.

**Blocked by:** 01: Door Topology Metadata & Implicit Room Transitions

**Status:** ready-for-agent

- [ ] Domain contract defines `EmergencyAccessGrant` (`id`, `visitId`, `doorIndexCodes`, `doorNames`, `grantedByUserId`, `grantedByName`, `reason`, `grantedAtUtc`, `expiresAtUtc`, `status: "ACTIVE" | "EXPIRED" | "REVOKED"`).
- [ ] HTTP endpoint `POST /api/vms/active-visits/[visitId]/emergency-access` validates operator credentials, reason string (minimum 10 characters), and valid expiration window within visit schedule.
- [ ] Active monitoring service applies the emergency grant to the visit and invokes the HikCentral adapter to synchronize hardware controller privileges immediately.
- [ ] Door tap access evaluation honors doors from active emergency grants in addition to standard access levels.
- [ ] HTTP endpoint `DELETE /api/vms/active-visits/[visitId]/emergency-access/[grantId]` permits early manual revocation by authorized operators.
- [ ] Check-out workflow (`performCheckOut`) automatically sets all active emergency grants for the visit to `REVOKED` and de-authorizes terminal privileges on hardware.
- [ ] Service and route unit tests verify emergency grant creation, HikCentral sync dispatch, tap permission verification, early manual revocation, and automatic check-out revocation.
