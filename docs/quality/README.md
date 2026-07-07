# Quality

All quality evidence for the project. Populated during Phase 3 (Enterprise Quality) and Phase 4 (DoD sign-off).

| Subfolder | Owner | Contents |
|---|---|---|
| [`qa/`](qa/) | A14 | Test strategy, test plan, risk matrix, manual checklist, Requirement Traceability Matrix (RTM), coverage report, technology audit |
| [`reviews/`](reviews/) | R0–R5 (read-only) | `R0-architecture` · `R1-contract-drift` · `R2-security` · `R3-dod-audit` · `R4-redteam` (+ `R4-repro/`) · `R5-code-review` |
| [`evidence/`](evidence/INDEX.md) | G1 (index) | Manifest confirming every DoD gate has its verification artifact |

Gate rule: the QA gate (A14) passes only when coverage + RTM + the technology audit all pass; each R0–R5 review must
have zero unaddressed High/Critical; the evidence [INDEX](evidence/INDEX.md) must confirm all required artifacts exist.
