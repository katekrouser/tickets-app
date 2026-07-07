# Decision Log

Lightweight running log of ALL notable decisions (technical, process, scope). Architecture-significant decisions
also get a full ADR — link it here. Maintained by the **Project Historian (G1)**.

| ID | Date | Decision | Type | Made by | Rationale (short) | ADR | Status |
|---|---|---|---|---|---|---|---|
| DEC-001 | YYYY-MM-DD | Contract-first OpenAPI as the BE↔FE seam | Technical | Master Orch / A1 | Enables parallel BE+FE tracks | — | Active |
| DEC-002 | YYYY-MM-DD | Stack selection | Technical | Master Orch / A1 | See ADR | [ADR-0001](../architecture/decisions/0001-example-stack-selection.md) | Active (dependency pins superseded by DEC-003) |
| DEC-003 | 2026-07-07 | Phase-3 dependency remediation & stack reconciliation → TDR v2 (TCR-001): `@fastify/jwt` 9.1.0→10.1.0 fixing CRITICAL fast-jwt CVE on the runtime auth path; Vite 5→6.4.3; Vitest unified 4.1.10; TypeScript pinned 5.6.3; declare TL-react/plugin-react/jsdom; remove `@dnd-kit/sortable`; lodash 4.18.1 via override | Technical / Tooling | Master Orch (Change Control) / A1 · G1-logged | Remediate CRITICAL runtime JWT CVE + High/Critical dev advisories; make manifests ⇄ TDR truthful (R2 MF-1/2/3, R4 M2/L5, A14 F1–F6) | [ADR-0010](../architecture/decisions/0010-phase3-dependency-remediation-stack-reconciliation.md) | Active |

<!-- Type: Technical | Process | Scope | Tooling.  Status: Active | Reversed | Superseded (link the superseding id). -->
