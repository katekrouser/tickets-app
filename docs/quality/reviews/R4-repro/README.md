# R4 Red-Team reproduction scripts (non-production)

Ephemeral probe scripts only — NOT production code, NOT tests owned by build agents.
They exist to reproduce the findings in `../R4-redteam.md`.

No live Docker was available during this review, so most scripts are written to run
**against the live stack** (`docker compose up --build`) and are marked accordingly.
Static/spec-level findings needed no runtime.

## Files
- `attack-suite.sh` — curl-driven attack battery (auth, authz, malformed, boundary,
  SQLi/XSS payload injection, referential integrity, error-body conformance).
  Requires the stack up on `http://localhost:8080`. **Execute against the live stack (CI/Docker).**
- `jwt-forge.mjs` — forges `alg=none`, tampered-signature, and expired tokens and asserts
  the API rejects them (401). **Execute against the live stack (CI/Docker).**

## Usage (live stack)
```
docker compose up --build -d
BASE=http://localhost:8080./docs/quality/reviews/R4-repro/attack-suite.sh
node docs/quality/reviews/R4-repro/jwt-forge.mjs http://localhost:8080 "$JWT_SECRET"
```
