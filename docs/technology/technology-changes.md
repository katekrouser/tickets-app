# Technology Change Log

Running log of every Technology Change Request (TCR) against the frozen Technology Decision Record (TDR).
**Owned and maintained by the Project Historian (G1).** G1 logs every TCR — submitted, then Approved or Rejected by
the Master Orchestrator — here, and mirrors approved ones in the Decision Log + CHANGELOG. A1 owns the TDR itself +
the superseding ADR; A4/A9 update manifests. (The stack may only actually change after an APPROVED TCR.)

## How a technology change flows
1. Requesting agent submits a **TCR** to the Master Orchestrator (justification + impact).
2. Master Orchestrator (sole authority) **approves or rejects**. Implementation stays blocked until decided.
3. On approval: A1 writes a **superseding ADR**, increments the **TDR version**, and A4/A9 update the manifest.
4. This log gets a new row; G1 logs it in the Decision Log + CHANGELOG. Only then may the change be implemented.

## Change log
| TCR id | Date | Requesting agent | Change (from → to) | Category | Decision | Approved by | ADR | New TDR version |
|---|---|---|---|---|---|---|---|---|
| TCR-001 | 2026-07-07 | MO / R2 / R4 / A14 (Phase-3 quality gate) | Phase-3 dependency remediation & stack reconciliation: **`@fastify/jwt` 9.1.0 → 10.1.0** (→ `fast-jwt` 6.2.4; fixes CRITICAL GHSA-hm7r-c7qw-ghp6 on the sole runtime auth path); **`vite` 5.4.x → 6.4.3** (HIGH GHSA-fx2h-pf6j-xcff + esbuild moderate; satisfies Vitest 4 peer); **`vitest` → 4.1.10** unified BE+FE (resolves major split); **declare** `@vitejs/plugin-react` 4.7.0, `@testing-library/react` 16.3.2 (+`@testing-library/dom` 10.x), `jsdom` 29.1.1; **`typescript` single-pinned 5.6.3** (drift resolved); **`@dnd-kit/sortable` removed** (unused); **`lodash` → 4.18.1** via root `overrides` (HIGH GHSA-r5fr-rjxr-66jc, Prism build-only chain); **reaffirm** backend runtime image excludes dev/test tooling (R4-M2). | replace build tooling · replace authentication (version) · replace testing framework · install new dependency | **Approved** | Master Orchestrator | [ADR-0010](../architecture/decisions/0010-phase3-dependency-remediation-stack-reconciliation.md) | v1 → v2 |

<!--
Category (from TECHNOLOGY GOVERNANCE): install new dependency · replace library · introduce framework ·
change architecture · replace build tooling · replace testing framework · replace ORM · replace authentication ·
replace state management · replace UI library.
Rejected TCRs are logged too (Decision = Rejected, no ADR/TDR bump) for an auditable trail.
-->
