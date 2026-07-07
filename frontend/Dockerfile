# Frontend image — build context is the REPO ROOT (npm-workspaces monorepo).
# nginx serves the compiled Vite SPA and reverse-proxies /api → backend:3000.
# Build:  docker build -f frontend/Dockerfile -t tickets-frontend .

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

# Bring in sources and build @app/shared then the frontend bundle.
COPY packages/shared ./packages/shared
COPY frontend ./frontend
RUN npm run build --workspace @app/shared --if-present \
 && npm run build --workspace frontend

# ---- runtime stage (static assets served by nginx) -----------------------
FROM nginx:stable-alpine AS runtime

# ADR-0009 transport contract: SPA fallback + /api proxy to backend:3000.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Compiled SPA assets.
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
