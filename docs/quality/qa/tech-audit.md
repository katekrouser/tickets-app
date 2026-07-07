# QA Technology Audit

> Owner: A14 (QA / Quality Engineering). Audits both manifests + lockfile against the **FROZEN** TDR
> (`docs/technology/TDR.md`). A FAIL blocks project completion. Any High/Critical **runtime** vulnerability
> or any divergence from the approved TDR fails the review.
> Date: 2026-07-07 · Environment: no Docker/Postgres/browser (offline). `npm audit` ran; `depcheck` unavailable
> offline → substituted by a manual import scan (`grep` over `src/`).

## Verdict: **FAIL**

Blocking reasons: **(1)** a Critical vulnerability in a production-runtime dependency (`@fastify/jwt`→`fast-jwt`);
**(2)** stack divergences from the frozen TDR (Vitest major split, TypeScript version drift, an undeclared test
dependency and a missing DOM test environment). Findings route to the owning manifest agents (A4 backend / A9
frontend) and, for unauthorized/undeclared deps, to the Master Orchestrator's Dependency Gate / Technology Change
Request (TCR) process.

---

## 1. Installed stack vs. FROZEN TDR

| Layer (TDR) | TDR pin | Installed | Verdict |
|---|---|---|---|
| React + TS | React 18.3.x / TS 5.6.x | react 18.3.1 (single copy) / **TS 5.9.3 hoisted** + 5.6.3 nested | React ✓ · **TS drift ✗** |
| Vite | 5.4.x | 5.4.21 | ✓ |
| @dnd-kit/core · sortable | 6.3.x · 10.0.x | 6.3.1 · 10.0.0 (**sortable unused**) | version ✓ · **unused ✗** |
| TanStack Query | 5.x | 5.101.2 | ✓ |
| React Router | 6.x | react-router-dom 6.x | ✓ |
| openapi-fetch | 0.13.x | 0.13.8 | ✓ |
| Fastify + TS | 5.x | fastify 5.10.0 | ✓ |
| @fastify/jwt | 9.x | 9.1.0 | version ✓ · **vulnerable ✗** |
| @node-rs/argon2 | latest pinned | 2.0.2 | ✓ |
| Prisma / @prisma/client | 5.x | 5.22.0 / 5.22.0 | ✓ |
| PostgreSQL | 16 | (runtime container; not audited offline) | n/a here |
| nodemailer | latest pinned | 9.0.3 | ✓ |
| Testing: Vitest + Supertest (BE), Playwright (E2E) | latest pinned | vitest **4.1.10 (BE) / 2.1.9 (FE)**, supertest 7.2.2, @playwright/test 1.61.1 | **Vitest split ✗** · rest ✓ |
| openapi-typescript / Prism / js-yaml | 7.x / 5.x / 4.x | 7.x / 5.x / 4.1.0 | ✓ |

## 2. Findings (routed to owners)

| # | Sev | Finding | Evidence | Owner | Action |
|---|---|---|---|---|---|
| F1 | **CRITICAL (BLOCKER)** | `@fastify/jwt` → `fast-jwt` Critical vulns: JWT **algorithm confusion** (incomplete fix for CVE-2023-48223) + unknown `crit` header acceptance. **Production runtime** (bearer auth, ADR-0004). | `npm audit`: `fast-jwt` Critical via `@fastify/jwt` | **A4** (+A5 auth) | Raise Dependency-Gate TCR; bump `@fastify/jwt`/`fast-jwt` to a patched release (stay within the 9.x pin if possible). Re-audit must show 0 Critical runtime. |
| F2 | **HIGH (FAIL)** | **Vitest major split**: backend/root `4.1.10`, frontend `2.1.9` — two majors of the same test runner in the lockfile; FE/BE tooling not consistent (TDR §"consistent shared choices"). | `node_modules/vitest`=4.1.10, `frontend/node_modules/vitest`=2.1.9; manifests `^4` vs `^2` | **A9** (+A1 TDR) | Align frontend to `^4`; pin the Vitest major in the TDR. |
| F3 | **MEDIUM (FAIL)** | **TypeScript drift**: root-hoisted `5.9.3` (pulled by `@app/shared` `^5.6.0`) vs TDR pin **5.6.x** (backend/frontend correctly resolve nested 5.6.3). Two TS versions resolved. | root `typescript`=5.9.3; backend/frontend nested=5.6.3 | **A1** (@app/shared) | Tighten `@app/shared` to `~5.6` so a single 5.6.x resolves. |
| F4 | **MEDIUM (FAIL)** | **Undeclared dep vs TDR**: `@testing-library/react` (16.3.2) is in the frontend manifest but **not in the frozen TDR**. Component testing is required by the A14 charter (audit H1), so recommend a TDR amendment rather than removal. | frontend `package.json` devDeps; TDR Testing row lists only Vitest/Supertest/Playwright | **A9** (+A1 TDR) | TCR to add "Testing Library" (+ a DOM env, see F5) to the TDR. |
| F5 | **MEDIUM (FAIL/GAP)** | **No DOM test environment**: neither `jsdom` nor `happy-dom` is installed or declared, and no `test.environment` is set. Component tests therefore **cannot execute** (they self-skip). | `require('jsdom')` → not installed; frontend has no vitest env config | **A9** (+A1 TDR) | TCR to add a DOM env; set the FE test environment; unskip component suite. |
| F6 | **LOW (WARN)** | **Unused dependency**: `@dnd-kit/sortable` (10.0.0) is declared (and in the TDR) but imported **nowhere** — the board uses only `@dnd-kit/core` (`useDraggable`). | `grep -r @dnd-kit/sortable frontend/src` → 0 hits | **A9/A12** | Remove the dep (and its TDR row) or adopt it; keep manifest ⇄ TDR in sync. |
| F7 | **INFO** | **Dev/build-only vulnerabilities** (not shipped in runtime images; do NOT block the runtime gate, reported for hygiene): `vite` High, `vitest` Critical (Vitest **UI-server only**; we run `vitest run` headless), `lodash` High + `@stoplight/*`/`postman-collection`/`uuid` Moderate (all via `@stoplight/prism-cli`, build-only mock tooling), `esbuild`/`vite-node`/`@vitest/mocker` Moderate. | `npm audit` | A9 (vite/vitest), A1 (prism, @app/shared) | Patch where non-breaking; document accepted dev-only risk. |

### `npm audit` summary (whole workspace)
`14 vulnerabilities: 3 critical, 2 high, 9 moderate`. Of these, exactly **one is a production-runtime path**
(`@fastify/jwt`→`fast-jwt`, Critical → F1). All others are dev/test/build-only tooling not present in the shipped
backend/frontend images (F7).

## 3. Checks that PASS
- **No duplicate frameworks / competing libraries**: single HTTP client (`openapi-fetch`), single ORM (Prisma),
  single JWT lib (`@fastify/jwt`), single mailer (`nodemailer`), single React (18.3.1, no duplicate copies),
  single router, single state lib. (The Vitest split, F2, is the one framework-consistency defect.)
- **No unauthorized *runtime* deps**: every backend/frontend production dependency appears in the TDR.
- **No unused deps** except `@dnd-kit/sortable` (F6). All other declared deps are imported (`grep` over `src/`
  + tests): supertest/vitest now used by A14 suites; `@testing-library/react` used by the component suite.
- **Manifests match TDR majors** for all runtime libraries (table §1).

## 4. Re-audit exit criteria (to flip to PASS)
1. F1 resolved: 0 Critical/High **runtime** vulnerabilities (`npm audit` on the shipped dependency graph).
2. F2 resolved: a single Vitest major across FE/BE, pinned in the TDR.
3. F3 resolved: a single TypeScript 5.6.x resolves.
4. F4/F5 resolved: Testing Library + a DOM env added to the TDR via TCR (or component tests removed from scope).
5. F6 resolved: `@dnd-kit/sortable` used or removed (manifest ⇄ TDR consistent).
