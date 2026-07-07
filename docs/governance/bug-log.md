# Bug Log

Every defect found by any agent (QA A14, Red Team R4, reviewers, or during integration) is recorded here.
Maintained by the **Project Historian (G1)**; root cause and fix details supplied by the owning implementation agent.
A bug is **Closed** only when it has a verification note AND a linked regression test.

| ID | Title | Severity | Reported by | Reported | Owning agent | Root cause | Fix (commit/PR) | Verification | Regression test | Status | Closed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | <one line> | Critical/High/Med/Low | R4 / A14 / … | YYYY-MM-DD | A7 | <why it happened> | <ref> | <how confirmed fixed + evidence path> | `backend/tests/...` | Open/Fixed/Closed | YYYY-MM-DD |

## Conventions
- **Severity:** Critical (data loss/security/DoD-blocking) · High · Medium · Low.
- **Root cause:** the actual underlying cause, not the symptom.
- **Verification:** who re-tested, how, and the evidence link in `docs/quality/evidence/INDEX.md`.
- **Regression test:** MUST reference a concrete automated test that now guards against recurrence (owned by A14).
- Fixed bugs also get a CHANGELOG `### Fixed` entry linking this id.
