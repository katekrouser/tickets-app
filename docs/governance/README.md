# Governance

The project's living records, maintained by the **Project Historian (G1)** across the entire lifecycle.
(ADRs live in [../architecture/decisions/](../architecture/decisions/README.md); the technology-change log and
CHANGELOG are cross-linked below.)

| File | Contents |
|---|---|
| [decision-log.md](decision-log.md) | All notable decisions (technical/process/scope), linking ADRs |
| [bug-log.md](bug-log.md) | Every defect: root cause, owner, fix, verification, regression test; Closed only when both exist |
| [known-issues.md](known-issues.md) | Open / deferred / accepted problems (shipped-with must appear in Release Notes) |
| [tech-debt-register.md](tech-debt-register.md) | Shortcuts & structural weaknesses (often from R0); P1 resolved or accepted before DoD |
| [lessons-learned.md](lessons-learned.md) | Blameless retrospective captured at each phase gate and release |
| [release-notes.md](release-notes.md) | Human-readable per-release summary derived from the CHANGELOG |

## Governance framework (not G1-owned — see [OWNERSHIP.md](OWNERSHIP.md))
| File | Owner | Purpose |
|---|---|---|
| [OWNERSHIP.md](OWNERSHIP.md) | A1 | Canonical single-source ownership registry + rules |
| [SELF_VALIDATION.md](SELF_VALIDATION.md) | A1 | Automated checks (V1–V14 + V13b/V-own-sync/V-gate2) the MO/CI run at each gate |
| [GLOSSARY.md](GLOSSARY.md) | G1 | Disambiguated governance terms (DoD vs FEATURE-COMPLETE, roles, TCR…) |
| [REMEDIATION_WORKFLOW.md](REMEDIATION_WORKFLOW.md) | A1 | Executable audit-remediation backlog |
| [FAILURE_RECOVERY.md](FAILURE_RECOVERY.md) | A1 | Recovery playbook per failure mode |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | A2 | Release gate |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | A2 | Local Docker-Compose deploy gate (prod out of scope) |

Related, owned by G1 but located elsewhere: [`/CHANGELOG.md`](../../CHANGELOG.md) (repo root),
[ADRs](../architecture/decisions/README.md), and the [technology-change log](../technology/technology-changes.md).
Every fixed bug gets a Bug Log entry **and** a CHANGELOG `### Fixed` line; every architecture-affecting change gets an ADR.
