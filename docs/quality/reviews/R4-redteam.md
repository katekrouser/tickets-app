# R4 — Red Team / Adversarial Review

- **Reviewer:** R4 (read-only re: production code)
- **Date:** 2026-07-07
- **Scope:** Full backend (`backend/src/**`), shared schemas (`packages/shared/**`), frontend render/XSS surface
  (`frontend/src/**`), deployment (`docker-compose.yml`, `docker/**`, `backend/Dockerfile`, `frontend/Dockerfile`,
  `.env.example`), DB schema/migration, against `docs/requirements/REQUIREMENTS.md`, `contracts/openapi.yaml`,
  and the frozen `docs/technology/TDR.md`.
- **Method:** No live Docker was available in this environment. Findings are **static + spec-level** analysis of the
  actual code and the resolved `node_modules` (real installed versions inspected). Runtime-only exploits are marked
  **[execute against the live stack (CI/Docker)]** and shipped as reproduction scripts under `R4-repro/`.
- **Verdict:** No Critical remotely-exploitable defect found statically. One **High** deployment/secret finding, three
  **Medium**, five **Low**. The security-critical primitives (JWT verification, password hashing, SQL parameterization,
  React output-escaping, referential integrity, token single-use, drag rollback) are **correctly implemented** — see
  "Attacks attempted and defended" for the evidence, which is a required part of this review.

---

## Severity summary

| ID | Sev | Title | Owner |
|----|-----|-------|-------|
| H1 | High | Weak, committed default `JWT_SECRET` (`dev-only-change-me`) consumed verbatim by Compose → token forgery | A2 (+A4); Dependency Gate/A14 aware |
| M1 | Medium | Ticket `title`/`body` not trimmed — whitespace-only accepted (violates §6 "non-empty after trim") | A7 |
| M2 | Medium | Dev/test tooling (`tsx`, `vitest`, `supertest`, `tsc-alias`, `js-yaml`) shipped inside the backend runtime image — TDR divergence | A2 (+A4); Dependency Gate + A14 |
| M3 | Medium | No rate limiting on `/auth/login` & `/auth/signup`; signup returns `409 EMAIL_TAKEN` (account-enumeration oracle) + unthrottled brute force | A4/A5 |
| L1 | Low | No HTTP security headers from nginx (CSP, X-Frame-Options, X-Content-Type-Options, HSTS) | A2/A9 |
| L2 | Low | Containers run as root (no `USER` in either Dockerfile) | A2 |
| L3 | Low | Error handler echoes raw request URL / raw parser message / full Ajv `validation` array in error body | A4 |
| L4 | Low | SMTP transport sets no `requireTLS`/`tls.rejectUnauthorized`; STARTTLS not enforced for the prod relay | A5/A2 |
| L5 | Low | Dependency version drift vs TDR (`vitest ^4` backend vs `^2` frontend; `@types/nodemailer ^8` vs `nodemailer ^9`) | A14 / Dependency Gate |

---

## Findings

### H1 — Weak committed default `JWT_SECRET` → bearer-token forgery (auth bypass) [High]
- **Category:** Invalid/tampered JWT · secrets management · TDR/deployment.
- **Where:** `.env.example:21` `JWT_SECRET=dev-only-change-me`; `docker-compose.yml:37` `JWT_SECRET: ${JWT_SECRET}`;
  consumed by `backend/src/core/config.ts` → `backend/src/core/auth.ts` (`registerAuth` → `app.register(fastifyJwt, { secret: jwtSecret })`).
- **Repro (runtime):** `R4-repro/jwt-forge.mjs` — sign an HS256 token `{sub, email, iat, exp}` with `dev-only-change-me`
  and call `GET /api/teams`. **[execute against the live stack (CI/Docker)]**
- **Expected:** The verification secret is a high-entropy value that is never committed and must be supplied per
  deployment; a default run should not accept a publicly-known signing key (REQUIREMENTS §11 "no committed
  credentials"). **Actual:** The default developer flow (`cp .env.example .env && docker compose up`) runs with a
  publicly-known secret; any party who has seen this repo can mint a valid bearer token for **any** `sub`/`email` and
  obtain full authenticated access, bypassing signup/verification/login entirely. There is no guard forcing the value
  to change and no minimum-length check on `JWT_SECRET`.
- **Notes / mitigating:** `.env` itself is gitignored and the committed value is a labelled placeholder, so this is a
  deployment-hardening issue, not a committed live secret. Rated High because the running default stack is exploitable
  and nothing prevents shipping the placeholder. **Recommend:** require operators to set a strong secret (fail boot if
  `JWT_SECRET` equals the known placeholder or is < 32 chars), and document it in the README.
- **Owner:** A2 (owns `.env.example` + compose) with A4 (config/auth). Flag to Master Orchestrator Dependency/Secret gate.

### M1 — Ticket title/body accept whitespace-only input (no trim) [Medium]
- **Category:** Boundary values / malformed input / requirements conformance.
- **Where:** `backend/src/modules/tickets/service.ts` `createTicket` (`title: input.title, body: input.body`) and
  `updateTicket` (`data.title = input.title` / `data.body = input.body`) — **no `.trim()`**, unlike Teams
  (`teams/index.ts normalizeName`) and Epics (`epics/index.ts normalizeTitle`) which both trim-and-reject.
- **Repro:** `POST /api/tickets` with `{"teamId":"<real>","type":"bug","title":"   ","body":"   "}` (three spaces each).
  Ajv `minLength:1` counts the spaces, so the request passes and a ticket with a blank title is persisted.
- **Expected (REQUIREMENTS §6):** Title required, "non-empty after trim"; body "required, non-empty". A whitespace-only
  title/body must be rejected `400 VALIDATION_ERROR` (as Teams/Epics do). **Actual:** `201 Created` with an effectively
  empty title/body → blank cards on the board, inconsistent with the trim rule enforced elsewhere.
- **Owner:** A7.

### M2 — Dev/test tooling shipped into the backend runtime image [Medium]
- **Category:** UNAPPROVED tech at runtime (TDR divergence) / attack-surface.
- **Where:** `backend/Dockerfile:37` runtime stage `COPY --from=build /app ./` copies the entire hoisted
  `node_modules`. Confirmed present in the resolved tree: `tsx`, `tsc-alias`, `vitest`, `supertest`, `js-yaml`.
- **Expected (TDR §1, "Build/dev tooling (non-runtime)" row):** tsx, tsc-alias, js-yaml are "**not shipped in runtime
  images**"; Testing tools (Vitest/Supertest) are build/CI only. **Actual:** All of them are baked into the production
  backend image. The Dockerfile deliberately keeps devDeps so the entrypoint can run `prisma migrate deploy` (prisma
  CLI is a devDependency), but the wholesale copy also ships test runners and a TS runtime, enlarging the image and the
  runtime attack surface and directly contradicting the frozen TDR.
- **Repro (runtime):** `docker compose up --build -d && docker compose exec backend sh -c 'ls node_modules | egrep "^(tsx|vitest|supertest|tsc-alias)$"'` → prints them. **[execute against the live stack (CI/Docker)]**
- **Recommend:** install only `prisma` (+ its needs) in the runtime stage, or run migrations from a dedicated stage/job,
  and `npm prune --omit=dev` for the server layer.
- **Owner:** A2 (owns Dockerfiles/compose) with A4; **route also to the Dependency Gate + A14** per the TDR-divergence rule.

### M3 — No rate limiting; signup is an account-enumeration oracle [Medium]
- **Category:** Invalid auth / unexpected behavior (brute force) / enumeration.
- **Where:** `backend/src/modules/auth/*` — no throttling/lockout on `POST /auth/login` or `/auth/signup`; no rate-limit
  library exists in the TDR or dependencies. `signup` returns `409 EMAIL_TAKEN` (`service.ts` + `contracts/openapi.yaml`).
- **Expected:** `resend-verification` is deliberately anti-enumeration (always `202`, per the contract), and `login`
  correctly returns a generic `401 INVALID_CREDENTIALS` for both unknown-email and wrong-password (no oracle — good).
  **Actual:** `signup` still discloses whether an email is registered (`409 EMAIL_TAKEN`), and neither login nor signup
  is throttled, so offline-quality online password brute-forcing and email enumeration are feasible.
- **Notes:** The `409 EMAIL_TAKEN` behavior is contract-defined, so treat enumeration as accepted-by-contract and the
  **missing throttling** as the actionable gap. Argon2id makes each guess costly (partial mitigation).
- **Owner:** A4/A5 (raise a TDR change if a rate-limit dep is wanted).

### L1 — No HTTP security headers from nginx [Low]
- **Where:** `docker/nginx.conf` sets no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, or HSTS. **Impact:** clickjacking possible; no defence-in-depth CSP behind the XSS surface
  (currently mitigated by React — see defended list, but a future `dangerouslySetInnerHTML` would be unguarded).
- **Owner:** A2/A9.

### L2 — Containers run as root [Low]
- **Where:** neither `backend/Dockerfile` nor `frontend/Dockerfile` sets a non-root `USER`. Node process and nginx
  master run as root inside the container. Add a non-root `USER` for least privilege. **Owner:** A2.

### L3 — Error body echoes raw request data [Low]
- **Where:** `backend/src/core/errors.ts`. The not-found handler interpolates the raw URL:
  `message: \`Route ${request.method}:${request.url} not found\``; the 400 path returns raw `fe.message` (Fastify JSON
  parser messages can include a fragment/parse position) and attaches the full Ajv `validation` array in `details`.
- **Expected:** Safe-to-expose messages (contract says the `message` is "safe to expose"), no stack/secret. **Actual:**
  No stack or secret leaks (the 500 path correctly returns only `{code:'INTERNAL', message:'Internal Server Error'}` and
  logs server-side), but reflected request data + schema internals are exposed. Low; consider a static message + generic
  `field` detail. **Owner:** A4.

### L4 — SMTP transport does not enforce TLS [Low]
- **Where:** `backend/src/mail/mailer.ts` — `secure: smtp.port === 465` only; no `requireTLS: true` and no
  `tls.rejectUnauthorized`. For the required prod relay `relay1.dataart.com` on 587 (STARTTLS), a downgrade/MITM could
  cause plaintext delivery of the verification link and it will accept an untrusted cert. Dev (Mailhog:1025) is fine.
  **Owner:** A5/A2.

### L5 — Dependency version drift vs TDR [Low]
- **Where:** `backend/package.json` `vitest ^4` vs `frontend/package.json` `vitest ^2` (TDR: single "Vitest latest
  pinned"); `@types/nodemailer ^8` vs `nodemailer ^9.0.3` (installed) — types lag the runtime major. Hygiene/consistency
  only; no runtime exploit. **Owner:** A14 / Dependency Gate.

---

## Attacks attempted and DEFENDED (evidence — required coverage)

Each category from the R4 charter was exercised statically/at spec level; the following held up:

- **Invalid JWT — `alg=none`, tampered signature, algorithm confusion, expired.** `registerAuth` configures
  `@fastify/jwt` (v9.1.0 → `fast-jwt` 5.0.6) with a **string secret**. Verified in `node_modules/fast-jwt`:
  `detectPublicKeyAlgorithms` → `performDetectPublicKeyAlgorithms` returns `hsAlgorithms = ['HS256','HS384','HS512']`
  for a non-PEM secret, and `validateAlgorithmAndSignature` rejects any `header.alg` not in that list. Therefore
  `alg=none` and RS→HS confusion are **rejected** (401). Expiry maps `FAST_JWT_EXPIRED → 401 TOKEN_EXPIRED`
  (`core/auth.ts verifyToken`). Tampered signature fails HMAC verify → `401 TOKEN_INVALID`. Missing claims are
  unreachable without the secret. Repro asserts this: `R4-repro/jwt-forge.mjs`.
- **SQL injection (all string inputs: login email, team/epic names, ticket title/body, `q` search, filters, IDs).**
  All DB access goes through Prisma with parameterized queries; `q` uses `contains`/`mode:'insensitive'` (bound param).
  The only raw SQL in the codebase is the tagged template `prisma.$queryraw\`SELECT 1\`` in `db/index.ts` (no
  interpolation). `grep` for `queryRawUnsafe`/`executeRawUnsafe`/`$executeRaw` → none. Not exploitable.
- **XSS (ticket title/body, comments, team/epic names).** Frontend renders every value via React `{...}` JSX
  interpolation (`TicketView.tsx` body/title, `CommentsPanel.tsx` `{comment.body}`, board cards, team/epic names).
  `grep` for `dangerouslySetInnerHTML`/`innerHTML`/`marked`/`react-markdown`/`DOMPurify` → **none**. Body is stored/shown
  as plain text (no Markdown rendering), so `<script>`/`<img onerror>` payloads render inert. Stored XSS not exploitable
  as built. (Backend intentionally stores raw text; escaping is at render — correct.) See L1 for the missing CSP safety net.
- **Authorization "access another user's data".** By design there is **no per-user/per-team ownership**
  (REQUIREMENTS §4 "all verified users manage all teams"; §12 excludes per-ticket access). Any verified user can
  read/modify/delete any team/epic/ticket/comment — this is expected, not a defect. Privilege points are safe:
  `createdBy` (tickets) and `authorId` (comments) are **server-set from `request.authUser`**, never trusted from the
  body, so identity spoofing is not possible. Unverified accounts cannot obtain a token (`login` → `403
  EMAIL_NOT_VERIFIED`), so they cannot reach business endpoints.
- **Verification tokens — expired / reused / resend-invalidated.** 256-bit random tokens (`tokens.ts`); 24h expiry
  checked; consumption is atomic and single-use via `updateMany({where:{id, usedAt:null}})` guard inside a transaction
  (a concurrent second verify claims 0 rows → `TOKEN_USED`); resend deletes prior unused tokens
  (`invalidateUnusedTokens`) before issuing a new one. Correct per §3.
- **Cross-team epic on a ticket.** `tickets/service.ts validateReferences` enforces the epic belongs to the ticket's
  team on **create and update**, including a team change that would orphan the current epic → `400 EPIC_TEAM_MISMATCH`.
  Epic `teamId` is immutable (schema `additionalProperties:false`, no `teamId` in `updateEpic`).
- **Delete referenced team/epic.** `teams`/`epics` modules pre-count dependents → `409 TEAM_HAS_DEPENDENTS` /
  `EPIC_REFERENCED`, with a TOCTOU safety net catching FK `P2003/P2014` (DB `ON DELETE RESTRICT` in the migration).
- **Race conditions / concurrent updates.** Ticket updates are last-write-wins per REQUIREMENTS §9 (no version check
  required). Token consumption and delete-vs-insert races are handled atomically/by FK as above.
- **Drag-and-drop failure rollback.** `frontend/src/features/board/api.ts useMoveTicket` does an optimistic cache
  update with `onError` restoring the snapshot; `BoardPage.tsx onDragEnd` shows an error toast. Card returns to the
  previous column on 500/offline (§8). Correct.
- **Malformed / oversized / wrong content-type.** Ajv rejects unknown/missing/mistyped fields (`additionalProperties:
  false`, `required`, enums) → `400 VALIDATION_ERROR`; Fastify's default 1 MB body limit → `413`; non-JSON content type
  is not parsed to an object → `400`. All routed through the ErrorBody handler.
- **Docker startup failures.** `config.ts` fail-fast throws on any missing required env (backend exits, no half-start);
  compose `depends_on: postgres service_healthy` gates the backend and the entrypoint runs `prisma migrate deploy`
  after health; only the frontend publishes a host port (`${FRONTEND_PORT}:80`) so a port clash fails cleanly. No data
  corruption path observed. (Note: `restart: unless-stopped` + missing env = crash-loop, not corruption.)
- **Boundary values.** Password `minLength:8` (7 rejected / 8 accepted); title/name `minLength:1`, `maxLength` caps
  enforced by Ajv; board handles 100/101 tickets (client-side filter/bucket, ordered by `modifiedAt desc`), no server
  cap needed. Whitespace-title is the one gap — see M1.
- **Error-body conformance / no stack leak.** Non-2xx bodies conform to the shared `Error` schema; 500s never leak
  stacks/secrets (logged server-side only). Minor reflection noted in L3.

---

## Routing & re-test

| ID | Route to | Re-test |
|----|----------|---------|
| H1 | A2 (+A4), Master Orchestrator secret gate | Re-run `jwt-forge.mjs` after boot rejects the placeholder secret |
| M1 | A7 | `POST /tickets` whitespace title/body → expect `400` |
| M2 | A2/A4 + Dependency Gate/A14 | `docker compose exec backend` shows no `tsx/vitest/supertest` |
| M3 | A4/A5 | Login throttling present; document enumeration decision |
| L1–L5 | as tabled | Header/USER/error-body/TLS/version checks |

**Status:** All items OPEN. Runtime-marked items require execution against the live stack (CI/Docker); this pass was
static + spec-level because no Docker daemon was available. Re-test and mark Closed after each owner reports a fix.
