# Backend image — build context is the REPO ROOT (npm-workspaces monorepo).
# Build:  docker build -f backend/Dockerfile -t tickets-backend .

# ---- build stage ----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (better layer caching). npm workspaces requires EVERY
# workspace's package.json to be present before `npm ci` so the lockfile
# validates against the full workspace tree — copy all three manifests.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

# Bring in sources (backend/prisma/schema.prisma is now present).
COPY packages/shared ./packages/shared
COPY backend ./backend

# Generate the Prisma client BEFORE the TS build (backend imports @prisma/client).
RUN npm exec -w backend -- prisma generate

# Build @app/shared (if it has a build) then compile the backend.
RUN npm run build --workspace @app/shared --if-present \
 && npm run build --workspace backend

# ---- runtime stage --------------------------------------------------------
# R4-M2 / TDR §1: the runtime image must NOT ship dev/test/build tooling
# (tsx, tsc-alias, js-yaml, vitest, supertest, typescript). Install prod-only
# deps here and copy just the compiled artifacts from the build stage.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prod-only deps. npm workspaces requires EVERY workspace's package.json before
# `npm ci` so the lockfile validates against the full workspace tree.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev

# Prisma: the schema (for `prisma migrate deploy` at boot — the `prisma` CLI is
# now a prod dep) + the client generated in the build stage (@prisma/client is a
# prod dep installed above; the generated client lives in node_modules/.prisma).
COPY backend/prisma ./backend/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Compiled output only — no TS sources, no toolchain.
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/backend/dist ./backend/dist

# Entrypoint runs `npm run migrate` (once DB is healthy) then starts the server
# (`node dist/server.js`).
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh

# Give the non-root `node` user ownership of the app tree so it can write to
# node_modules/@prisma/engines (prisma migrate deploy) — root-owned otherwise.
RUN chown -R node:node /app

# R4-L2: drop root privileges — run as the built-in non-root `node` user.
USER node

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/backend-entrypoint.sh"]
