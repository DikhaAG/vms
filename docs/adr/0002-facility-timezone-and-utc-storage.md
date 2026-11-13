---
status: accepted
---

# Facility Timezone Binding with UTC Storage and HikCentral Offset Formatting

We will store all timestamps in the application database as UTC while explicitly binding every facility to a canonical IANA timezone (e.g. `Asia/Jakarta`, `Asia/Makassar`), converting to and from the facility's localized ISO 8601 offset (`yyyy-MM-ddTHH:mm:ss+HH:mm`) whenever communicating with HikCentral OpenAPI.

## Considered Options

- **System/Server Local Time**: Relying on server machine timezone when writing to database and calling HikCentral.
- **Client Browser Local Time**: Formatting ISO 8601 strings directly from the user's browser runtime.
- **Facility IANA Timezone Binding + UTC DB Storage**: Storing normalized UTC timestamps and resolving timezone offset through the target facility's IANA identifier.

## Consequences

- Multi-facility or multi-region enterprise deployments will not suffer scheduling drift when Hosts schedule visits from different timezones than the physical facility.
- HikCentral OpenAPI endpoints (which lack native site timezone parameters and mandate offset-qualified ISO 8601 timestamps up to 64 characters) consistently receive correct local wall-clock times matching physical access terminal schedules.

