# Authentication Flow

- **Owner:** Architect (A1) · **Last updated:** YYYY-MM-DD · **Owning agent:** A5 · **Related ADRs:** <auth ADR if any>

## Signup + email verification
```mermaid
sequenceDiagram
  participant U as User
  participant API as Backend
  participant M as SMTP (relay1.dataart.com)
  U->>API: POST /auth/signup (email, password≥8)
  API->>API: trim+lowercase email (unique), hash pw (Argon2id)
  API->>API: create single-use token (expires +24h)
  API->>M: send verification email (token in URL)
  U->>API: GET /auth/verify?token=...
  API->>API: token valid & unused & not expired? → mark verified, consume token
  API-->>U: redirect to Login (no auto-login)
  Note over U,API: Resend issues a new token and INVALIDATES prior unused tokens
```

## Login / session
```mermaid
sequenceDiagram
  participant U as User
  participant API as Backend
  U->>API: POST /auth/login (email, password)
  API->>API: verify Argon2id hash + account is verified
  API-->>U: 200 + JWT bearer (returned in body/header, NEVER in URL)
  U->>API: business request with Authorization: Bearer <jwt>
  API->>API: requireAuth guard validates JWT
  U->>API: POST /auth/logout (invalidate client token/session)
```

## Rules (REQUIREMENTS §3, §9)
- Passwords ≥8 chars, Argon2id, never plaintext. Verification tokens: 24h, single-use, resend invalidates prior.
- Unverified accounts blocked from business endpoints. Public: signup, login, verify, resend, health, static.
- Tokens never in URLs (except the single-use verification token). Verified by R2 + R4.
