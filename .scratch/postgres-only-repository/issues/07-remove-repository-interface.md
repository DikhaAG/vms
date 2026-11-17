# 07: Remove the shared repository interface

**What to build:** With one repository left, the 61-method repository interface is deleted. Every service, the HikCentral adapters that take a repository, and the tRPC context depend on the PostgreSQL repository type directly. Constructor injection stays; only the type changes. The repository's parameter and result types live beside the PostgreSQL repository. The process-wide repository singleton keeps constructing the PostgreSQL repository with lazy connection.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] The shared repository interface no longer exists
- [ ] All former users of the interface reference the PostgreSQL repository type
- [ ] The default repository singleton still works and still connects lazily
- [ ] Type-check, lint, `vitest run` and `next build` pass
