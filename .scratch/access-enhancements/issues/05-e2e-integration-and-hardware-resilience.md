# 05: End-to-End Tracer Bullet & Hardware Failure Resilience

**What to build:** Create end-to-end integration test coverage proving the complete tracer-bullet lifecycle across all new capabilities: pre-approved visit creation, fast-track auto check-in at lobby turnstile, single-direction room implicit departure and arrival, emergency access granting with hardware sync, tap verification on emergency doors, expiration enforcement, and final check-out revocation. Ensure robust error handling when HikCentral upstream hardware returns network or authorization errors.

**Blocked by:** 04: Active Monitoring & Emergency Access UI Integration

**Status:** ready-for-agent

- [ ] End-to-end tracer bullet test exercises complete flow: `APPROVED` visit → first perimeter turnstile tap → auto check-in transition → room transition tap → emergency access grant → emergency door tap → visit check-out de-authorization.
- [ ] Verifies graceful fallback and clear structured error responses when HikCentral OpenAPI encounters network timeout or authentication failures during emergency grant synchronization.
- [ ] Confirms that full regression test suite passes cleanly (`pnpm check` exits 0 with all test files passing).
- [ ] Next.js 16 production build compiles with Turbopack (`pnpm build`) without errors or bundle warnings.
