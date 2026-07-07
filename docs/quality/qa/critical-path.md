# Critical-Path Suite

> Owner: A14. The one end-to-end journey that must always work — the §13 Definition-of-Done flow. Tag: `@critical`.
> Automated by `e2e/tests/critical-path.spec.ts` (+ `board-dnd.spec.ts` for the drag guarantees).

## The path (signup → verify → login → team → epic → ticket → comment → drag → logout)
| Step | Action | Assertion | REQ / DoD |
|---|---|---|---|
| 1 | Sign up with a unique email + password ≥8 | 201; "check your email"; no auto-login | §3.1 / box1 |
| 2 | Open the Mailhog-captured verification link | Redirect to /login (no auto-login) | §3.4/§3.6 / box1 |
| 3 | Log in | Land on /board | §3.2 / box1 |
| 4 | Create a team | Team appears in Team management | §4.1 / box2 |
| 5 | Create an epic in that team | Epic appears; bound to the team | §5.1 / box2 |
| 6 | Create a ticket (team required, type, title, body; optional same-team epic) | Ticket created; server-set created_by/at | §6.1/§6.3 / box3 |
| 7 | Open the ticket, add a comment | Comment shows author + timestamp; ticket modified_at unchanged | §7.1/§7.3 / box4 |
| 8 | Drag the card to another column | State changes, persists, survives reload | §6.7/§8.3 / box5,6 |
| 9 | (negative) Force the drag PATCH to fail | Card rolls back + error shown | §8.3 |
| 10 | Log out via header menu | Return to /login | §3.2 |

## Data
Created fresh per run via UI/API on an empty DB (§9.4). Mailhog supplies the verification link.

## Pass criteria
The full path is green on **chromium** (always-on gate) and on the **firefox/edge** matrix (§11 compatibility).
This suite is the last gate before "done"; a critical-path failure is a release blocker regardless of other results.

**Status:** authored; executes in CI/Docker against the running stack (no browser in the authoring sandbox).
