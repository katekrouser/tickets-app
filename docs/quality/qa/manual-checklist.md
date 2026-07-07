# Manual Testing Checklist

> Owner: A14. One row per REQUIREMENTS clause: {ref, test case, steps, expected, Pass/Fail, evidence}.
> **Status legend:** ☐ PENDING — execute against `docker compose up --build` (no live stack in the authoring
> environment). "Evidence" links the automated coverage that already exercises the same behaviour. Testers fill
> Pass/Fail + attach a screenshot/log path under `docs/quality/evidence/` when running the round.

Environment for the manual round: `docker compose up --build` at repo root → SPA `http://localhost:8080`,
Mailhog `http://localhost:8025`. Fresh DB, no seed data (§9). QA creates all data via the UI.

| MC | Ref | Test case | Steps | Expected result | P/F | Evidence |
|---|---|---|---|---|---|---|
| 01 | §3.1 | Sign up new account | Open /signup → enter unique email + password ≥8 → submit | 201; "check your email" message; no session established | ☐ | `auth.int` signup |
| 02 | §3.1 | Email uniqueness case-insensitive | Sign up `A@x.com`, then `a@X.com` | 2nd rejected "email already exists" (409) | ☐ | `auth.int` dup-409 |
| 03 | §3.2 | Login + logout | Verify an account, log in, use header menu → Log out | Land on /board after login; return to /login after logout | ☐ | `auth.int`; `critical-path` E2E |
| 04 | §3.3 | Password policy | Sign up with a 7-char password | Rejected: "at least 8 characters" | ☐ | FE `validation` unit; `password` unit |
| 05 | §3.4 | Verification email delivered | Sign up → open Mailhog | Email with a Verify link + 24h/one-time wording | ☐ | `verification-email` unit |
| 06 | §3.5 | Unverified cannot use app | Sign up (don't verify) → try to log in | 403 "verify your email"; no board access | ☐ | `auth.int` unverified-block |
| 07 | §3.6 | Verify then login (no auto-login) | Click the email link | Redirected to /login (NOT logged in automatically) | ☐ | `auth.int` verify-302 |
| 08 | §3.6 | Token single-use + expiry | Reuse the same link; separately try an expired link | "already used" / "expired" errors | ☐ | `auth.int` reuse/expired |
| 09 | §3.7 | Resend supersedes prior token | Request resend → old link no longer works, new one does | Old link invalid; new link verifies | ☐ | `auth.int` resend-supersede |
| 10 | §3.8 | Public vs protected routes | Hit /api/teams with no token; hit /health | 401 for /api/teams; 200 for /health | ☐ | `authz-security.int` |
| 11 | §4.1 | Team CRUD | Create, rename, delete a team via Team management | All persist; list reflects changes | ☐ | `teams.int` CRUD; E2E |
| 12 | §4.2 | Team fields shown | Open a team | id/name/created/modified present; ISO timestamps | ☐ | `teams.int`; R1 |
| 13 | §4.3 | Team name rules | Create "  " (spaces); create duplicate different case | Empty rejected (400); duplicate rejected (409) | ☐ | `teams.int` ws/dup |
| 14 | §4.4 | Block team delete w/ dependents | Add a ticket/epic, try delete team | 409 "has tickets or epics"; delete control disabled | ☐ | `teams.int` delete-409 |
| 15 | §5.1 | Epic team immutable | Create epic in Team A; attempt to change its team on edit | No team field on edit; change impossible | ☐ | `epics.int` immutable |
| 16 | §5.2 | Epic fields + title trim | Create epic "  Title  " with description | Title stored trimmed; description optional | ☐ | `epics.int` trim |
| 17 | §5.3 | Same-team epic dropdown | On ticket form pick team → epic list shows only that team's epics | Foreign-team epic not selectable; backend rejects it | ☐ | `tickets-service` unit; `tickets.int` |
| 18 | §5.4 | Block epic delete when referenced | Reference epic from a ticket, delete epic | 409 "referenced by tickets"; control disabled | ☐ | `epics.int` referenced |
| 19 | §6.1 | Ticket fields visible | Open a ticket | All fields incl. created_by/at + modified_at shown | ☐ | `tickets.int`; R1 |
| 20 | §6.2 | Enum validation server-side | POST ticket with bogus type/state (devtools) | 400 VALIDATION_ERROR | ☐ | `tickets.int`; `authz-security.int` |
| 21 | §6.3 | Server-set created_by/at | Create a ticket | created_by = current user; created_at server time | ☐ | `tickets-service` unit |
| 22 | §6.4 | No-op save keeps modified_at | Open ticket, save with no changes | modified_at unchanged; board order unchanged | ☐ | `tickets-service` unit; `tickets.int` no-op |
| 23 | §6.4/§7.3 | Comment does not bump modified_at | Note modified_at, add a comment, re-open | modified_at unchanged; card does not reorder | ☐ | `comments.int` no-bump |
| 24 | §6.5 | Team change vs epic | Change ticket team while epic set to old team | UI clears epic; backend rejects mismatched epic | ☐ | `tickets-service` unit orphan |
| 25 | §6.6 | Delete ticket + comments | Add comments, delete ticket after confirm | Ticket + its comments gone | ☐ | `tickets.int` cascade |
| 26 | §6.7 | Drag persists immediately | Drag a card to another column | State changes; persists (reload keeps it) | ☐ | `board-dnd` E2E |
| 27 | §7.1 | Add comment | Open ticket, add non-empty comment | Comment appears with author + timestamp; empty rejected | ☐ | `comments.int` add/empty |
| 28 | §7.2 | Comment order | Add several comments | Oldest-first chronological order | ☐ | `comments.int` order |
| 29 | §8.1 | Five columns in order | Open board | Exactly 5 columns in workflow order | ☐ | `labels` unit |
| 30 | §8.2 | Card content | Inspect a card | Shows title + type (epic optional) | ☐ | `ticket-card` component |
| 31 | §8.3 | Drag persists (server) | Drag then refresh | Card remains in the new column | ☐ | `board-dnd` E2E survive-refresh |
| 32 | §8.3 | Failed-drag rollback | Simulate API failure during drag | Card returns to old column + error shown | ☐ | `board-dnd` E2E rollback |
| 33 | §8.4 | Column ordering | Modify one card, watch its column | Most-recently-modified first | ☐ | `filters` unit; `board-pipeline.perf` |
| 34 | §8.5 | Filters AND-combined | Combine type + epic + search | Only tickets matching ALL survive; case-insensitive title | ☐ | `filters` unit; `tickets-service` unit |
| 35 | §8.6 | ≥100 tickets usable | Create ≥100 tickets (via API), open board | Board renders + filters/drag responsive | ☐ | `board-pipeline.perf` (RUN✓) |
| 36 | §9.1 | Persistence via API | Create data, inspect network + reload | All via /api; survives reload; no localStorage data | ☐ | all `*.int` |
| 37 | §9.2 | Status codes / 409 | Trigger validation/missing/conflict cases | 400/401/403/404/409 as specified | ☐ | `*.int` |
| 38 | §9.3 | ISO timestamps; no token in URL | Inspect API responses + URLs | ISO-8601 UTC; bearer only in header | ☐ | `authz-security.int`; R1/R2 |
| 39 | §9.4 | Fresh DB, no seed | Fresh `docker compose up`; query tables | Only schema + migration metadata; zero rows | ☐ | `harness.reset` |
| 40 | §10 | All screens reachable | Navigate every screen | Signup/verify/resend/login/board/ticket/team/epic all present | ☐ | `critical-path` E2E |
| 41 | §11 | Security basics | Review: hashing, secrets, input validation | Argon2id; no committed secrets (gitleaks); server validation | ☐ | R2 review; `authz-security.int` |
| 42 | §11 | Reliability on restart | Restart containers | Persisted data intact | ☐ | `board-dnd` survive-refresh |
| 43 | §11 | Loading/empty/error UX | Trigger slow/empty/error states | Loading spinner, empty message, error + retry shown | ☐ | `design-system` component |
| 44 | §11 | Browser compatibility | Run critical path on Chrome/Edge/Firefox | Works on all three | ☐ | Playwright matrix |
| 45 | §11 | README completeness | Follow README from clean checkout | Prereqs/config/startup accurate | ☐ | README review |
| 46 | §11 | Automated tests exist | Run `npm test` + CI | ≥1 BE flow + ≥1 FE/API flow green | ☐ | this suite (RUN✓) |

Total: 46 manual cases mapping every REQUIREMENTS clause (§3–§11 + §10 screens). DoD (§13) boxes are traced in `rtm.md`.
