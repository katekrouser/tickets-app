# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).
Maintained by the **Project Historian (G1)**. Every merged feature MUST add an entry before it is Done.

## [Unreleased]
### Added
- 2026-07-07: Declared previously-undeclared FE test tooling in the TDR — `@vitejs/plugin-react` 4.7.0, `@testing-library/react` 16.3.2 (+`@testing-library/dom` 10.x), and DOM test environment `jsdom` 29.1.1 (happy-dom rejected); component/XSS suites can now execute instead of self-skipping (A9/A14, TDR v2, ADR-0010).
### Changed
- 2026-07-07: **Stack reconciliation → TDR v2** (TCR-001, MO-approved). Unified `vitest` to 4.1.10 across backend + frontend (resolved major split); single-pinned `typescript` 5.6.3 (resolved 5.9.x drift). See ADR-0010 (A1/A4/A9/A14, R4-L5, A14 F2/F3).
### Fixed
- <!-- link the Bug Log id, e.g. BUG-001 -->
### Removed
- 2026-07-07: Removed unused `@dnd-kit/sortable` dependency (board uses `@dnd-kit/core` `useDraggable` only) — manifest ⇄ TDR realigned (A9/A12, A14 F6, ADR-0010).
### Security
- 2026-07-07: **CVE remediation (TDR v2 / TCR-001, ADR-0010).** Bumped `@fastify/jwt` 9.1.0 → 10.1.0 (pulls patched `fast-jwt` 6.2.4), fixing CRITICAL **GHSA-hm7r-c7qw-ghp6** (unknown `crit` header acceptance) on the sole runtime bearer-auth path (`core/auth.ts`) — APPROVED MAJOR bump, plugin API surface unchanged (A4/A5, R2 MF-1 / A14 F1). Cleared High/Critical dev/build-only advisories: `vite` 5.4.x → 6.4.3 (HIGH **GHSA-fx2h-pf6j-xcff** + esbuild **GHSA-67mh-4wv8-2f99**), `vitest` → 4.1.10 (CRITICAL `≤3.2.5`), and `lodash` pinned 4.18.1 via root `overrides` (HIGH **GHSA-r5fr-rjxr-66jc**, Prism build-only chain) (A9/A14/A1, R2 MF-2). Reaffirmed the backend runtime image excludes dev/test tooling (A2 Dockerfile fix, R4-M2).

<!--
Entry rules:
- One bullet per user-visible or architecturally-significant change.
- Reference the owning agent and any ADR (e.g. "… (A7, ADR-0003)").
- Fixes must link a Bug Log id and its regression test.
- Move [Unreleased] items under a versioned heading at release (see Release Notes).
-->

## [0.1.0] - YYYY-MM-DD
### Added
- Initial project scaffold and governance framework.
