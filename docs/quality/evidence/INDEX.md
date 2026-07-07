# Evidence Repository — Index

Central manifest of verification artifacts proving each Definition-of-Done gate was met. Artifacts are produced by
their owning agents and stored in their own directories; the **Project Historian (G1)** maintains this INDEX and
verifies every required artifact is present and linked before sign-off. G1 does not alter the artifacts themselves.

## Required artifacts (all must be present + linked before project DoD)
| Gate | Artifact | Produced by | Location | Present? |
|---|---|---|---|---|
| QA — automated | Test run logs (unit/integration/E2E) | A14 | `docs/quality/qa/` + CI run link | ☐ |
| QA — coverage | Coverage report + thresholds verdict | A14 | `docs/quality/qa/coverage-report.md` | ☐ |
| QA — manual | Manual checklist (Pass + evidence) | A14 | `docs/quality/qa/manual-checklist.md` | ☐ |
| QA — traceability | Requirement Traceability Matrix (complete) | A14 | `docs/quality/qa/rtm.md` | ☐ |
| Architecture | R0 architecture report (no High/Critical) | R0 | `docs/quality/reviews/R0-architecture.md` | ☐ |
| Contract | R1 contract-drift report (zero drift) | R1 | `docs/quality/reviews/R1-contract-drift.md` | ☐ |
| Security | R2 security report (no High/Critical) | R2 | `docs/quality/reviews/R2-security.md` | ☐ |
| Red Team | R4 bug reports + repros (all High/Critical Closed) | R4 | `docs/quality/reviews/R4-redteam.md`, `docs/quality/reviews/R4-repro/` | ☐ |
| DoD | R3 DoD audit (all §13 PASS) | R3 | `docs/quality/reviews/R3-dod-audit.md` | ☐ |
| Governance | CHANGELOG, ADRs, Bug Log up to date | G1 | `CHANGELOG.md`, `docs/architecture/decisions/`, `docs/governance/` | ☐ |

## Screenshots / logs (append rows)
| Date | Item | What it proves | Path | Linked from |
|---|---|---|---|---|
| YYYY-MM-DD | | | | |

<!-- Rule: no gate may be marked PASS in the DoD audit unless its evidence row here is filled and the artifact exists. -->
