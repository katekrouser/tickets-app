# Technology Decision Record (TDR)

- **Owner:** Architect (A1) · **Status:** **FROZEN** (re-frozen at **v2** after TCR-01 — Phase-3 review remediation; originally frozen at GATE 0 exit, Phase 0 complete) · **Approved by:** Master Orchestrator ·
  **Approved date:** 2026-07-07 · **TDR version:** v2 · **Related:** ADR-0001, **ADR-0010 (superseding — authored by G1)**, `docs/architecture/system-architecture.md`

> This is the single authoritative registry of the project's technology stack. It is A1's **final deliverable**.
> **Once approved it is FROZEN.** No implementation agent (A2–A14) may add, remove, or change a technology,
> framework, library, or version without **Master Orchestrator approval** via the Change Control process below.
> Any stack change requires a superseding ADR and a new TDR version before it may be implemented.

## 1. Locked technology stack
| Layer | Technology | Version (pinned) | Rationale | Owning agent(s) |
|---|---|---|---|---|
| Package manager | **npm (npm workspaces)** | 10.x (bundled with Node 20) | single manager; `package-lock.json`; root `workspaces: ["backend","frontend","packages/*"]` | A2 |
| Frontend framework | React + TypeScript | React 18.3.1 / **TypeScript 5.6.3** | SPA, ecosystem. **v2:** TS pinned to a single exact **5.6.3** — resolves the root/`@app/shared` drift to 5.9.x (A14 F3); `@app/shared` tightens `^5.6.0`→`5.6.3` (A1), backend/frontend `~5.6`→5.6.3 | A9 (+A1 for `@app/shared`) |
| FE build/dev | Vite | **6.4.3** | fast SPA tooling. **v2: APPROVED MAJOR bump 5.4.x → 6.4.3** — no patched 5.x line exists for HIGH **GHSA-fx2h-pf6j-xcff** (`server.fs.deny` bypass, `≤6.4.2`); 6.4.3 also clears the two moderate vite advisories and esbuild **GHSA-67mh-4wv8-2f99** (vite 6 ships esbuild ≥0.25) and satisfies the Vitest 4 peer (`vite ^6`). Build-only — SPA is served from compiled static assets by nginx; Vite is NOT in the runtime image. | A9 |
| Drag & drop | @dnd-kit/core | **6.3.1** | accessible DnD. **v2: `@dnd-kit/sortable` REMOVED** — unused (A14 F6: board uses `@dnd-kit/core` `useDraggable` only; 0 import hits). A9/A12 delete the dep + `sortable` row. | A12 (+A9) |
| Server state | TanStack Query | 5.x | cache + loading/error + optimistic DnD | A9/A12/A13 |
| Routing | React Router | 6.x | route-registry pattern | A9 |
| OpenAPI type generation | **openapi-typescript** | 7.x | emits TS types into `@app/shared` from the spec | A1 |
| FE HTTP client | **openapi-fetch** | 0.13.x | typed client over openapi-typescript types | A9 |
| Mock server | **Prism (`@stoplight/prism-cli`)** | 5.x | `npm run mock` = `prism mock contracts/openapi.yaml`. Build-only. **v2:** pin the transitive `lodash` (via `@stoplight/prism-cli` → `@stoplight/http-spec` → `postman-collection`) to **4.18.1** through a root-workspace npm `overrides` entry — clears HIGH **GHSA-r5fr-rjxr-66jc** (`_.template` code injection, `≤4.17.23`) + the two moderate lodash prototype-pollution advisories. Prism itself stays 5.x. | A1 (owns Prism) + A2 (root `overrides`) |
| Backend runtime | Node.js | 20 LTS | cross-platform | A4 |
| Backend framework | Fastify + TypeScript | **Fastify 5.10.x** / **TypeScript 5.6.3** | schema-first validation, OpenAPI. **v2:** TS single-pinned 5.6.3 (see Frontend row). | A4 |
| ORM / migrations | Prisma | 5.x | declarative schema + automated migrations | A3 |
| Database | PostgreSQL | 16 | required-grade RDBMS | A3/A2 |
| Password hashing | Argon2id (@node-rs/argon2) | latest pinned | REQUIREMENTS §3 | A5 |
| Auth tokens | **@fastify/jwt** (bearer) | **10.1.0** (→ `fast-jwt` **6.2.4**; Fastify 5) | single JWT lib; no token-in-URL. **v2: APPROVED MAJOR bump 9.1.0 → 10.1.0.** Rationale: CRITICAL CVE **GHSA-hm7r-c7qw-ghp6** (`fast-jwt` accepts unknown `crit` header extensions) sits on the **sole runtime auth path** (`core/auth.ts`, global preHandler). `@fastify/jwt` 9.x pins `fast-jwt ^5` and **cannot** resolve the patched `fast-jwt ≥ 6.2.4`; only 10.x pins `fast-jwt ^6` (10.1.0 → `^6.2.0` → resolves 6.2.4). Minimal 10.x boundary is 10.0.0; **10.1.0 pinned** (npm-audit's own fix, latest 10.x, tightest fast-jwt floor + signed-cookie fix). API surface unchanged — migration delta in §6. | A4/A5 |
| SPA serving | **nginx serves the compiled SPA** (frontend container); backend serves only `/api/*` + `/health` + `/ready` | nginx stable | single strategy (no backend-served SPA) | A2/A9 |
| API transport | **Same-origin; FE calls `/api`; nginx proxies `/api/*` → `backend:3000`; no CORS** — full contract in ADR-0009 | frozen | single transport model | A1/A2/A9 |
| Validation | **Fastify built-in JSON-Schema (Ajv)** — schemas emitted from `contracts/openapi.yaml` by A1 into `packages/shared`; **no separate validator dependency** | bundled | schema-first, avoids zod/OpenAPI-validator ambiguity | A1/A4 |
| Email / SMTP | nodemailer → relay1.dataart.com (Mailhog dev) | latest pinned | REQUIREMENTS §3 | A5/A2 |
| Testing (runner) | **Vitest** (BE+FE) + Supertest (BE), Playwright (E2E) | **Vitest 4.1.10** (single major across BOTH workspaces) · Supertest 7.x · Playwright 1.x | §11 test flows. **v2:** pin ONE Vitest major, resolving A14 F2 split (BE `4.1.10` / FE `2.1.9`). 4.1.10 clears CRITICAL `vitest ≤3.2.5` (+ transitive `vite-node`/`@vitest/mocker` moderates); its peer `vite ^6\|^7\|^8` is met by the Vite 6.4.3 pin. Build/CI only — NOT in runtime images. | A14 (+A9 FE manifest, +A4 BE manifest) |
| FE component testing | **@testing-library/react** (+ `@testing-library/dom` peer) | **16.3.2** (+ `@testing-library/dom` **10.x**) | **v2: ADDED to TDR** (was undeclared — R2 MF-3 / A14 F4). Component + XSS render tests required by the A14 charter. React 18/19 peer satisfied by React 18.3.1. devDependency — NOT in runtime images. | A9 (+A14) |
| Vite React plugin | **@vitejs/plugin-react** | **4.7.0** | **v2: ADDED to TDR** (was implied/undeclared — R2 MF-3 / A14 F4). Required Vite+React glue. 4.7.0 peer supports `vite ^6` — no plugin major bump needed. Build-only. | A9 |
| DOM test environment | **jsdom** | **29.1.1** | **v2: ADDED to TDR** (A14 F5 — none was installed, so component/XSS suites self-skipped). `test.environment = 'jsdom'` in the FE Vitest config. Chose **jsdom over happy-dom** for fuller HTML-spec fidelity on XSS/render assertions (see §3). Build/CI only. | A9 (+A14) |
| Orchestration | Docker + Docker Compose | current | `docker compose up --build` | A2 |
| CI | GitHub Actions | — | build + test + secret-scan | A2 |
| Build/dev tooling (non-runtime) | tsx (backend dev runner), tsc-alias (backend prod alias resolver), js-yaml (@app/shared schema extractor, build-only) | pinned | recorded at GATE-0 freeze; **not shipped in runtime images**. **v2 (reaffirmed):** the backend runtime image MUST exclude **tsx, tsc-alias, js-yaml AND the test tooling (vitest, supertest)** — R4-M2 flags the current `backend/Dockerfile` ships them via a wholesale `node_modules` copy; **A2 fixes the Dockerfile** (`npm prune --omit=dev` / dedicated migrate stage). Decision recorded here; A1 does NOT own the Dockerfile fix. | A4/A1 (decision) · A2 (Dockerfile fix) |

## 2. Constraints honored
- Languages/frameworks unrestricted but must be cross-platform; start via `docker compose up --build` only (§2).
- No host-installed FE/BE/DB runtime beyond Docker.
- Automated migrations; fresh DB has no seed data (§9).

## 3. Explicitly rejected / out-of-bounds
List technologies considered and rejected (link ADR-0001), and forbidden ones — including browser localStorage
as the system of record (§9). Adding anything here later requires the Change Control process.

- **v2 (TCR-01):** `happy-dom` — considered as the DOM test environment; **rejected** in favor of `jsdom` (fuller HTML-spec fidelity for XSS/component render assertions). See §1 "DOM test environment".
- **v2 (TCR-01):** `@dnd-kit/sortable` — **removed** (declared + previously in the TDR but imported nowhere; A14 F6). See §1 "Drag & drop".

## 4. Freeze & Change Control
- **Freeze:** On Master Orchestrator approval, Status becomes FROZEN and this table is authoritative.
- **No unilateral change:** Implementation agents must NOT introduce a new dependency, swap a library, or bump a
  major version outside this table. Doing so is a boundary violation and must be rejected at review/merge.
- **To change the stack:**
  1. Raise a request to the Master Orchestrator with justification and impact.
  2. On approval: Architect (A1) writes a superseding ADR and increments this TDR to a new version (record the
     change in the log below AND in `docs/technology/technology-changes.md`); G1 logs it (Decision Log + CHANGELOG).
  3. Only then may the owning implementation agent implement the change.
- Manifests (`package.json`/lockfiles) remain owned solely by A4 (backend) and A9 (frontend); they must match this TDR.

## 5. TDR change log
| TDR version | Date | Change | Superseding ADR | Approved by |
|---|---|---|---|---|
| v1 | (GATE-0 exit) | Initial frozen stack | ADR-0001 | Master Orchestrator |
| v2 | 2026-07-07 | **MF-1** — `@fastify/jwt` **9.1.0 → 10.1.0** (→ `fast-jwt` 6.2.4): APPROVED MAJOR bump; CRITICAL CVE GHSA-hm7r-c7qw-ghp6 on the sole runtime auth path (9.x pins `fast-jwt ^5`, cannot reach the patched ≥6.2.4). | ADR-0010 (authored by G1) | Master Orchestrator |
| v2 | 2026-07-07 | **MF-2** — dev/build tooling patched: **Vitest → 4.1.10** (single major BE+FE, clears CRITICAL `≤3.2.5`); **Vite 5.4.x → 6.4.3** (APPROVED MAJOR; HIGH GHSA-fx2h-pf6j-xcff, no patched 5.x; +esbuild GHSA-67mh-4wv8-2f99); **@vitejs/plugin-react → 4.7.0**; **lodash → 4.18.1** via root override (HIGH GHSA-r5fr-rjxr-66jc, Prism build-only chain). All dev/build-only, not in runtime images. | ADR-0010 (authored by G1) | Master Orchestrator |
| v2 | 2026-07-07 | **MF-3** — TDR made truthful: ADD `@testing-library/react` 16.3.2 (+`@testing-library/dom` 10.x) and `@vitejs/plugin-react` 4.7.0; ADD DOM env **jsdom 29.1.1** (happy-dom rejected); **TypeScript single-pinned 5.6.3** (resolves 5.9.x drift, A14 F3); **`@dnd-kit/sortable` removed** (unused, A14 F6). | ADR-0010 (authored by G1) | Master Orchestrator |
| v2 | 2026-07-07 | **Note (reaffirmed, no new decision)** — backend runtime image MUST NOT ship dev/build/test tooling (tsx, tsc-alias, js-yaml, vitest, supertest); R4-M2; A2 fixes `backend/Dockerfile`. | ADR-0010 (authored by G1) | Master Orchestrator |

## 6. v2 migration note — `@fastify/jwt` 9.1.0 → 10.1.0 (for A4/A5)
The 10.x major bump adopts `fast-jwt` 6.x (patched 6.2.4). **The plugin API surface the codebase uses is unchanged** — no code changes are required for the migration itself:
- `app.register(fastifyJwt, { secret })` registration option — **unchanged**.
- Decorators `fastify.jwt.sign` / `fastify.jwt.verify`, `request.jwtVerify`, `reply.jwtSign` — **unchanged**.
- Error codes (`FAST_JWT_EXPIRED`, `FAST_JWT_INVALID_SIGNATURE`, etc.) — **unchanged**; `core/auth.ts` `verifyToken` mappings (e.g. `FAST_JWT_EXPIRED → 401 TOKEN_EXPIRED`) remain valid.
- HS256 auto-detection for a string secret — **unchanged**; `alg=none` and RS↔HS confusion stay rejected (401).

**Behavioral deltas introduced by `fast-jwt` 6 (verify before sign-off):**
1. **Unknown `crit` header now REJECTED** — the intended CVE fix (GHSA-hm7r-c7qw-ghp6). App tokens carry no `crit` header → no impact.
2. **Non-`aud` claims must be single values** (arrays no longer accepted, except `aud`). App tokens use scalar `sub`/`email`/`iat`/`exp` → no impact.
3. **Empty HMAC secret rejected** (fast-jwt 6.2.4, `prepareKeyOrSecret`). Ties into R4-H1: ensure `JWT_SECRET` is non-empty (config already fail-fast; recommend a ≥32-char guard).

**Required action for A4/A5:** none in source; re-run the auth suite + R4 `jwt-forge.mjs` repro after the bump to confirm `alg=none` / tampered-signature / expired-token all still return 401, and confirm `npm audit` shows 0 Critical/High on the runtime graph.
