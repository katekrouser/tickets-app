# Database Overview

- **Owner:** Architect (A1) · **Last updated:** YYYY-MM-DD · **Owning agent:** A3 · **Source of truth:** `backend/prisma/schema.prisma`

## Entity-relationship
```mermaid
erDiagram
  USER ||--o{ VERIFICATION_TOKEN : has
  USER ||--o{ TICKET : "created_by"
  USER ||--o{ COMMENT : authors
  TEAM ||--o{ EPIC : contains
  TEAM ||--o{ TICKET : groups
  EPIC ||--o{ TICKET : "optionally referenced by"
  TICKET ||--o{ COMMENT : has

  USER { uuid id PK "email UNIQUE ci; password_hash; email_verified" }
  VERIFICATION_TOKEN { uuid id PK "token; expires_at; used_at; user_id FK" }
  TEAM { uuid id PK "name UNIQUE ci; created_at; modified_at" }
  EPIC { uuid id PK "team_id FK; title; description?; created_at; modified_at" }
  TICKET { uuid id PK "team_id FK; type; state; epic_id FK?; title; body; created_by FK; created_at; modified_at" }
  COMMENT { uuid id PK "ticket_id FK; author_id FK; body; created_at" }
```

## Constraints & integrity rules
| Rule | Mechanism |
|---|---|
| email & team name unique, case-insensitive | normalized column / citext + unique index |
| ticket.epic must be in ticket.team | server-side check (create + edit) → 400 |
| delete team with tickets/epics | FK RESTRICT → surfaced as 409 |
| delete epic referenced by tickets | FK RESTRICT → 409 |
| delete ticket | cascade delete its comments |
| enums (type, state) | DB/enum + server validation |
| timestamps | server-set UTC; modified_at only on real change |

## Migrations & seed policy
Automated via Prisma migrations on boot. Fresh DB = schema + migration metadata only; **no seed data**.
