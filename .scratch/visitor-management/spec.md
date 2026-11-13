---
Status: ready-for-agent
---

# Specification: Enterprise Visitor Management System (VMS) with HikCentral Integration

## Problem Statement

Enterprises with physical facilities (corporate offices, branches, and multi-tenant commercial buildings) struggle to manage visitor lifecycles securely, efficiently, and with auditability. When visitors arrive without prior coordination, receptionists face long queues, manual paper logs, and tedious phone calls to locate hosts. Furthermore, granting physical access cards or badges introduces high hardware loss rates, unauthorized pass-sharing, and security blind spots regarding whether a visitor has overstayed or accessed unauthorized floors.

Manual processes also fail when enterprises operate across multiple locations with different local timezones, or when group visits (such as vendor teams or delegation tours) arrive. Coordinating biometric facial recognition and QR-based credentials across heterogeneous physical access terminals requires deep hardware orchestration that front-desk staff cannot perform manually. Security teams need guaranteed enforcement: every visitor must be sponsored by an accountable host, vetted through an approval workflow, checked against security monitoring lists, granted precisely scoped access levels and tap quotas, and immediately de-authorized the moment they check out or overstay their welcome.

## Solution

The Enterprise Visitor Management System (VMS) provides an end-to-end, multi-facility SaaS platform built on Next.js 16 and PostgreSQL, with HikCentral Professional OpenAPI V3.1.1 serving as the physical execution engine.

1. **Multi-Facility & Timezone Governance**: Administrators can manage single or multiple facilities, each bound to its canonical IANA timezone (e.g. `Asia/Jakarta`, `Asia/Makassar`) and mapped to physical HikCentral access points. Timestamps are stored in UTC and accurately converted to local timezone offsets for physical terminal synchronization.
2. **Dual-Channel Registration**: Hosts can pre-register individual visitors or multi-visitor groups directly within the internal portal, or generate secure, single-use Self-Registration Links sent to visitors. Visitors can fill their identity details and capture/upload compliant face photos before arriving on site.
3. **Biometric Face & Dynamic QR Credentials**: Face photos are automatically normalized into compliant Base64 JPEG (10–100 KB) for HikCentral face terminals, with optional MinMoe quality checks. Visitors also receive time-bounded, dynamic QR passes and PIN credentials with configurable tap quotas (single-use, multi-use, or unlimited during visiting hours).
4. **Mandatory Approval & Blacklist Guardrails**: Pre-registrations flow through an approval chain (Host supervisor or Security) before physical credentials are activated. The system automatically screens identity numbers (`certificateNo`) against HikCentral Monitoring Lists, immediately halting unauthorized visits for security review.
5. **Real-time Terminal Sync & Door Tap Auditing**: Receptionists monitor live synchronization status to physical controllers (`Applied`, `Syncing`, `Failed`) with one-click retry. VMS tracks door tap counts against allocated quotas, triggering automatic credential revocation when limits are reached.
6. **Overstay Protection & Instant Check-out**: An active visit dashboard tracks on-premise attendance, highlights overstay visits exceeding configurable grace periods, alerts security, and allows single-click normal or force check-out, which immediately revokes terminal permissions while safely retaining visitor profiles for returning visits.

## User Stories

### Multi-Facility & Administration

1. As a Super Admin, I want to onboard multiple facilities with their respective names, physical addresses, and canonical IANA timezones, so that scheduling and access control function reliably across diverse regional branches.
2. As a Super Admin, I want to configure the HikCentral gateway connection and default parameters per facility, so that each facility communicates with its designated physical access infrastructure.
3. As an Administrator, I want to manage internal user accounts with roles (Super Admin, Host, Receptionist, Approver), so that employees and security operators have appropriate role-based access.
4. As an Administrator, I want to trigger a one-click or scheduled sync of employee records from HikCentral's person directory into the local Host directory, so that employees do not have to be manually entered twice.
5. As an Administrator, I want to configure the facility's Overstay Grace Period (in minutes), so that security is only alerted after a reasonable tolerance threshold.

### Scheduling & Registration (Dual-Channel & Group)

6. As a Host, I want to pre-register an upcoming visitor by specifying their name, identity number, contact details, visit purpose, access levels, and scheduled start/end times in the facility's local timezone, so that their visit is planned in advance.
7. As a Host, I want to register a Group Visit with multiple visitors under a single booking, so that vendor delegations or client teams can be invited together with a shared host and schedule.
8. As a Host, I want to generate a secure, time-bounded Self-Registration Link and share it with an invited visitor, so that the visitor can complete their own personal details and photo enrollment before arriving.
9. As a Visitor opening a Self-Registration Link, I want to view my visit invitation details, verify my host and visiting window, and input my identity and contact information, so that my host is aware of my details.
10. As a Visitor using the Self-Registration portal on mobile or desktop, I want to take a live selfie or upload an existing face photo with clear guidelines, so that my facial recognition credential can be prepared prior to arrival.
11. As a Receptionist, I want to create a Walk-in visit for a guest who arrives without a prior reservation, selecting an available Host and assigning immediate access, so that unscheduled visitors can be processed swiftly at the front desk.
12. As a Host, I want to update or reschedule a pre-registered visit before it is approved, so that changes in meeting plans are reflected accurately in the system.
13. As a Host, I want to cancel a scheduled visit, so that pending access requests are discarded and terminal credentials are never issued.

### Biometric Normalization & Access Credentials

14. As a Receptionist or Host uploading a visitor's face photo, I want the system to automatically crop, resize, and compress the image into a JPEG between 10 KB and 100 KB, so that HikCentral and terminal hardware accept the photo without rejection.
15. As a System, I want to invoke HikCentral's face quality check when target MinMoe terminals are configured, falling back gracefully to standard image validation when non-MinMoe terminals are used, so that enrollment is robust across hardware types.
16. As a Receptionist, I want to view the terminal synchronization status of a visitor's face and QR credentials, so that I can verify that turnstiles and doors are ready before directing the visitor into the building.
17. As a Receptionist, I want to click a "Retry Sync" button when hardware synchronization fails or experiences network delays, so that credentials can be pushed immediately without recreating the visit.
18. As a Visitor, I want to view and download a digital QR Pass (or receive it via email), so that I can scan it at turnstiles and doors equipped with QR readers as an alternative or complement to face recognition.
19. As a Security Admin, I want to set a Tap Quota per visit (e.g. 1 entry, 2 entries, or unlimited during visiting hours), so that visitors cannot enter high-security areas more times than authorized.

### Dynamic Access Levels & Zones

20. As a Security Admin, I want to create and manage dynamic Access Levels in the web interface by selecting physical doors, elevator floors, and time schedule templates from HikCentral, so that permission bundles match company access policies.
21. As a Host or Receptionist, I want to select one or more Access Levels when creating or editing a visit, so that visitors only receive access to the exact areas required for their meeting.

### Approval Workflow & Security Screening

22. As an Approver, I want to receive and review pending visit requests from my department or facility, inspecting visitor details, host information, and requested access zones, so that unauthorized access requests are rejected.
23. As an Approver, I want to approve or reject a visit with optional feedback comments, so that approved visits advance to credential activation while rejected visits are cleanly closed.
24. As a Security Officer, I want the system to automatically screen visitor identity numbers against HikCentral Monitoring Lists (Blacklists), so that prohibited individuals are automatically intercepted and flagged for security intervention.
25. As a Security Officer, I want an escalation queue for visits flagged by the Monitoring List, so that security personnel can manually investigate before any access is granted.

### Check-in, Active Monitoring & Check-out

26. As a Receptionist, I want a fast search tool (by name, phone, identity number, or QR scan) to look up arriving visitors, verify their photo and identity document, and complete Check-in with a single click.
27. As a System, I want approved visitors with valid face biometrics to be able to enter directly through gate turnstiles during their scheduled visit window when the facility policy permits direct gate access, so that lobby congestion is minimized.
28. As a Security Officer, I want an Active Visitors dashboard showing all guests currently on-premise, their entry times, authorized zones, host details, and cumulative door tap counts.
29. As a Security Officer, I want an Overstay alert badge and filter that highlights visitors who remain on-premise beyond their scheduled visit end time plus the Overstay Grace Period, so that security can take immediate action.
30. As a Receptionist or Security Officer, I want to trigger Check-out or Force Check-out for any visitor, immediately revoking all terminal permissions and door access across all physical hardware.
31. As a System, I want to automatically monitor door tap events and execute automatic check-out / credential revocation once a visitor reaches their allocated Tap Quota, preventing unauthorized re-entry.

### Biometric Retention, Privacy & Returning Visitors

32. As a Host or Receptionist, I want returning visitors to be automatically suggested when entering their identity number, so that their previous contact details and approved face photo can be re-used without repeating registration.
33. As an Administrator, I want the ability to soft-delete a visitor's profile and biometric record upon request, so that data privacy compliance (e.g. personal data protection regulations) is upheld while maintaining historical visit audit logs.

## Implementation Decisions

### Modules & Boundaries

- **Local Application Database (`VMS Core DB`)**: PostgreSQL with Prisma or Drizzle ORM managing `Tenant`, `Facility`, `User`, `Visitor`, `Visit`, `AccessLevel`, `Credential`, and `VisitEvent` tables.
- **HikCentral Integration Gateway (`hikcentral-gateway`)**: Built directly on top of the established `src/lib/hikcentral/{client.ts,signature.ts}`, providing typed, fault-tolerant adapters for HikCentral OpenAPI V3.1.1 endpoints:
  - Visitor Appointment: `POST /artemis/api/visitor/v2/appointment`, `POST /artemis/api/visitor/v2/appointment/update`, `POST /artemis/api/visitor/v1/appointment/single/delete`.
  - Visitor Check-in & Out: `POST /artemis/api/visitor/v1/registerment`, `POST /artemis/api/visitor/v1/registerment/update`, `POST /artemis/api/visitor/v1/visitor/out`.
  - QR Code & Status: `POST /artemis/api/visitor/v1/visitor/qr/get`, `POST /artemis/api/visitor/v1/pincode/get`, `POST /artemis/api/visitor/v1/appointment/getVisitorStatus`.
  - Biometric Quality & Sync: `POST /artemis/api/acs/v1/faceCheck`, `POST /artemis/api/visitor/v1/auth/reapplication`, `POST /artemis/api/visitor/v1/person/ID/elementDownloadDetail`, `POST /artemis/api/acs/v1/auth/applicationResult`.
  - Access Level Management: `POST /artemis/api/acs/v1/privilege/group` (`type: 2`), `POST /artemis/api/acs/v1/privilege/group/{add,update,delete}`.
  - Resource Synchronization: `POST /artemis/api/resource/v1/person/advance/personList`, `POST /artemis/api/resource/v1/acsDoor/advance/acsDoorList`.
- **Photo Processing Pipeline (`image-normalizer`)**: Clientside/serverside canvas-based or Sharp image normalizer that ingests user selfies/uploads, validates aspect ratio, and outputs Base64 JPEG strings strictly between 10 KB and 100 KB without data URI prefixes when passing to HikCentral.
- **Timezone Orchestrator (`timezone-orchestrator`)**: Encapsulates UTC storage and conversions using `date-fns-tz` or native `Intl`, resolving a facility's IANA timezone and outputting ISO 8601 strings with exact offset (e.g. `2026-11-13T09:00:00+07:00`) for HikCentral requests.
- **Self-Registration Portal (`self-reg-portal`)**: Public-facing, responsive web routes (`/invite/[token]`) protected by cryptographically secure, expiring tokens, allowing visitors to submit identity information and capture camera selfies securely without accessing internal systems.
- **Audit & Quota Monitor (`tap-quota-monitor`)**: Background or event-driven evaluator that periodically pulls or receives door access events (`POST /artemis/api/acs/v1/door/events`), counts entry events per visit, and triggers `visitor/out` when `tapCount >= tapQuota`.

### Architectural Contracts & State Machine

The lifecycle of a `Visit` transitions strictly through the following states:
```
DRAFT -> PENDING_APPROVAL -> APPROVED -> CHECKED_IN -> CHECKED_OUT
                   |            |             |
                REJECTED    CANCELLED      OVERSTAY
```
- `appointRecordId` mutability: Per HikCentral API specifications, `appointRecordId` changes whenever a reservation or registration is updated. The database stores the latest active `appointRecordId` while using internal UUIDs for immutable visit tracking.
- Biometric retention: Visitor biometrics and profiles are persisted in the local database with `isDeleted` soft-delete flags. De-authorization at check-out is achieved strictly by invoking `v1/visitor/out` on HikCentral, which removes hardware privileges across all physical access controllers while preserving profile data.

## Testing Decisions

- **Good Test Philosophy**: Tests must exercise external domain behavior, API contracts, and state transitions without asserting against private internal implementation details. Network boundaries to HikCentral and external databases must be mocked with realistic responses based directly on the OpenAPI V3.1.1 developer guide.
- **Primary Test Seam (VMS Core Application Service)**: Test the orchestration seam (`VmsService` / command handlers) with in-memory or transactional database drivers and an injectable `HikCentralClient` transport. Scenarios verify:
  - Visit pre-registration correctly maps UTC timestamps to target facility IANA offsets in ISO 8601 format.
  - Photo normalization enforces JPEG format and 10–100 KB payload bounds.
  - Group visits correctly generate individual visitor registrations linked by a shared `visitorGroupName`.
  - Approval state transitions only permit check-in and hardware sync once approved.
  - Check-out triggers HikCentral `v1/visitor/out` and records duration.
  - Overstay detection correctly computes `visitEndTime + overstayGracePeriod` relative to facility local time.
- **Secondary Test Seam (Route Handlers & Public Self-Reg API)**: Next.js Route Handlers (`POST /api/vms/...`, `POST /api/self-reg/...`) tested via `Request -> Response` integration tests verifying schema validation, HTTP error codes (`400`, `401`, `404`, `422`, `502`), and secret sanitization (no leaked HikCentral app secrets or internal tokens).
- **Prior Art in Codebase**:
  - `src/lib/hikcentral/client.test.ts` (mock transport integration pattern).
  - `src/lib/hikcentral/version.test.ts` (stub scenarios, dependency injection, and error mapping).
  - `src/app/api/hikcentral/version/route.test.ts` (route handler HTTP contract testing).

## Out of Scope

- Native desktop/mobile apps (iOS/Android native binaries); the UI is 100% responsive web accessible via modern browsers on desktop, tablet, and mobile.
- Custom hardware firmware flashing or direct serial/RS-485 device communication (all physical device interactions occur exclusively through HikCentral Professional OpenAPI).
- Enterprise Single Sign-On (SAML 2.0 / OIDC / Azure AD / Okta) integrations; authentication is managed internally via local RBAC in the MVP, with architecture prepared for future SSO plugins.
- Paid third-party SMS/WhatsApp gateway integrations (visitor passes are delivered via web UI, downloadable/printable cards, and standard SMTP email).
- Physical visitor badge printing driver integration (web printable format provided; ESC/POS thermal badge printer network protocols deferred to future hardware add-on).

## Further Notes

- The project's domain vocabulary defined in `GLOSSARY.md` must be respected in all code, comments, and schemas (`Facility`, `Visitor`, `Host`, `Receptionist`, `Approver`, `Visit`, `Group Visit`, `Pre-registration`, `Self-Registration Link`, `Walk-in`, `Access Level`, `Credential`, `Tap Quota`, `Overstay`, `Overstay Grace Period`, `Facility Timezone`, `Monitoring List`).
- All four accepted ADRs (`0001-hybrid-state-and-hikcentral-execution.md`, `0002-facility-timezone-and-utc-storage.md`, `0003-multi-facility-saas-architecture.md`, `0004-biometric-retention-and-soft-delete.md`) govern this specification.

