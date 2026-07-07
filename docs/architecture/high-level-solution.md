# High-Level Solution

- **Owner:** Architect (A1) · **Status:** Draft/Approved · **Last updated:** YYYY-MM-DD · **Related ADRs:** ADR-0001

## 1. Business context & problem
<Why this system exists. Reference REQUIREMENTS §1 Objective.>

## 2. Goals & non-goals
- **Goals:** Kanban ticket tracking by team; epics; comments; auth with email verification; drag-and-drop board.
- **Non-goals (out of scope):** <mirror REQUIREMENTS §12 — Scrum, SSO, roles/membership, attachments, realtime, …>

## 3. Solution overview
<2–4 paragraphs: three-tier SPA + HTTP API + PostgreSQL, contract-first, containerized via Docker Compose.>

## 4. Key users & primary flows
- Registered user: sign up → verify email → log in → manage teams/epics/tickets/comments → use the board.

## 5. Quality attributes (non-functional)
| Attribute | Target | Source |
|---|---|---|
| Security | Argon2id, authed endpoints, no secrets in VCS | REQUIREMENTS §11 |
| Reliability | No data loss on refresh/restart | §11 |
| Usability | Loading/empty/success/error states | §11 |
| Performance | Board usable at ≥100 tickets | §8 |
| Portability | `docker compose up --build` on clean Win/macOS/Linux | §2 |

## 6. Constraints & assumptions
<Docker-only runtime; unrestricted languages (chosen stack per ADR-0001); SMTP relay1.dataart.com.>

## 7. Risks (link Risk Register / Tech Debt)
<Top solution-level risks and mitigations.>
