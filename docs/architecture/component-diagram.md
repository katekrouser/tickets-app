# Component Diagram

- **Owner:** Architect (A1) · **Last updated:** YYYY-MM-DD

```mermaid
flowchart TB
  subgraph FE [Frontend SPA]
    Shell[App shell + router + auth context]
    Comp[Design system + loading/empty/error]
    Client[Typed API client]
    FAuth[feature: auth]
    FTeams[feature: teams/epics]
    FBoard[feature: board + DnD]
    FTicket[feature: ticket-detail + comments]
    FAuth & FTeams & FBoard & FTicket --> Shell
    FAuth & FTeams & FBoard & FTicket --> Comp
    FAuth & FTeams & FBoard & FTicket --> Client
  end
  subgraph BE [Backend API]
    App[app bootstrap + plugins]
    Guard[requireAuth guard]
    MAuth[module: auth] --> Mailer[mailer]
    MTeams[module: teams]
    MEpics[module: epics]
    MTickets[module: tickets]
    MComments[module: comments]
    App --> MAuth & MTeams & MEpics & MTickets & MComments
    Guard -.-> MTeams & MEpics & MTickets & MComments
  end
  DBClient[Prisma client] --> DB[(PostgreSQL)]
  MAuth & MTeams & MEpics & MTickets & MComments --> DBClient
  Client -->|OpenAPI| App
```

## Component responsibilities
Summarize each component in one line and link its owning agent. Keep this diagram consistent with
`system-architecture.md` and the ownership map in `docs/agents/README.md`.
