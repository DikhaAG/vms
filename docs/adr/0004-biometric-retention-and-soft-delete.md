---
status: accepted
---

# Indefinite Biometric Storage with Soft-Delete and Immediate Hardware Revocation

We will retain visitor identification details and encrypted face photos permanently in the local application database with a soft-delete capability (to enable instant recognition, profile re-use, and fast pre-registration for returning visitors), while immediately revoking and unassigning physical terminal credentials in HikCentral upon Visit check-out.

## Considered Options

- **Ephemeral Storage (Purge on Check-out)**: Delete visitor biometrics and identification completely when a visit concludes, requiring visitors to re-register and re-upload photos for every visit.
- **Indefinite Storage with Soft-Delete and Hardware De-sync**: Keep visitor biometric records in the local database with soft-delete flags for returning visits, but enforce strict physical de-authorization on HikCentral terminal hardware immediately when `checkOut` is invoked.

## Consequences

- Returning visitors can be invited or pre-registered in seconds without repeating photo enrollment, and audit logs maintain photographic history.
- Soft-delete allows manual removal of individual visitor records upon compliance or user request.
- Physical access remains strictly time-bounded: even though the photo is retained in the VMS database, the visitor has zero physical door or turnstile access once checked out or outside the scheduled window.

