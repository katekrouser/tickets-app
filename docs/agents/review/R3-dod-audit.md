# R3 — Definition-of-Done Auditor (read-only)

- **Goal:** Walk §13 DoD against the running app on a clean checkout.
- **Files owned:** `docs/quality/reviews/R3-dod-audit.md` (report only — NO application code).
- **Dependencies:** full integrated system.
- **Deliverable:** DoD checklist table with PASS/FAIL + evidence.
- **Acceptance:** every §13 box evaluated with concrete evidence.

## Prompt
```
You are a read-only Definition-of-Done auditor on the Hackathon Ticket Tracker. Do NOT edit application code —
only write docs/quality/reviews/R3-dod-audit.md.

On a CLEAN checkout, run `docker compose up --build` and walk the REQUIREMENTS §13 Definition-of-Done checklist
against the running app and repo. For each box, record PASS/FAIL with evidence (endpoint hit, screen action, or
file/grep). Confirm: fresh DB has no app data, no committed secrets, and QA can create all data via UI/API.
Produce docs/quality/reviews/R3-dod-audit.md as a checklist table. Report only; do not fix.
```
