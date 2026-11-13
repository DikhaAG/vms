# Visitor Management System (VMS)

Enterprise visitor scheduling, approval, arrival verification, and time-bounded physical access management powered by facial recognition and QR credentials.

## Language

### Actors

**Visitor**:
An external person invited to or arriving at a facility for a temporary stay.
_Avoid_: Guest, Person, Client

**Host**:
An internal employee who invites or sponsors a Visitor and is accountable for the visit.
_Avoid_: Receptionist, Interviewee, Invitee

**Receptionist**:
A front-desk or security operator who processes walk-in arrivals, verifies identity, captures face photos, and manages check-in and check-out.
_Avoid_: Host, Operator, Attendant

**Approver**:
A user (the Host's manager or a Security Officer) authorized to approve or reject a Visit before Credential activation.
_Avoid_: Reviewer, Manager, Authorizer

### Core Concepts

**Facility**:
A distinct physical site, building, or branch managed within the system, configured with its own IANA timezone and physical access points.
_Avoid_: Site, Building, Location, Branch

**Visit**:
A bounded attendance by one Visitor during an explicit time window in a facility's local timezone, progressing through scheduling, approval, check-in, and check-out.
_Avoid_: Appointment, Booking, Session

**Group Visit**:
A collective Visit booking sharing a common Host, schedule, and purpose across multiple Visitors under a unified group name.
_Avoid_: Batch visit, Team booking, Delegation

**Pre-registration**:
A Visit scheduled in advance before the Visitor arrives on site.
_Avoid_: Reservation, Advance booking

**Self-Registration Link**:
A secure, time-bounded, single-use public web URL generated for a Visitor to submit identification details and a face photo prior to arrival.
_Avoid_: Invitation link, Guest link, Token form

**Walk-in**:
An unscheduled Visit created at the front desk when a Visitor arrives without an existing Pre-registration.
_Avoid_: Ad-hoc visit, Drop-in

**Access Level**:
A dynamically managed permission bundle specifying which physical doors, elevator floors, and time schedules apply to a Visit.
_Avoid_: Privilege group, Access role, Zone

**Credential**:
A time-bounded authentication token—primarily a face photo, or a QR code or PIN—issued for a Visit to unlock physical terminals.
_Avoid_: Badge, Pass, Certificate

**Tap Quota**:
The maximum number of authorized physical door entries allowed for a Credential during a Visit (or unlimited during visiting hours).
_Avoid_: Access count, Scan limit, Tap limit

**Overstay**:
The state when a Visitor has not checked out after the Visit's scheduled end time in the facility's local timezone and exceeds the Overstay Grace Period.
_Avoid_: Expired visit, Late departure, Timeout

**Overstay Grace Period**:
The configurable duration after scheduled visit end time before an uncleared Visit triggers a security Overstay alert.
_Avoid_: Tolerance time, Delay buffer, Overstay threshold

**Facility Timezone**:
The canonical IANA timezone identifier assigned to a Facility governing Visit scheduling and hardware synchronization.
_Avoid_: Server timezone, Client timezone, Local time

**Monitoring List**:
A security register of individuals flagged for denied entry or mandatory security review.
_Avoid_: Blacklist, Blocklist, Watchlist

**Fast-Track Auto Check-In**:
The automated transition of an approved Visit to checked-in status upon the first successful biometric or QR scan at a designated Perimeter Door during the scheduled appointment window without receptionist intervention.
_Avoid_: Touchless entry, Direct check-in, Auto-entry, Skip reception

**Perimeter Door**:
An outer entry or exit point (such as a lobby speedgate or exterior turnstile) that defines the physical boundary between the outside world and the secured facility interior.
_Avoid_: Outer door, External gate, Boundary point

**Door Directionality**:
The hardware access configuration of a physical door, distinguishing between Dual-Direction (readers on both entry and exit) and Single-Direction In (reader on entry, unauthenticated push-to-exit button or sensor on exit).
_Avoid_: Door type, One-way door, Bi-directional door

**Implicit Room Transition**:
The logical deduction that a Visitor has exited a Single-Direction room upon scanning into a different room or area, updating active physical location without requiring an unattainable exit scan.
_Avoid_: Invisible exit, Ghost exit, Auto-departure, Zone hop

**Emergency Access Grant**:
A time-bounded, justification-backed temporary permission granted to an active Visit for specific physical doors outside their default Access Level, with automatic hardware synchronization and revocation upon expiration or check-out.
_Avoid_: Ad-hoc access, Temporary privilege, Over-ride, Elevation pass



