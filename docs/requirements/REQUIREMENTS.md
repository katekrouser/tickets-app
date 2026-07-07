# Hackathon Task: Ticketing System — Requirements (canonical)

> Extracted verbatim from `Hackathon Task.docx`. This is the single source of truth for scope.
> A Kanban-style ticket tracker: three-tier SPA + HTTP API + RDBMS.

## 1. Objective
Registered users organize work tickets by team and move them through a fixed Kanban workflow.
Must demonstrate a functional UI, server-side business logic, and persistent relational storage.

## 2. Required Architecture
- SPA frontend; backend HTTP API; RDBMS (e.g. PostgreSQL) in a dedicated server-based container.
- Clear separation of presentation / application-API / persistence tiers.
- Frontend + backend may be separate containers, or backend serves the compiled SPA.
- From a clean checkout, `docker compose up --build` from the repo root must start everything.
  No host-installed FE/BE/DB runtime beyond Docker Compose. Must run on clean Win/macOS/Linux.
- Languages/frameworks unrestricted; must be cross-platform.

## 3. Auth
- Sign up with email + password. Emails trimmed, compared case-insensitively, unique.
- Login/logout with local credentials. No SSO.
- Passwords ≥ 8 chars, never plaintext, hashed with an established algorithm (e.g. Argon2id).
- After sign-up send verification email via configurable SMTP; must support `relay1.dataart.com`.
- Unverified accounts cannot use the main app.
- Verification tokens expire after 24h, single-use. Success → login screen (no auto-login).
- Unverified users can request a new verification email; new token invalidates prior unused tokens.
- All business screens/endpoints require auth EXCEPT: sign-up, login, email verification,
  verification-email resend. Static assets and health/readiness endpoints may be public.

## 4. Teams
- Tickets grouped by team. Authenticated users can view/create/rename/delete teams.
- Fields ≥: id, name, created_at, modified_at.
- Names non-empty after trim; unique case-insensitively.
- Cannot delete a team containing tickets or epics → clear validation message; no cascade.
- No ownership/membership in scope; all verified users manage all teams.

## 5. Epics
- Each epic belongs to exactly one team; team set at creation, immutable.
- Separate screen for epic CRUD.
- Fields ≥: id, team ref, title, optional description, created_at, modified_at. Title non-empty after trim.
- A ticket may optionally reference one epic (dropdown), only an epic from the SAME team — backend enforced.
- Cannot delete an epic while tickets reference it → clear validation message.

## 6. Tickets
Fields:
- **ID** (system-generated, stable, unique)
- **Team** (required, existing team ref; determines board)
- **Type** (required): `bug | feature | fix` (labels only, no behavior difference)
- **State** (required): `new | ready_for_implementation | in_progress | ready_for_acceptance | done`
  (canonical API values; UI shows human-readable labels; fixed workflow)
- **Epic** (optional; null or an epic from the ticket's team)
- **Title** (required, non-empty after trim)
- **Body** (required, non-empty; plain text or Markdown)
- **Created at** (server-set UTC at creation)
- **Modified at** (server-set UTC on any field/state change; adding a comment does NOT change it)
- **Created by** (auto from authenticated user)

Operations:
- Create; open/view all fields (incl. created_by/at, modified_at).
- Edit type, team, epic, title, body, state.
- Modified_at = latest actual field/state change; saving unchanged values must NOT advance it.
- When team changes, UI clears/replaces selected epic; backend rejects epic from a different team.
- Delete after explicit confirmation; deleting a ticket deletes its comments.
- Drag-and-drop state changes persisted immediately.
- Backend validates all enum values and references (client-side validation is insufficient).

## 7. Comments
- Authenticated users add comments to a ticket.
- Fields: id, ticket ref, author, body, created_at. Body non-empty.
- Displayed chronologically, oldest first.
- Adding a comment does NOT update ticket modified_at (no board reorder).
- Immutable after creation (edit/delete are stretch).

## 8. Kanban Board
- Primary screen; board for one selected team.
- Exactly five columns, one per state, in workflow order.
- Card shows ≥ title and type (epic recommended).
- Drag card between columns → changes state, persists via API.
- On failed drag update: card returns to previous column + UI error.
- Any-to-any state moves allowed (no sequential enforcement).
- Within a column: ordered by most-recently-modified first (no manual persisted order).
- Clear way to create a ticket and open an existing one.
- Filtering by type and epic + case-insensitive substring search over title; filters AND-combined
  (client or server side).
- Usable with ≥ 100 tickets on one board.

## 9. API & Persistence
- All create/update/delete via backend API, persisted in RDBMS. No local storage as system of record.
- DB constraints and/or server-side validation for referential integrity.
- Meaningful HTTP status codes/messages for validation, auth, missing records, conflicts.
  Deleting a team with tickets/epics, or an epic referenced by tickets → HTTP 409 Conflict.
- IDs may be UUIDs or DB numerics. API timestamps ISO-8601 UTC.
- Cookie sessions OR bearer tokens acceptable. Never put session/access/bearer tokens in URLs.
  A single-use email-verification token MAY be in the verification URL.
- No concurrent-edit conflict detection required; last write wins.
- Schema creation automated via migrations / repeatable init.
- Fresh DB after migrations: no users/teams/epics/tickets/comments (migration metadata allowed).
  Default startup must NOT load seed data; QA creates data via UI/API.

## 10. Minimum Screens
Sign-up · Email-verification result · Resend-verification action · Login ·
Kanban board with team selector · Ticket create/edit/details · Team management · Epic management.

## 11. Non-Functional
- Security: protect endpoints, hash passwords, validate input, no committed credentials/SMTP secrets.
- Reliability: refresh/restart must not lose persisted data.
- Usability: loading/empty/success/error states.
- Compatibility: current desktop Chrome/Edge/Firefox.
- Maintainability: README (prerequisites, config, startup).
- Testing: automated tests covering ≥1 backend business flow and ≥1 frontend/API flow.

## 12. Out of Scope
Scrum/sprints/backlogs/story points/velocity/burndown; SSO/OAuth/social; fine-grained roles/admins/
membership/private teams/per-ticket access; attachments/notifications/mentions/watchers/audit/realtime;
custom workflows/types/subtasks/dependencies/time-tracking/reporting.

## 13. Definition of Done
- [ ] Sign up → verification email via SMTP → verify → log in.
- [ ] Teams and epics managed via UI and persisted.
- [ ] Verified user can create/view/edit/delete tickets.
- [ ] Add comments; see author and timestamp.
- [ ] Board shows tickets in correct state columns for selected team.
- [ ] Drag to another column updates server and remains correct after refresh.
- [ ] `docker compose up --build` from repo root on a clean checkout.
- [ ] No hard-coded password or committed secret.
- [ ] Fresh DB: schema + migration metadata only; no preloaded data.
- [ ] QA can create all test/demo data via UI/API without touching DB records.

## 14. Stretch
Password reset · edit/delete own comments · ticket activity history · virtualized large boards.

## 15. Wireframes (informational)
Low-fidelity only; alternative layouts allowed if all mandatory actions/states remain clear.
Header user menu includes Log out. Disabled delete controls indicate referenced (undeletable) records.
