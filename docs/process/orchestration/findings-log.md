# Phase 3 — Review Findings Log (MO runtime state)

> MO-owned coordination state. Consolidates review-agent findings and routes each to its
> Implementation Owner (Author) per the four-role chain. Reviewers do not fix.
> Status legend: OPEN → ROUTED → FIXED → VERIFIED → CLOSED.

## Reviewer verdicts
| Reviewer | Verdict | High/Critical | Notes |
|---|---|---|---|
| R0 architecture | no Critical | 0 | 3 Medium, 4 Low |
| R1 contract | **CLEAR — zero drift** | 0 | 5 advisory (non-drift) |
| R2 security | **CHANGES REQUESTED** | 1 Critical + 2 must-fix groups | supply-chain |
| R4 red team | findings | 1 High | 3 Medium, 5 Low; many attacks DEFENDED |
| R5 code | no High/Critical | 0 | 1 Medium, 5 Low |
| A14 QA | *(running)* | — | RTM/coverage/tech-audit pending |

## GATE-3 blockers (High/Critical + rubric must-fix) — ALL CLOSED
Change-control: TDR v1→v2 (A1) + ADR-0010/TCR-001 (G1). Implementation: R-B1/R-B2.
| ID | Sev | Finding | Owner (Author) | Reviewer | Status |
|---|---|---|---|---|---|
| MF-1 | **CRITICAL** | `fast-jwt` GHSA-hm7r-c7qw-ghp6. **FIXED:** `@fastify/jwt` 9.1.0→10.1.0 → `fast-jwt` 6.2.4. `npm audit --omit=dev` = **0 vulns** (runtime gate). | A4 | R2 | **FIXED ✓ verified** |
| H1 | **HIGH** | Weak committed `JWT_SECRET`. **FIXED:** A4 fail-fast guard (reject empty/<32/`dev-only-change-me`) + A2 entrypoint auto-generates a strong ephemeral secret; `.env.example` emptied; compose `${JWT_SECRET:-}`. | A2 + A4 | R4 | **FIXED ✓** |
| MF-2 | High/Crit (dev) | dev-tooling vulns. **FIXED:** vite→6.4.3, vitest→4.1.10, lodash→4.18.1 override. Full `npm audit` now **6 moderate, 0 crit/0 high**. | A9/A4 + A1 | R2 | **FIXED ✓ verified** |
| MF-3 | must-fix | undeclared FE devDeps. **FIXED:** TDR v2 declares `@vitejs/plugin-react` 4.7.0, `@testing-library/react` 16.3.2, jsdom 29.1.1; TS pinned 5.6.3; `@dnd-kit/sortable` removed. | A9 + A1 | R2 | **FIXED ✓** |

## Spec-conformance defect — CLOSED
| ID | Sev | Finding | Owner | Reviewer | Status |
|---|---|---|---|---|---|
| R4-M1 | Medium (spec) | Ticket `title`/`body` not trimmed → §6 violation. **FIXED:** A7 `normalizeText` trims + rejects whitespace-only (400 VALIDATION_ERROR) on create+update. A14 adding regression test (R-C). | A7 | R4 | **FIXED ✓** |
| R4-M2 | Medium (TDR) | Runtime image bundled dev tooling. **FIXED:** A2 Dockerfile runtime stage `npm ci --omit=dev` + copies only dist + generated prisma client; `USER node`. | A2 | R4 | **FIXED ✓** |

## Deferred to owners (Medium/Low — non-blocking, tracked)
| ID | Sev | Finding | Owner | Reviewer |
|---|---|---|---|---|
| R0-1 | Medium | `db/index.ts` exports `getDb()`+`dbHealthcheck()` — the ADR-0002-rejected factory alt + dead code. | A3 | R0 |
| R0-2 | Medium | 6 near-duplicate error-envelope normalizers across FE features. | A9 (provide), A10–A13 (consume) | R0 |
| R0-3 | Medium | teams/epics lack a service layer (domain logic inline in plugin). | A6/A15 | R0 |
| R0-4 | Medium | duplicated STATE_LABELS/TYPE_LABELS (board & tickets). | A12/A13 | R0 |
| R0-5 | Low | tickets/TicketView imports comments CommentsPanel — outside ADR-0008 cross-feature set. | A13 | R0 |
| R0-6 | Low | auth/service.ts depends on Fastify logger type (DIP leak). | A5 | R0 |
| R0-7 | Low | duplicated formatTimestamp. | A13 | R0 |
| R5-M1 | Medium | concurrent in-flight drags — whole-list rollback can clobber a second card's optimistic move. | A12 | R5 |
| R5-L1 | Low | ticket mutations don't invalidate board cache; teams cached under 2 keys. | A7/A13/A12 | R5 |
| R5-L2 | Low | team/epic PATCH bumps modified_at on no-op (not a spec violation). | A6/A15 | R5 |
| R5-L3 | Low | updateTicket runs validateReferences on no-op saves. | A7 | R5 |
| R5-L4 | Low | VerifyEmailPage won't re-verify on in-place token change. | A11 | R5 |
| R5-L5 | Low | comment whitespace-check precedes existence-check (400 vs 404). | A8 | R5 |
| R4-M3 | Medium | no rate limiting on login/signup; signup 409 enumeration oracle. | A4/A5 | R4 |
| R4-L1..L5 | Low | no nginx security headers; containers run as root; error detail reflection; SMTP TLS; dep drift. | A2/A4/A5 | R4 |
| R1-adv | advisory | tickets returns raw Prisma rows; ISO output implicit via fast-json-stringify. Add integration assertion. | A7/A14 | R1 |
| dates | hygiene | ADRs/TDR carry YYYY-MM-DD placeholders. | A1/G1 | R0 |
