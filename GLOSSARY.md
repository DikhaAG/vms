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

**Hardware Execution Notice**:
An explicit UI confirmation or status notification triggered when an operator action dispatches live commands directly to physical HikCentral gate controllers.
_Avoid_: Mock prompt, Toast popup, Dummy feedback

**Gateway Synchronization State**:
The verifiable condition indicating whether a Visit, credential, or door state has been successfully committed to the active HikCentral Artemis controller.
_Avoid_: Sync status, Cloud state, Connection flag

### Reusable UI Component Primitives

**UiButton**:
The canonical tactile button primitive encapsulating micro-bevel elevations (`cap-lift`, `cap-press`), Kinpaku corner radiuses (`rounded-[var(--ks-radius-md)]`), loading states, and standard variants (`primary`, `secondary`, `danger`, `ghost`).
_Avoid_: Raw HTML `<button>`, ad-hoc Tailwind button classes, unstyled buttons

**UiCard**:
The canonical surface container (`UiCard`, `UiCardHeader`, `UiCardContent`) rendering paper-raised backgrounds, hairline 1px borders, and standard padding.
_Avoid_: Ad-hoc white boxes, disparate border colors, raw divs with custom borders

**UiKpiCard & UiKpiGrid**:
The canonical telemetry and summary metric display primitive, featuring uppercase eyebrow labels, high-contrast monospace tabular numerals, semantic LED glow dots, and optional interactive filter selection.
_Avoid_: Static text widgets, unstandardized metric tiles, arbitrary counters

**UiFilterToolbar**:
The unified search, facility selection, and action control bar deployed across all operational list and monitoring views.
_Avoid_: Ad-hoc flex rows, disparate search inputs, fragmented filter bars

**UiBadge**:
The standardized status indicator linking domain visit and hardware states to centralized Indonesian translations (`idDict.statusBadges`) and illuminated LED dots.
_Avoid_: Hardcoded English pills, unlocalized badges, non-standard tag classes

**UiModal**:
The accessible, focus-trapped dialog primitive wrapping backdrop blur, escape key dismissal, standardized title headers, and action footers.
_Avoid_: Ad-hoc popups, window.confirm dialogs, non-trapped overlays

**PageHeader**:
The standard page header component rendering localized page title, optional eyebrow, subtitle, live status badge, actions slot, and integrated Indonesian user guide modal (`PageGuideModal`).
_Avoid_: Duplicate h1 tags, missing guide modals, inconsistent title bars

## Glosarium Bahasa Indonesia (Istilah Ramah Awam)

| Istilah Domain Asli | Istilah Bahasa Indonesia Awam | Penjelasan Ringkas untuk Pengguna |
|---|---|---|
| **Visitor** | **Tamu / Pengunjung** | Orang dari luar perusahaan/gedung yang berkunjung sementara. |
| **Host** | **Karyawan Tuan Rumah** | Karyawan internal yang mengundang, membuat janji temu, dan bertanggung jawab atas tamu. |
| **Receptionist** | **Petugas Resepsionis** | Staf meja depan yang melayani tamu datang langsung (*walk-in*), verifikasi identitas, dan cetak lencana/kartu akses. |
| **Approver** | **Pejabat Penyetuju / Atasan** | Manajer atau staf keamanan yang berhak menyetujui atau menolak permohonan kunjungan. |
| **Facility** | **Gedung / Lokasi Fasilitas** | Bangunan fisik tempat kunjungan berlangsung (misal: Kantor Pusat Jakarta, Cabang Bali, Gudang Jayapura). |
| **Visit** | **Kunjungan / Janji Temu** | Sesi kehadiran satu tamu dalam jangka waktu tertentu di suatu gedung. |
| **Pre-Registration** | **Pendaftaran Tamu Terjadwal** | Pendaftaran janji tamu di muka oleh karyawan sebelum tamu tiba di lokasi. |
| **Self-Registration Link** | **Tautan Pendaftaran Mandiri** | Tautan web khusus bagi tamu untuk mengisi data diri dan foto selfie dari smartphone sebelum datang. |
| **Walk-in** | **Tamu Datang Langsung** | Tamu yang datang mendadak ke meja resepsionis tanpa janji temu sebelumnya. |
| **Access Level** | **Hak Akses Pintu** | Paket izin pintu mana saja dan lantai berapa yang boleh dilewati oleh tamu. |
| **Tap Quota** | **Jatah Buka Pintu (Kuota Tap)** | Jumlah maksimal tamu boleh men-tap kartu/wajah di pintu putar selama masa kunjungan. |
| **Overstay** | **Melewati Batas Waktu Kunjungan** | Kondisi saat tamu belum keluar gedung melebihi batas toleransi jam kunjungan yang ditentukan. |
| **Overstay Grace Period** | **Toleransi Keterlambatan Pulang** | Waktu ekstra (misal 30 menit) sebelum sistem menandai tamu sebagai terlambat keluar (*overstay*). |
| **Fast-Track Auto Check-In** | **Masuk Otomatis Tanpa Antre** | Tamu yang sudah disetujui dapat langsung men-tap wajah/QR di pintu putar luar tanpa antre di resepsionis. |
| **Perimeter Door** | **Pintu Luar / Pintu Putar Lobi** | Pintu terluar gedung yang memisahkan area publik luar dengan area dalam gedung. |
| **Door Directionality** | **Arah Akses Pintu** | Pintu Dua Arah (*Dual-Direction*) vs Pintu Masuk Saja (*Single-Direction In* dengan tombol keluar). |
| **Implicit Room Transition** | **Perpindahan Ruangan Otomatis** | Sistem mendeteksi tamu telah keluar dari ruangan lama ketika men-tap di ruangan baru. |
| **Emergency Access Grant** | **Izin Akses Darurat Sementara** | Izin tambahan waktu terbatas (1-4 jam) untuk memasuki ruangan khusus yang awalnya tidak diizinkan. |
| **Monitoring List** | **Daftar Pantauan Keamanan** | Daftar orang yang dilarang masuk atau membutuhkan pemeriksaan keamanan ketat. |
| **Hardware Execution Notice** | **Pemberitahuan Eksekusi Hardware** | Konfirmasi atau notifikasi visual bahwa perintah telah diteruskan langsung ke mesin pintu/turnstile fisik gedung. |
| **Gateway Synchronization State** | **Status Sinkronisasi Gateway** | Status kepastian apakah data tiket, foto, atau hak akses sudah aktif di mesin HikCentral. |




