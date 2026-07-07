# Risk Register

Project-level implementation risks, severity, mitigation, and owning agent(s). Maintained alongside the
[Development Plan](DEVELOPMENT_PLAN.md); new risks discovered during the run are added here and cross-linked from
the [Tech Debt Register](../governance/tech-debt-register.md) / [Known Issues](../governance/known-issues.md) where relevant.

| # | Risk | Sev | Mitigation | Owner |
|---|---|---|---|---|
| 1 | Contract drift BE↔FE | High | Frozen spec; R1 conformance gate; generated client | A1/R1 |
| 2 | modified_at semantics (no bump on no-op/comment) | High | Invariant tests; dirty-check before write | A7/A14 |
| 3 | Cross-team epic on ticket edit | High | Server check + test; UI clears epic on team change | A7/A12 |
| 4 | 409 delete-guards | Med | DB RESTRICT + mapped error + tests | A5/A6/A7 |
| 5 | Verification token lifecycle (24h, single-use, resend) | High | Token table w/ expiry+used; concurrency tests | A4/A14 |
| 6 | SMTP relay1.dataart.com flaky | Med | Configurable transport + Mailhog fallback; no committed creds | A4/A2 |
| 7 | `docker compose up --build` fails on clean QA laptop | High | Fresh-clone CI on all OSes; healthchecks + wait-order | A2/R4 |
| 8 | Committed secrets | High | `.env.example` only; gitignore; CI secret-scan; R2 | A2/R2 |
| 9 | Fresh DB accidentally seeded | Med | No seed on default path; metadata-only assertion | A3/R4 |
| 10 | DnD failure not rolled back | Med | Optimistic update + rollback + toast; E2E test | A12/A14 |
| 11 | Board slow at 100 tickets | Low-Med | Indexed query, memoized cards, optional virtualization | A7/A12 |
| 12 | Auth leak (token in URL / open endpoint) | High | Bearer header only; blanket requireAuth + allowlist; R2 | A4/R2 |
| 13 | Unauthorized/unvetted dependency (stack drift from TDR) | High | TDR freeze; MO Dependency Gate; A14 tech-audit; R2 supply-chain; R0 conformance | A4/A9/MO |
| 14 | A1 ownership concentration (contract + architecture + TDR + orchestration-design docs + all charters) — single point of failure / self-referential authorship | Med | (1) **SPOF window is Phase 0 only** — contract & TDR are immutable once frozen at GATE 0, so Phase-1 BE/FE parallel work does not depend on A1 availability; (2) **designated backup author** — MO may reassign A1's Phase-0 deliverables per FAILURE_RECOVERY "critical single-owner agent unavailable"; (3) separation via R0 review + MO approval on all A1-authored artifacts. Residual risk accepted | A1/MO |

<!-- Severity: High · Med · Low. Add rows as risks surface; link mitigations to tests/reviews. -->
