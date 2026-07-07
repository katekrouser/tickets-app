# Requirement Traceability Matrix (RTM)

> Owner: A14. Every REQUIREMENTS clause → implementation (file/agent) → automated test(s) → manual test →
> the full review chain (R0 Architecture / R2 Security / R5 Code / Requirement-audit A14/R3) → Definition-of-Done
> (§13 box). No requirement may be unmapped. A **REQUIREMENT AUDIT** verdict is at the bottom.
>
> Review-column key: **PASS** = reviewed clean · **PASS\*** = passes with non-blocking Medium/Low findings ·
> **BLOCK** = blocking finding open · **n/a** = out of that review's scope.
> Test-status key: **RUN✓** ran green here · **CI** authored, executes in CI/Docker · **DOM** authored, executes once a DOM env is added.
>
> Sources: reviews in `docs/quality/reviews/` (R0/R1/R2/R4/R5); DoD audit `docs/agents/review/R3-dod-audit.md`.

| # | Requirement (clause) | Implementation (file · agent) | Automated test(s) | Manual (MC-#) | R0 Arch | R2 Sec | R5 Code | Req-audit (A14) | DoD §13 |
|---|---|---|---|---|---|---|---|---|---|
| §3.1 | Sign up email+password; email trimmed, case-insensitive, unique | `auth/service.ts signup/normalizeEmail` · A5 | `auth.int` signup/dup-409 (CI); `password` unit (RUN✓) | MC-01,02 | PASS | PASS | PASS | PASS | box1 |
| §3.2 | Login/logout local creds, no SSO | `auth/service.ts login`; `auth/index logout` · A5 | `auth.int` login-success/401 (CI) | MC-03 | PASS | PASS | PASS | PASS | box1 |
| §3.3 | Password ≥8, hashed Argon2id, never plaintext | `auth/password.ts` · A5; schema minLength | `password` unit (RUN✓); FE `validation` unit (RUN✓) | MC-04 | PASS | PASS | PASS | PASS | box8 |
| §3.4 | Verification email via configurable SMTP (relay1.dataart.com) | `mail/*` · A5; `core/config` SMTP_* · A4 | `verification-email` unit (RUN✓); `config` unit (RUN✓) | MC-05 | PASS | PASS | PASS | PASS | box1 |
| §3.5 | Unverified accounts blocked from main app | `auth/service.ts login → 403 EMAIL_NOT_VERIFIED` · A5 | `auth.int` unverified-block (CI) | MC-06 | PASS | PASS | PASS | PASS | box1 |
| §3.6 | Tokens expire 24h, single-use; success→login (no auto-login) | `auth/tokens.ts`; `auth/service verifyEmail` · A5 | `tokens` unit (RUN✓); `auth.int` verify/reuse/expired (CI) | MC-07,08 | PASS | PASS | PASS | PASS | box1 |
| §3.7 | Resend verification; new token invalidates prior unused | `auth/service resendVerification`; `tokens.invalidateUnusedTokens` · A5 | `tokens` unit (RUN✓); `auth.int` resend-supersede (CI) | MC-09 | PASS | PASS | PASS | PASS | box1 |
| §3.8 | Auth on all except signup/login/verify/resend; health public | `core/auth.ts PUBLIC_ROUTES/requireAuth` · A4 | `authz-security.int` no-token/public/404 (CI); `auth-token` unit (RUN✓) | MC-10 | PASS | PASS | PASS | PASS | — |
| §4.1 | Teams view/create/rename/delete | `modules/teams/index.ts` · A6 | `teams.int` CRUD (CI) | MC-11 | PASS | PASS | PASS | PASS | box2 |
| §4.2 | Team fields id/name/created_at/modified_at | `prisma Team` · A3; `teams toTeamDTO` · A6 | `teams.int` shape (CI); R1 contract PASS | MC-12 | PASS | n/a | PASS | PASS | box2 |
| §4.3 | Name non-empty after trim; unique case-insensitive | `teams normalizeName`; citext unique · A6/A3 | `teams.int` ws-name/dup-409 (CI) | MC-13 | PASS | PASS | PASS | PASS | box2 |
| §4.4 | Cannot delete team with tickets/epics → 409, no cascade | `teams delete → TEAM_HAS_DEPENDENTS`; FK RESTRICT · A6/A3 | `teams.int` delete-409 (CI) | MC-14 | PASS | n/a | PASS | PASS | box2 |
| §5.1 | Epic belongs to one team; set at creation, immutable | `epics create`; `updateEpic` (no teamId, additionalProperties:false) · A15 | `epics.int` immutable-400 (CI) | MC-15 | PASS | n/a | PASS | PASS | box2 |
| §5.2 | Epic fields; title non-empty after trim | `prisma Epic`; `epics normalizeTitle` · A15/A3 | `epics.int` create/trim (CI) | MC-16 | PASS | n/a | PASS | PASS | box2 |
| §5.3 | Ticket epic dropdown: same-team only, backend enforced | `tickets validateReferences EPIC_TEAM_MISMATCH` · A7; `teams /:id/epics` · A6 | `tickets-service` unit (RUN✓); `tickets.int` mismatch (CI) | MC-17 | PASS | n/a | PASS | PASS | box3 |
| §5.4 | Cannot delete epic referenced by tickets → 409 | `epics delete → EPIC_REFERENCED`; FK RESTRICT · A15/A3 | `epics.int` referenced-409 (CI) | MC-18 | PASS | n/a | PASS | PASS | box2 |
| §6.1 | Ticket fields (id/team/type/state/epic/title/body/timestamps/createdBy) | `prisma Ticket`; `tickets service` · A3/A7 | `tickets.int` create-shape (CI); R1 PASS | MC-19 | PASS | n/a | PASS | PASS | box3 |
| §6.2 | Type enum bug\|feature\|fix; state 5-value enum; server-validated | `@app/shared` schemas (Ajv) · A1; `prisma enums` · A3 | `tickets.int` invalid-enum-400; `authz-security.int` enum (CI); `labels` unit (RUN✓) | MC-20 | PASS | PASS | PASS | PASS | box5 |
| §6.3 | createdBy/createdAt server-set | `tickets service createTicket` · A7 | `tickets-service` unit createdBy (RUN✓); `tickets.int` (CI) | MC-21 | PASS | PASS | PASS | PASS | box3 |
| §6.4 | **modified_at advances only on real change; comment add does NOT** | `tickets service updateTicket` dirty-check · A7; comments insert-only · A8 | `tickets-service` unit no-op/real (RUN✓); `tickets.int` + `comments.int` no-bump (CI) | MC-22,23 | PASS | n/a | **PASS (invariant verified)** | PASS | box6 |
| §6.5 | Team change clears/rejects foreign epic | `tickets updateTicket effectiveTeam/Epic` · A7 | `tickets-service` unit orphan-epic (RUN✓) | MC-24 | PASS | n/a | PASS | PASS | box3 |
| §6.title/body (R4-M1) | Ticket title/body trimmed; whitespace-only → 400 on create AND update | `tickets service normalizeText` · A7 | `tickets-service` unit R4-M1 ws-reject×4 + trim-store×2 (RUN✓) | MC-19 | PASS | n/a | PASS | PASS | box3 |
| §6.6 | Delete after confirm; deletes comments (cascade) | `tickets delete`; FK CASCADE · A7/A3; FE confirm · A11 | `tickets.int` cascade (CI); E2E (CI) | MC-25 | PASS | n/a | PASS | PASS | box3 |
| §6.7 | Drag-drop state persisted immediately | `tickets PATCH`; FE optimistic mutation · A7/A12 | `tickets.int` drag-state (CI); `board-dnd` E2E (CI) | MC-26 | PASS | n/a | PASS\* (R5 M1 concurrent-drag) | PASS | box6 |
| §7.1 | Add comments; fields id/ticket/author/body/created_at; non-empty | `modules/comments/index.ts` · A8 | `comments.int` add/empty-400 (CI) | MC-27 | PASS | PASS | PASS | PASS | box4 |
| §7.2 | Comments chronological oldest-first | `comments listComments orderBy asc` · A8 | `comments.int` order (CI) | MC-28 | PASS | n/a | PASS | PASS | box4 |
| §7.3 | Comment add does NOT bump ticket modified_at | `comments` insert-only · A8 | `comments.int` no-bump (CI); `tickets-service` unit (RUN✓) | MC-23 | PASS | n/a | PASS | PASS | box6 |
| §8.1 | Board: 5 columns per state in workflow order | `board labels COLUMN_ORDER`; `Column` · A12 | `labels` unit (RUN✓); `filters` unit (RUN✓) | MC-29 | PASS | n/a | PASS | PASS | box5 |
| §8.2 | Card shows title + type | `TicketCard/CardFace` · A12 | `ticket-card` component (DOM) | MC-30 | PASS | n/a | PASS | PASS | box5 |
| §8.3 | Drag persists; failed drag rolls back + error | `BoardPage` optimistic + rollback · A12 | `board-dnd` E2E persist+rollback (CI) | MC-31,32 | PASS | n/a | PASS\* (R5 M1) | PASS | box6 |
| §8.4 | Within column: most-recently-modified first | `filters bucketByState`; `listTickets orderBy` · A12/A7 | `filters` unit (RUN✓); `board-pipeline.perf` order (RUN✓) | MC-33 | PASS | n/a | PASS | PASS | box5 |
| §8.5 | Filter by type+epic + case-insensitive title search, AND-combined | `filters filterTickets`; `listTickets where` · A12/A7 | `filters` unit (RUN✓); `tickets-service` unit AND (RUN✓); `tickets.int` (CI) | MC-34 | PASS | n/a | PASS | PASS | box5 |
| §8.6 | Usable with ≥100 tickets | `filters` memoized; `TicketCard` memo; index `teamId` · A12/A3 | `board-pipeline.perf` 200-ticket budget (RUN✓); board-render perf (DOM) | MC-35 | PASS (Risk#11) | n/a | PASS | PASS | box5 |
| §9.1 | All C/U/D via API + RDBMS; no localStorage as system of record | modules + Prisma; `lib/auth` stores only token · A4-A8/A9 | all `*.int` (CI) | MC-36 | PASS | PASS | PASS | PASS | box6,10 |
| §9.2 | Meaningful status codes incl. 409 conflicts | `core/errors` mapping · A4 | `teams/epics/tickets.int` 400/401/403/404/409 (CI); R1 PASS | MC-37 | PASS | PASS | PASS | PASS | — |
| §9.3 | ISO-8601 UTC timestamps; no token in URL (verify token OK) | DTO `.toISOString()`; bearer header only · A4-A8 | `authz-security.int` (CI); R1/R2 PASS | MC-38 | PASS | PASS | PASS | PASS | — |
| §9.4 | Migrations; fresh DB no seed data | `prisma/migrations` · A3; compose entrypoint · A2 | migration presence (CI); `harness.reset` verifies empty | MC-39 | PASS | n/a | n/a | PASS | box7,9 |
| §10 | Minimum screens present | `features/*/routes.tsx` · A10-A13/A15 | `critical-path` E2E visits each (CI) | MC-40 | PASS | n/a | PASS | PASS | box1-6 |
| §11-sec | Protect endpoints, hash, validate input, no committed secrets | auth+Ajv+config; gitleaks CI · A4/A2 | `authz-security.int` (CI); R2 review | MC-41 | PASS | **BLOCK (R2 MF-1 fast-jwt)** | PASS | **CONDITIONAL** | box8 |
| §11-sec (R4-H1) | JWT_SECRET fail-fast: reject missing/empty, <32 chars, known-weak default | `core/config requiredJwtSecret` · A4 | `config` unit R4-H1 guard×5 (RUN✓) | MC-41 | PASS | PASS | PASS | PASS | box8 |
| §11-rel | Refresh/restart preserves data | Postgres volume; API source of truth · A2/A3 | `board-dnd` survives-refresh E2E (CI) | MC-42 | PASS | n/a | PASS | PASS | box6 |
| §11-usa | Loading/empty/success/error states | `components` Loading/Empty/Error/Toast · A9 | `design-system` component (DOM) | MC-43 | PASS | n/a | PASS | PASS | — |
| §11-compat | Desktop Chrome/Edge/Firefox | SPA; Playwright matrix · A9/A14 | `playwright.config` 3 browsers (CI) | MC-44 | n/a | n/a | n/a | PASS | — |
| §11-maint | README (prereqs/config/startup) | `README.md` · A2 | manual review | MC-45 | PASS | n/a | n/a | PASS | box7 |
| §11-test | Automated tests ≥1 BE + ≥1 FE/API flow | this suite · A14 | BE unit+int (RUN✓/CI); FE unit+E2E (RUN✓/CI) | MC-46 | PASS | n/a | PASS | PASS | — |

## Requirement Audit — verdict: **CONDITIONAL FAIL**

Every requirement is mapped to an implementation, an automated test, a manual test, an owner, all required review
columns, and a DoD box — **there are no unmapped requirements** (traceability is complete). The audit nonetheless
does **not** issue an unconditional PASS, because of open BLOCKERS that touch a mapped requirement:

- **BLOCKER-1 (§11-sec):** R2 **MF-1** — Critical runtime CVE in `@fastify/jwt`/`fast-jwt` (the sole JWT path). Owner **A4/A5** + Dependency Gate. Mirrors tech-audit **F1**.
- **BLOCKER-2 (tooling/TDR):** tech-audit **F2–F5** — Vitest major split, TypeScript drift, `@testing-library/react` + DOM env undeclared in the frozen TDR (also R2 **MF-3**). Owners **A9/A1** + Dependency Gate.
- **NON-BLOCKING (tracked):** R5 **M1** (concurrent-drag whole-list rollback — §6.7/§8.3, owner A12), R5 **L1** (board cache invalidation, A12), R4 High deployment/secret finding (owner A2). These do not block the requirement audit but must be dispositioned.

The requirement audit flips to **PASS** when BLOCKER-1 and BLOCKER-2 are cleared and the CI/DOM-gated suites
(integration, E2E, component) run green in the Dockerized pipeline.
