# R2 — Security Review (read-only)

- **Reviewer:** R2 — Security Reviewer (Phase 3, READ-ONLY)
- **Scope:** hashing, secret hygiene, token placement, endpoint protection, server-side validation, supply-chain / TDR security
- **Inputs:** merged codebase (working tree), git history, `.env.example`, `docker-compose.yml`, CI, `package.json` × workspaces + `package-lock.json`, frozen `docs/technology/TDR.md`
- **Date:** 2026-07-07 · **Tooling:** `npm audit`, git history scan, static read
- **Verdict:** **CHANGES REQUESTED.** Core application security controls (hashing, secret hygiene, token placement, auth enforcement, server-side validation) are **sound**. The blocking issues are **supply-chain**: High/Critical `npm audit` advisories, headlined by a **runtime auth-library CVE (`fast-jwt` via `@fastify/jwt`)**, plus two dependencies not present in the frozen TDR.

---

## MUST-FIX

### MF-1 — Runtime JWT library ships a known CVE — `fast-jwt` via `@fastify/jwt` (CRITICAL, RUNTIME) — owner A4/A5 + Dependency Gate
- **Advisory:** GHSA-hm7r-c7qw-ghp6 — *fast-jwt accepts unknown `crit` header extensions (RFC 7515 violation)* (CWE-345/636, CVSS 7.5; npm rolls the dependent `@fastify/jwt` up as **critical**).
- **Installed:** `@fastify/jwt@9.1.0` → `fast-jwt@5.0.6`. Vulnerable ranges: `@fastify/jwt <= 9.1.0`, `fast-jwt <= 6.2.3`.
- **Why blocking:** this is the *only* JWT verify/sign path for the backend (`backend/src/core/auth.ts` → `host().jwt.verify/sign`), applied globally to every business route. It ships in the backend runtime image — not a dev-only tool. An attacker-controlled `crit` header being accepted rather than rejected is a token-processing conformance flaw directly on the trust boundary.
- **Fix:** upgrade to a patched `@fastify/jwt` that resolves `fast-jwt > 6.2.3`, then re-run `npm audit`. **Stay within the TDR-approved `@fastify/jwt` 9.x major.** If the only patched line requires a major bump (10.x), that is a stack change → escalate to the Master Orchestrator's Change Control (superseding ADR + new TDR version) before implementing. Route to the **Dependency Gate**.

### MF-2 — `npm audit` High/Critical in build/test tooling (must-fix per rubric; dev-only, not in runtime images) — owner A9 / A14 / A1 + Dependency Gate
`npm audit` reports **14 vulnerabilities (3 critical, 2 high, 9 moderate)**. Per the review rubric, every High/Critical is a must-fix. Excluding MF-1, the remaining High/Critical nodes are all **devDependencies / build-only tooling** (per the TDR they are *not shipped in runtime images*), which lowers exploitability but does not waive the rubric:

| Pkg | Sev | Advisory | Chain / where | Route |
|---|---|---|---|---|
| `vitest` (`<=3.2.5`) | CRITICAL | via `@vitest/mocker` → `vite`/`esbuild` | BE+FE test runner (dev) | A14 |
| `vite` (`<=6.4.2`) | HIGH | GHSA-4w7w-66w2-5vf9 path traversal; esbuild GHSA-67mh-4wv8-2f99 dev-server request | FE build/dev + vitest (dev) | A9 / A14 |
| `lodash` (`<=4.17.23`) | HIGH | GHSA-r5fr-rjxr-66jc code injection via `_.template` | transitive `@stoplight/prism-cli` → `@stoplight/http-spec` → `postman-collection` (mock server, build-only) | A1 (owns Prism) / A14 |

- **Fix:** bump the dev toolchain to non-vulnerable versions (`npm audit fix`; verify no TDR **major** boundary is crossed — Vite is pinned 5.4.x, Vitest is "latest pinned", Prism 5.x). Re-run `npm audit` and attach clean output as evidence. The 9 moderate advisories (`@stoplight/prism-*`, `postman-collection`, `uuid`, `esbuild`, `vite-node`) are the same dev-only clusters — recommend clearing in the same pass but not individually blocking.

### MF-3 — Two dependencies are NOT in the frozen TDR — unaccepted attack surface — owner A9 + Dependency Gate + A14
The frozen TDR (`docs/technology/TDR.md` §1) names FE testing as *Vitest + Playwright (E2E)* only. Present but **unlisted**:
- `@testing-library/react@^16` (frontend devDependency) — a FE component-test library not in the TDR.
- `@vitejs/plugin-react@^4` (frontend devDependency) — required glue for Vite + React; implied but not explicitly listed.

Per the mandate, treat any unlisted/unvetted dependency as unaccepted attack surface. Both are dev-only and low-risk, but the process requires they be either added to the TDR via Change Control (superseding ADR + new TDR version) or removed. **Route to the Dependency Gate + A14.** (Type-stub `@types/*` packages are not flagged.)

---

## VERIFIED CLEAN (§11 security checklist)

- **Argon2id hashing, no plaintext passwords — PASS.** `backend/src/modules/auth/password.ts` uses `@node-rs/argon2` with `algorithm: Argon2id` (pinned `2`); only the self-describing hash is persisted (`prisma.user.create({ data: { email, passwordHash } })`). `verifyPassword` compares against the stored hash. No plaintext password is logged or stored anywhere in `backend/src`. Signup hashes before the DB write; login never echoes the password.
- **No committed secrets / SMTP creds — PASS.** Only `README.md` and the task `.docx` are committed; the entire application tree is currently untracked working-tree — so nothing sensitive exists in git history (scanned `git rev-list --all` for private keys, AWS/GH tokens, real `JWT_SECRET` — none). `.gitignore` correctly ignores `.env` / `.env.*` while allowing `.env.example`. No `.env` is tracked. `.env.example` contains only safe local-dev placeholders (`JWT_SECRET=dev-only-change-me`, empty `SMTP_USER`/`SMTP_PASS`) with explicit "never commit a real secret" guidance. `docker-compose.yml` Postgres creds (`user`/`pass`) are documented local-dev literals matching `.env.example`, not secrets; all app secrets are injected via `${...}` env interpolation. SMTP creds are read only from env (`backend/src/core/config.ts`, `mailer.ts`) — never hardcoded. CI runs a `gitleaks` secret scan on every push/PR.
- **JWT / bearer tokens never in URLs — PASS.** Tokens travel only in `Authorization: Bearer <token>` — set server-side in `core/auth.ts` and attached client-side via an `openapi-fetch` request middleware header (`frontend/src/lib/api.ts`), never as a query param. The only token-in-URL is the email **verification** link (`.../api/auth/verify-email?token=…`), which is a 256-bit single-use random token (`crypto.randomBytes(32)`, `tokens.ts`) — explicitly NOT a JWT/bearer and an allowed exception.
- **Global auth with exactly the allowed public exceptions — PASS.** `registerAuth` applies `requireAuth` as a global `preHandler` (`core/auth.ts`). `PUBLIC_ROUTES` = `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/verify-email`, `POST /api/auth/resend-verification`, `GET /health`, `GET /ready` — matches the allowed set exactly (no static routes, as the backend serves no static assets; nginx serves the SPA). `POST /api/auth/logout` and every teams/epics/tickets/comments route are authenticated and read `request.authUser`. Unmatched routes fall through to 404 (no 401 leak). No over-exposure found.
- **Server-side validation of enums/references (not client-only) — PASS.** Fastify built-in Ajv validates every route from `schemas[operationId]`, generated from `contracts/openapi.yaml` by `packages/shared/scripts/build-schemas.mjs` (body/params/querystring `$ref`s inlined). `TicketType` (`enum: [bug, feature, fix]`) and `TicketState` (5-value enum) are enforced server-side. Reference integrity is checked in the service layer, not the client: `tickets/service.ts#validateReferences` verifies team existence and epic↔team ownership (`EPIC_TEAM_MISMATCH`) on both create and update; `createdBy`/timestamps are server-set; teams/epics enforce trim-non-empty and FK-RESTRICT dependents server-side. Whitespace-only names/titles/comment bodies are caught beyond schema `minLength`.
- **Security-critical libs match the frozen TDR — PASS.** `@node-rs/argon2@2.0.2` (TDR: Argon2id, latest pinned), `@fastify/jwt@9.1.0` (TDR: 9.x — no downgrade/swap, no off-TDR crypto/auth lib), `fastify@5.10.0` (TDR 5.x), `nodemailer@9.0.3` (TDR: latest pinned). No alternate hashing/JWT library present. *(The `@fastify/jwt` version itself is the correct approved lib; the issue in MF-1 is a CVE in its transitive `fast-jwt`, not a TDR mismatch.)*
- **Lockfile integrity & trusted sources — PASS.** `package-lock.json` present, `lockfileVersion: 3`, 627 entries. All external packages resolve from `registry.npmjs.org` with integrity hashes; the only non-registry entries are the three local workspaces (`packages/shared`, `backend`, `frontend`). No `git+`/URL/`github:` sources and no typosquat sources observed. Install scripts are limited to well-known legitimate native packages (`@prisma/client`, `@prisma/engines`, `prisma`, `esbuild`, `fsevents`) — no unexpected/suspicious postinstall.

---

## ADVISORY (non-blocking)

- **A-1 — Bearer token stored in `localStorage`** (`frontend/src/lib/auth.tsx`). Satisfies "no token in URL," but `localStorage` is script-readable, so any XSS elsewhere in the SPA can exfiltrate the token. Acceptable SPA trade-off and not a §11 must-fix; consider documenting the residual XSS risk / a memory-or-`httpOnly`-cookie alternative. Route: A9 (informational).
- **A-2 — SMTP `secure` only on port 465** (`backend/src/mail/mailer.ts`). Ports 587/1025 start plaintext (STARTTLS/none). Fine for the Mailhog dev target; for the prod relay (`relay1.dataart.com:587`) ensure STARTTLS upgrade is actually enforced by the relay. Route: A5/A2 (informational).

## Routing summary
- **Dependency Gate + A4/A5:** MF-1 (runtime `fast-jwt`/`@fastify/jwt` CVE) — highest priority.
- **Dependency Gate + A9/A14/A1:** MF-2 (dev-tooling High/Critical audit), MF-3 (unlisted `@testing-library/react`, `@vitejs/plugin-react`).
- Any fix that would cross a TDR **major** boundary requires Master Orchestrator Change Control (superseding ADR + new TDR version) before implementation.
