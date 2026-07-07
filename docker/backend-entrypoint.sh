#!/bin/sh
# Backend container entrypoint (A2). The DB is already healthy (compose
# depends_on: service_healthy). Apply migrations, THEN start the server.
# Migration + start scripts are owned by A4 (migrations authored by A3).
set -e

# R4-H1: never boot with the weak committed placeholder. A4's config fails fast
# if JWT_SECRET is empty, < 32 chars, or equals "dev-only-change-me". To keep
# `docker compose up` zero-config for local dev, mint a strong ephemeral secret
# when none was supplied. Production MUST set a stable strong JWT_SECRET.
secret_len=$(printf %s "${JWT_SECRET:-}" | wc -c)
if [ -z "${JWT_SECRET:-}" ] || [ "$secret_len" -lt 32 ] || [ "$JWT_SECRET" = "dev-only-change-me" ]; then
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  export JWT_SECRET
  echo "[entrypoint] No strong JWT_SECRET set; generated an ephemeral dev secret (tokens reset on restart; set a stable strong JWT_SECRET in production)."
fi

echo "[entrypoint] Applying database migrations (npm run migrate)..."
npm run migrate

echo "[entrypoint] Starting backend server (npm run start)..."
exec npm run start
