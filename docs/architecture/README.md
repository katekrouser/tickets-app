# Architecture Documentation

Authored and kept current by the **Architect (A1)**. These are design documents (no application code). They are a
Definition-of-Done input: when an ADR changes an architectural decision, the affected doc(s) below MUST be updated.

| Doc | Purpose |
|---|---|
| [high-level-solution.md](high-level-solution.md) | Business context, goals, scope, solution overview |
| [system-architecture.md](system-architecture.md) | Logical tiers, modules, boundaries, cross-cutting concerns |
| [deployment-architecture.md](deployment-architecture.md) | Containers, networking, config, runtime topology |
| [component-diagram.md](component-diagram.md) | Components and their relationships |
| [data-flow.md](data-flow.md) | How data moves through the system for key flows |
| [authentication-flow.md](authentication-flow.md) | Signup, verification, login, session/token lifecycle |
| [database-overview.md](database-overview.md) | Entities, relationships, constraints, integrity rules |
| [api-overview.md](api-overview.md) | Endpoint surface, conventions, status codes, errors |
| [TDR.md](../technology/TDR.md) | Authoritative, frozen-on-approval stack registry (Technology Decision Record) |
| stack-compatibility-report.md *(runtime output — produced by A1 before TDR freeze)* | Stack review: compatibility/licensing/maintenance/perf/security risks + simplifications (prerequisite to freezing the TDR) |
| [technology-changes.md](../technology/technology-changes.md) | Running log of approved Technology Change Requests (post-freeze stack changes) |

> Diagrams use Mermaid so they render in most viewers and stay diff-able. Keep them in sync with
> `contracts/openapi.yaml` and `backend/prisma/schema.prisma`.
