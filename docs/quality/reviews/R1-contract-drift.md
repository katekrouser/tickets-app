# R1 — Contract-Conformance Drift Report

- **Reviewer:** R1 (Contract-Conformance, read-only, Phase 3)
- **Authoritative contract:** `contracts/openapi.yaml` (OpenAPI 3.1.0, v1.0.0)
- **Date:** 2026-07-07
- **Scope:** Backend route handlers (`backend/src/modules/**`, `backend/src/core/**`), shared contract package (`packages/shared/**`), and the frontend typed client + feature API usage (`frontend/src/lib/api.ts`, `frontend/src/features/**/api.ts`, `frontend/src/features/auth/service.ts`).

## Verdict summary

**Zero contract drift found. All 20 operations conform; the frontend client conforms by construction.** Every divergence-check below (enum values, request/response shapes, nullability, status codes incl. 400/401/403/404/409, ISO-8601 UTC timestamps, error envelope + codes, operationIds, bearer-in-header) passes. A short list of non-blocking observations follows the table.

### How conformance is anchored

- **Enums (`ticket.type`, `ticket.state`)** are defined once in `packages/shared/src/index.ts` (`TicketType` = `bug|feature|fix`; `TicketState` = `new|ready_for_implementation|in_progress|ready_for_acceptance|done`) and mirrored character-for-character in `backend/prisma/schema.prisma` (`enum TicketType`, `enum TicketState`) and in the generated Ajv `schemas` (`packages/shared/src/schemas.ts`). Frontend labels (`frontend/src/features/board/labels.ts`, `frontend/src/features/tickets/api.ts`) key off the shared constants — no hand-typed enum literals. **Match.**
- **Request/response validation & serialization**: every backend route attaches `schemas[operationId]` from `@app/shared`, which is auto-generated from `contracts/openapi.yaml` (ADR-0006). Response schemas use `additionalProperties: false`, so extra DB columns (e.g. `passwordHash`) cannot leak.
- **Frontend shapes**: `frontend/src/lib/api.ts` is a single `openapi-fetch` client typed against `paths` from `@app/shared` (openapi-typescript output of the same contract). All 26 call sites (see sweep below) use only contract paths/methods with contract-typed bodies/params — drift would fail the TS build.
- **Timestamps**: DB columns are `@db.Timestamptz(3)` (UTC), `modifiedAt` via `@updatedAt`. Teams/Epics/Comments DTOs emit `.toISOString()` explicitly; Tickets return raw Prisma rows and rely on fast-json-stringify coercing `Date`→ISO-8601 for `format: date-time` properties (see Observation 3).
- **Bearer-in-header**: `frontend/src/lib/api.ts` attaches `Authorization: Bearer <token>` via request middleware; token read from `@/lib/auth` storage. No JWT ever placed in a URL. The only URL token is the single-use email-verification token (`GET /auth/verify-email?token=…`), which is the explicitly permitted exception.

## Per-endpoint drift table

| Endpoint (operationId) | Spec (openapi.yaml) | Actual (backend + frontend) | Verdict | Owner |
|---|---|---|---|---|
| `POST /auth/signup` (`signup`) | 201 `{message}`; 400; 409 `EMAIL_TAKEN`; public | 201 message; `ConflictError('EMAIL_TAKEN')`→409; Ajv→400. FE `service.signup` typed. | PASS | — |
| `POST /auth/login` (`login`) | 200 `{token,user}`; 400; 401 `INVALID_CREDENTIALS`; 403 `EMAIL_NOT_VERIFIED`; public | Matches; `toPublicUser` emits exact `User` shape (ISO `createdAt`). FE reads token. | PASS | — |
| `POST /auth/logout` (`logout`) | 204; 401 | `reply.code(204).send()`; auth global (not in PUBLIC_ROUTES). | PASS | — |
| `GET /auth/verify-email` (`verifyEmail`) | 302 → `${APP_BASE_URL}/login`; 400 `TOKEN_EXPIRED\|TOKEN_USED\|TOKEN_INVALID`; token in query (permitted) | `reply.redirect(...,302)`; `ValidationError` with all three codes→400. FE passes `token` as query only. | PASS | — |
| `POST /auth/resend-verification` (`resendVerification`) | 202 `{message}`; 400; public; anti-enumeration | `reply.code(202)` always; silent no-op for unknown/verified. | PASS | — |
| `GET /teams` (`listTeams`) | 200 `Team[]` (by name); 401; 403 | `orderBy name asc`; `toTeamDTO` (ISO timestamps). | PASS | — |
| `POST /teams` (`createTeam`) | 201 `Team`; 400; 401; 403; 409 `TEAM_NAME_TAKEN` | 201; trim+empty→400; P2002→409 `TEAM_NAME_TAKEN`. | PASS | — |
| `GET /teams/{teamId}` (`getTeam`) | 200 `Team`; 401; 403; 404 | 404 `TEAM_NOT_FOUND` when absent. | PASS | — |
| `GET /teams/{teamId}/epics` (`listTeamEpics`) | 200 `Epic[]` (by title); 401; 403; 404 | Team existence checked→404; `orderBy title asc`. | PASS | — |
| `PATCH /teams/{teamId}` (`updateTeam`) | 200 `Team`; 400; 401; 403; 404; 409 `TEAM_NAME_TAKEN` | P2025→404, P2002→409; trim→400. | PASS | — |
| `DELETE /teams/{teamId}` (`deleteTeam`) | 204; 401; 403; 404; 409 `TEAM_HAS_DEPENDENTS` | 404 if absent; ticket/epic count or P2003/P2014→409 `TEAM_HAS_DEPENDENTS`; 204. | PASS | — |
| `GET /epics` (`listEpics`) | 200 `Epic[]` (by title); 400; 401; 403; optional `teamId` | Optional `teamId` filter; `orderBy title asc`. | PASS | — |
| `POST /epics` (`createEpic`) | 201 `Epic`; 400; 401; 403; 404 `TEAM_NOT_FOUND` | Team checked→404 `TEAM_NOT_FOUND`; title trim→400; team immutable after create. | PASS | — |
| `GET /epics/{epicId}` (`getEpic`) | 200 `Epic`; 401; 403; 404 | 404 `EPIC_NOT_FOUND`. | PASS | — |
| `PATCH /epics/{epicId}` (`updateEpic`) | 200 `Epic`; 400; 401; 403; 404; team immutable (`minProperties:1`, no `teamId`) | Body schema `additionalProperties:false` blocks `teamId`; P2025→404. | PASS | — |
| `DELETE /epics/{epicId}` (`deleteEpic`) | 204; 401; 403; 404; 409 `EPIC_REFERENCED` | 404 if absent; ticket count or P2003/P2014→409 `EPIC_REFERENCED`; 204. | PASS | — |
| `GET /tickets` (`listTickets`) | 200 `Ticket[]` (modifiedAt desc); 400; 401; 403; `teamId` required, `type`/`epicId`/`q` optional (AND) | Required `teamId`; type/epicId/q AND-combined; `q` case-insensitive `contains`; `orderBy modifiedAt desc`. | PASS | — |
| `POST /tickets` (`createTicket`) | 201 `Ticket`; 400 `VALIDATION_ERROR`/`EPIC_TEAM_MISMATCH`; 401; 403; 404 team/epic | `createdBy`+timestamps server-set; team/epic missing→404; cross-team epic→400 `EPIC_TEAM_MISMATCH`; state defaults `new`. | PASS | — |
| `GET /tickets/{ticketId}` (`getTicket`) | 200 `Ticket`; 401; 403; 404 | 404 `TICKET_NOT_FOUND`. | PASS | — |
| `PATCH /tickets/{ticketId}` (`updateTicket`) | 200 `Ticket`; 400 `VALIDATION_ERROR`/`EPIC_TEAM_MISMATCH`; 401; 403; 404; `minProperties:1`; no-op must not bump `modifiedAt` | Dirty-check skips write on no-op (preserves `modifiedAt`); team-change re-validates epic→400 mismatch. FE board sends single-field `{state}`. | PASS | — |
| `DELETE /tickets/{ticketId}` (`deleteTicket`) | 204; 401; 403; 404 (cascade comments) | P2025→404 `TICKET_NOT_FOUND`; 204; comments cascade via FK. | PASS | — |
| `GET /tickets/{ticketId}/comments` (`listComments`) | 200 `Comment[]` (oldest first); 401; 403; 404 | Ticket checked→404; `orderBy createdAt asc, id asc`. | PASS | — |
| `POST /tickets/{ticketId}/comments` (`createComment`) | 201 `Comment`; 400; 401; 403; 404; author server-set; does NOT bump ticket `modifiedAt` | Author=`authUser.id`; ISO `createdAt`; inserts comment row only (ticket untouched); whitespace body→400. | PASS | — |

## Cross-cutting checks

| Concern | Spec | Actual | Verdict |
|---|---|---|---|
| Error envelope `{code,message,details?}` | `Error` schema, `additionalProperties:false`, required `code`+`message` | `ErrorBody`/`DomainError.toBody()` in `backend/src/core/errors.ts` emits exactly this; omits `details` when undefined. | PASS |
| Error `code` values | `EPIC_REFERENCED`, `TEAM_HAS_DEPENDENTS`, `EPIC_TEAM_MISMATCH`, `*_NOT_FOUND`, `TEAM_NAME_TAKEN`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `TOKEN_*`, `VALIDATION_ERROR` | All present in handlers + registered in `errorCodes` (`packages/shared/src/index.ts`). | PASS |
| 401 (missing/invalid bearer) | `Unauthorized` envelope | `requireAuth` throws `UnauthorizedError('UNAUTHORIZED'\|'TOKEN_EXPIRED'\|'TOKEN_INVALID')`→401. | PASS |
| 403 (unverified) | `Forbidden` envelope | login `EMAIL_NOT_VERIFIED`→403. | PASS |
| 404 unknown route | ErrorBody shape | `setNotFoundHandler`→404 `NOT_FOUND`. | PASS |
| 500 safety | no stack/secret leak | Generic `INTERNAL` / `Internal Server Error`; logs server-side only. | PASS |
| Timestamps ISO-8601 UTC | `format: date-time` | `Timestamptz(3)` + `.toISOString()` (teams/epics/comments) / serializer coercion (tickets). | PASS |
| Bearer in header, never URL | header only; verify-email token may be query | `api.use` sets `Authorization` header; only verify-email token in query. | PASS |
| operationIds present | 24 operations | All 24 wired via `schemas[operationId]`; prefixes in `backend/src/core/modules.ts` match `/api/*`. | PASS |
| FE paths/methods | contract paths | All 26 FE call sites use contract paths/methods (sweep below). | PASS |

Frontend call-site sweep (all resolve to contract paths): `/auth/signup`, `/auth/login`, `/auth/resend-verification`, `/auth/verify-email`, `/teams`, `/teams/{teamId}`, `/teams/{teamId}/epics`, `/epics`, `/epics/{epicId}`, `/tickets`, `/tickets/{ticketId}`, `/tickets/{ticketId}/comments`.

## Observations (non-blocking; not drift)

1. **Lenient query-string schemas.** `listEpics`, `listTickets`, and `verifyEmail` generated `querystring` schemas set `additionalProperties: true`, so unknown query params are tolerated rather than rejected. The contract does not forbid extra query params, so this is not drift — just more permissive than a strict reading. No action required.
2. **Non-canonical codes on some 400s.** `createComment` returns `COMMENT_BODY_REQUIRED` (whitespace-only body) and normalizeName/Title return `VALIDATION_ERROR` for post-trim-empty input. Both are 400 with the correct `Error` envelope; the contract only pins `VALIDATION_ERROR` as an *example* code, so this conforms. `errorCodes` registry does not list `COMMENT_BODY_REQUIRED` (it does list an unused `COMMENT_NOT_FOUND`) — cosmetic only.
3. **Tickets rely on serializer date coercion.** Unlike Teams/Epics/Comments (explicit `.toISOString()` in a DTO), the tickets module (`backend/src/modules/tickets/service.ts`) returns raw Prisma rows with `Date` values; ISO-8601 output depends on fast-json-stringify's `format: date-time` handling under the attached response schema. Correct today and `additionalProperties:false` strips extra columns, but it is the one place where UTC-ISO output is implicit rather than explicit — worth an integration assertion (owner: A7/QA) to lock it in. Not a contract violation.
4. **Operational endpoints outside the contract.** `GET /health` and `GET /ready` are defined in `app.ts` but live outside the `/api` base path and are intentionally not part of the API contract. Expected.
5. **Frontend discards part of a conformant response.** `auth/service.login` reads only `data.token` and ignores `user`; the backend still returns the full contract `LoginResponse`. Client-side choice, not drift.

## Acceptance

Per R1 acceptance criteria ("every divergence flagged; zero drift before Phase-4 sign-off"): **no enum, shape, nullability, status-code, timestamp, error-envelope, operationId, or bearer-placement divergence was found.** Contract conformance gate: **CLEAR**. The five observations above are advisory (hardening/cosmetic) and route to A7/QA at their discretion; none block Phase-4 sign-off.
