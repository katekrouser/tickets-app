# ADR-0010: Phase-3 dependency remediation & stack reconciliation (TDR v2)

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Master Orchestrator (Change Control authority), Architect (A1, amends TDR), Project Historian (G1, records)
- **Owning agent(s):** A4/A5 (`@fastify/jwt`), A9 (FE build/test tooling manifest), A14 (test tooling), A1 (`@app/shared`, Prism `overrides`), A2 (root `overrides` + backend Dockerfile fix)
- **Related:** ADR-0001 (Stack selection — **partially superseded by this ADR**), ADR-0004 (Authentication Helper Contract — auth path affected by the JWT bump), `docs/technology/TDR.md` (v2 — §1 rows, §5 change log, §6 migration note), `docs/quality/reviews/R2-security.md` (MF-1/MF-2/MF-3), `docs/quality/reviews/R4-redteam.md` (H1/M2/L5), `docs/quality/qa/tech-audit.md` (A14 F1–F6), TCR-001 (`docs/technology/technology-changes.md`), DEC-003 (`docs/governance/decision-log.md`), `docs/quality/evidence/INDEX.md`

> This ADR **supersedes the dependency-version portion of ADR-0001** for the rows it names below. ADR-0001 remains the record for the overall stack shape (React/Vite · Fastify · Prisma/PostgreSQL); the specific pins amended here are now governed by this ADR and TDR v2.

## Context

The GATE-0 stack (ADR-0001, TDR v1) was frozen before the Phase-3 quality gate. Three independent Phase-3 reviews then converged on a single blocking cluster — supply-chain / manifest-truthfulness issues — under one Technology Change Request (TCR-001), approved by the Master Orchestrator:

- **R2 Security** (`R2-security.md`) — **CHANGES REQUESTED.** Core controls (hashing, secret hygiene, token placement, auth enforcement, validation) are sound; the blockers are supply-chain:
  - **MF-1 (CRITICAL, runtime):** `fast-jwt` via `@fastify/jwt@9.1.0` ships **GHSA-hm7r-c7qw-ghp6** (accepts unknown `crit` header extensions, RFC 7515 violation). This is the **sole runtime auth path** (`backend/src/core/auth.ts`, global `preHandler` on every business route) — a token-processing conformance flaw directly on the trust boundary, shipped in the runtime image.
  - **MF-2 (High/Critical, dev/build-only):** `npm audit` = 14 vulns (3 critical, 2 high, 9 moderate) — `vitest ≤3.2.5` (CRITICAL), `vite ≤6.4.2` (HIGH + esbuild moderate), `lodash ≤4.17.23` (HIGH, Prism chain). Per rubric every High/Critical is a must-fix even though these are not in runtime images.
  - **MF-3:** `@testing-library/react` and `@vitejs/plugin-react` present but **not in the frozen TDR** — unaccepted attack surface; must be added via Change Control or removed.
- **R4 Red Team** (`R4-redteam.md`) — No statically-exploitable Critical in application code (JWT verification, hashing, SQL parameterization, React escaping, referential integrity, token single-use, DnD rollback all defended). Relevant here: **M2** — dev/test tooling (`tsx`, `vitest`, `supertest`, `tsc-alias`, `js-yaml`) baked into the backend runtime image via a wholesale `node_modules` copy (`backend/Dockerfile`), diverging from the TDR; **L5** — Vitest major split (BE `^4` / FE `^2`) and `@types/nodemailer` drift.
- **A14 Tech Audit** (`tech-audit.md`) — **FAIL.** F1 (CRITICAL runtime `fast-jwt`), F2 (Vitest major split BE `4.1.10` / FE `2.1.9`), F3 (TypeScript drift — `5.9.3` hoisted via `@app/shared ^5.6.0` vs pinned `5.6.x`), F4 (`@testing-library/react` undeclared), F5 (no DOM test environment installed → component/XSS suites self-skip), F6 (`@dnd-kit/sortable` declared but imported nowhere).

The driving force is MF-1/F1: a CRITICAL CVE on the only runtime JWT path. The patched `fast-jwt ≥ 6.2.4` cannot be reached inside `@fastify/jwt` 9.x (which pins `fast-jwt ^5`), so the fix crosses a TDR **major** boundary and requires Change Control (this ADR + TDR v2) before implementation.

## Decision

Amend the frozen TDR to **v2** with the following pins. Runtime source is unchanged (per A1's migration delta, TDR §6); the JWT bump is a version change only, and the dev-tooling majors are build/CI-only (never in runtime images).

1. **`@fastify/jwt` 9.1.0 → 10.1.0 (APPROVED MAJOR)** — pulls patched `fast-jwt` **6.2.4**, fixing **GHSA-hm7r-c7qw-ghp6** on the sole runtime auth path. 9.x pins `fast-jwt ^5` and cannot resolve the patch; only 10.x pins `fast-jwt ^6`. `10.1.0` chosen (npm-audit's own fix, latest 10.x, tightest `fast-jwt` floor + signed-cookie fix). **Plugin API surface used by the codebase is unchanged** — see TDR §6 for the migration delta and behavioral deltas to verify (unknown `crit` now rejected = the intended fix; non-`aud` claims single-valued; empty HMAC secret rejected, ties to R4-H1). Owner: A4/A5.
2. **`vite` 5.4.x → 6.4.3 (APPROVED MAJOR)** — no patched 5.x line exists for HIGH **GHSA-fx2h-pf6j-xcff** (`server.fs.deny` bypass, `≤6.4.2`); 6.4.3 also clears the two moderate vite advisories + esbuild **GHSA-67mh-4wv8-2f99** (vite 6 ships esbuild ≥0.25) and satisfies the Vitest 4 peer (`vite ^6`). Build-only (nginx serves compiled static assets; Vite is not in the runtime image). Owner: A9.
3. **`vitest` unified to 4.1.10 (BE + FE)** — resolves the major split (A14 F2 / R4-L5); clears CRITICAL `vitest ≤3.2.5` + transitive `vite-node`/`@vitest/mocker` moderates. Peer `vite ^6` met by pin (2). Build/CI-only. Owner: A14 (+A9 FE manifest, +A4 BE manifest).
4. **Declare previously-undeclared FE test tooling in the TDR (MF-3 / A14 F4/F5):** `@vitejs/plugin-react` **4.7.0** (peer supports `vite ^6`, no plugin major bump), `@testing-library/react` **16.3.2** (+ `@testing-library/dom` **10.x** peer), `jsdom` **29.1.1** as the DOM test environment (`test.environment = 'jsdom'`). All devDependencies — not in runtime images. Owner: A9 (+A14).
5. **`typescript` single-pinned 5.6.3** — resolves the `5.9.x` root/`@app/shared` drift (A14 F3); `@app/shared` tightens `^5.6.0`→`5.6.3` (A1), BE/FE `~5.6`→`5.6.3`. Owner: A1 (`@app/shared`) + A4/A9.
6. **`@dnd-kit/sortable` removed** — unused (A14 F6; board uses `@dnd-kit/core` `useDraggable` only, 0 import hits). Owner: A9/A12.
7. **`lodash` pinned 4.18.1 via root-workspace npm `overrides`** — clears HIGH **GHSA-r5fr-rjxr-66jc** (`_.template` code injection, `≤4.17.23`) + the two moderate lodash prototype-pollution advisories on the transitive `@stoplight/prism-cli → @stoplight/http-spec → postman-collection` (mock server, build-only) chain. Prism itself stays 5.x. Owner: A1 (owns Prism) + A2 (root `overrides`).
8. **Reaffirm (no new decision):** the backend runtime image MUST exclude dev/build/test tooling (`tsx`, `tsc-alias`, `js-yaml`, `vitest`, `supertest`) — R4-M2 flags the current `backend/Dockerfile` shipping them via a wholesale `node_modules` copy. **A2 fixes the Dockerfile** (`npm prune --omit=dev` / dedicated migrate stage). This ADR records the decision; A1 does not own the Dockerfile fix.

## Alternatives considered

| Option | Pros | Cons | Rejected because |
|---|---|---|---|
| A (chosen) — bump `@fastify/jwt` to 10.1.0, Vite to 6.4.3, unify Vitest 4.1.10, declare/prune the rest via TCR-001 | Removes the CRITICAL runtime CVE at source; single reconciled stack; manifests ⇄ TDR truthful | Two accepted majors (`@fastify/jwt`, `vite`); requires superseding ADR + TDR v2 | — |
| B — stay within `@fastify/jwt` 9.x (patch only) | No major bump, no Change Control | 9.x pins `fast-jwt ^5`; **cannot** reach the patched `≥6.2.4` — the CRITICAL CVE would remain unfixed on the runtime auth path | Does not remediate MF-1/F1 |
| C — swap to a different JWT library | Could avoid the 10.x bump | Off-TDR crypto/auth lib swap = larger surface + new ADR anyway; API/behavior re-verification | Higher risk than a version-only bump with unchanged API surface (TDR §6) |
| D — `happy-dom` for the DOM test env | Lighter/faster | Lower HTML-spec fidelity for XSS/component render assertions | `jsdom` chosen for fuller fidelity (TDR §3 rejection) |
| E — keep `@dnd-kit/sortable`, patch dev tooling in place | Minimal churn | Leaves an unused dep (manifest ⇄ TDR drift) and unresolved High/Critical dev advisories | Fails A14 exit criteria F2/F6 |

## Consequences

- **Positive:**
  - CRITICAL runtime CVE (GHSA-hm7r-c7qw-ghp6) removed at source on the sole auth path; `npm audit` on the shipped runtime graph reaches 0 Critical/High (A14 exit criterion 1).
  - Dev/build High/Critical advisories cleared (`vitest`, `vite`/esbuild, `lodash`); manifests become truthful against the TDR (MF-3 / F4/F5 declared, F6 removed, F3 TS drift resolved, F2 Vitest split resolved).
  - Component/XSS test suites can now execute (`jsdom` present + `test.environment` set) instead of self-skipping.
- **Negative / trade-offs:**
  - Two **major** version bumps accepted (`@fastify/jwt` 9→10, `vite` 5→6). The JWT major is accepted for security and carries unchanged plugin API surface (TDR §6); the Vite major is build-only. `fast-jwt` 6 introduces behavioral deltas (unknown `crit` rejected, single-valued non-`aud` claims, empty-secret rejection) that must be verified before sign-off — app tokens are unaffected.
  - No runtime **source** change is required by this ADR (per A1's migration delta); the accompanying Dockerfile hardening (item 8) is A2's separate work.
- **Follow-ups / new tech debt:**
  - A4/A5: re-run the auth suite + R4 `jwt-forge.mjs` repro after the bump (confirm `alg=none` / tampered-signature / expired-token all still 401) and confirm `npm audit` shows 0 Critical/High on the runtime graph.
  - A2: land the `backend/Dockerfile` fix (item 8, R4-M2) and re-run `docker compose exec backend` to confirm no `tsx/vitest/supertest/tsc-alias/js-yaml`.
  - Out of scope for this ADR (routed to other owners, tracked in their reviews): R4-H1 `JWT_SECRET` hardening (A2/A4), M1 ticket trim (A7), M3 rate limiting (A4/A5), L1–L4 (nginx headers, non-root `USER`, error-body reflection, SMTP TLS).

## Verification

- **A14 re-audit exit criteria** (`tech-audit.md` §4): (1) 0 Critical/High runtime vulns; (2) single Vitest major FE/BE pinned in TDR; (3) single TypeScript 5.6.x resolves; (4) Testing Library + DOM env in TDR; (5) `@dnd-kit/sortable` used or removed. All addressed by the pins above.
- **R2 re-review:** MF-1 patched (`fast-jwt ≥6.2.4` on the runtime graph), MF-2 dev advisories cleared, MF-3 deps now TDR-declared.
- **R4 re-test:** `R4-repro/jwt-forge.mjs` and the auth suite after the bump; backend runtime image inspected for absence of dev/test tooling.
- Evidence recorded in `docs/quality/evidence/INDEX.md`. TDR v2 change set: `docs/technology/TDR.md` §5.
