# Risk Matrix

> Owner: A14. Product + quality risks, likelihood × impact, mitigation, and the test/owner that covers each.
> Scale: L/M/H. Priority = L×I.

| # | Risk | L | I | Pri | Mitigation / test coverage | Owner |
|---|---|---|---|---|---|---|
| R1 | Runtime JWT lib CVE (`fast-jwt`) enables token forgery/algorithm confusion | M | H | **H** | Tech-audit F1 BLOCKER; bump within 9.x; `authz-security.int` JWT-tamper regression | A4/A5 |
| R2 | `modified_at` bumped by no-op save or comment → board churn (§6/§7) | M | H | **H** | `tickets-service` unit (RUN✓); `tickets.int`/`comments.int` no-bump | A7/A8 |
| R3 | Cross-team epic accepted on ticket create/update (§5/§6) | M | M | M | `tickets-service` unit (RUN✓); `tickets.int` mismatch | A7 |
| R4 | Enum bypass (client-only validation) persists bad state (§6) | L | H | M | Ajv server schemas; `tickets.int`/`authz-security.int` | A1/A7 |
| R5 | Unverified user reaches the app (§3.5) | L | H | M | Global auth + 403 gate; `auth.int` unverified-block | A5/A4 |
| R6 | Verification token reuse / no expiry / resend leak (§3.6/§3.7) | M | M | M | `tokens` unit (RUN✓); `auth.int` reuse/expired/supersede | A5 |
| R7 | Delete cascade/RESTRICT wrong → orphaned or lost data (§4/§5/§6) | M | H | **H** | FK RESTRICT/CASCADE; `teams/epics/tickets.int` 409 + cascade | A3/A6/A7/A15 |
| R8 | Drag update not persisted / no rollback on failure (§8.3) | M | M | M | `board-dnd` E2E persist+rollback; **R5-M1 concurrent-drag open** | A12 |
| R9 | Password stored/logged in plaintext (§3.3/§11) | L | H | M | Argon2id; `password` unit (RUN✓); `authz-security.int` no-hash-leak | A5 |
| R10 | Injection / stored-XSS via API inputs (§11) | M | H | **H** | Prisma params; `authz-security.int` SQLi/XSS; `ticket-card` inert-render | A7/A9 |
| R11 | Board unusable at ≥100 tickets (§8.6) | M | M | M | Memoized pure pipeline; `board-pipeline.perf` (RUN✓); indexes (A3) | A12/A3 |
| R12 | Fresh DB ships seed data / migrations don't apply (§9.4) | L | H | M | Migration-only startup; `harness.reset` empty-check; E2E on fresh DB | A2/A3 |
| R13 | Committed secret / SMTP creds in repo (§11) | L | H | M | gitleaks CI; `.env.example` only; config from env | A2 |
| R14 | Token placed in URL (§9) | L | H | M | Bearer header only; verify-token URL is the sole exception; R1/R2 PASS | A4 |
| RQ1 | **QA risk:** integration/E2E/component authored but not executed in sandbox | H | M | **H** | Self-skip gating; MUST run green in CI/Docker before gate flips | A14/A2 |
| RQ2 | **QA risk:** Vitest major split / TS drift → tests behave differently FE vs BE | M | M | M | Tech-audit F2/F3; align versions + TDR pin | A9/A1 |
| RQ3 | **QA risk:** component tests can't run (no DOM env) → DS/XSS regressions escape | M | M | M | Tech-audit F5; TCR to add jsdom/happy-dom | A9 |

Top priorities (H): R1, R2, R7, R10, RQ1. All map to tests in `rtm.md`/`test-plan.md`.
