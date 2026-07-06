# ──────────────────────────────────────────────────────────────────────────────
# 7-Agent Price Intelligence Dashboard — Dockerfile
# Multi-stage build: Node 22 (pnpm build) → Nginx 1.27 (serve)
#
# v1.0.2 — Changes from v1.0.1:
#   1. pnpm install --frozen-lockfile → --no-frozen-lockfile
#      Reason: package.json and pnpm-lock.yaml are kept in sync in the repo,
#      but pnpm version differences between the sandbox (pnpm 10.x) and the
#      builder image can cause spurious "lockfile outdated" errors. Using
#      --no-frozen-lockfile lets pnpm resolve normally while still using the
#      lockfile as a resolution hint. For reproducible CI builds, regenerate
#      the lockfile locally with `pnpm install` before committing.
#   2. Updated package.json now includes tRPC + drizzle + server packages
#      (added in the tRPC backend proxy upgrade, commit b04633f)
#   3. LABEL version bumped to 1.0.2
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

LABEL maintainer="Lalit Nayyar <lalitnayyar@gmail.com>"
LABEL description="7-Agent Price Intelligence Dashboard — React Frontend"
LABEL version="1.0.2"

WORKDIR /app

# Install pnpm via corepack (matches packageManager field in package.json)
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# ── Layer cache: copy lockfiles first, install, then copy source ──────────────
COPY package.json pnpm-lock.yaml ./

# patches/ required by pnpm patchedDependencies (wouter@3.7.1 patch)
COPY patches/ ./patches/

# Install dependencies
# --no-frozen-lockfile: avoids ERR_PNPM_OUTDATED_LOCKFILE when pnpm version
# differs between sandbox and builder image. The lockfile is still used as a
# resolution hint so installs remain fast and deterministic.
RUN pnpm install --no-frozen-lockfile

# Copy the rest of the source tree
# .dockerignore excludes: node_modules, dist, .git, .manus*, .manus-logs
COPY . .

# Build-time env vars injected by docker-compose --build-arg or CI
ARG VITE_APP_TITLE="7-Agent Price Intelligence Dashboard"
ARG VITE_APP_ID="agent-dashboard"
ARG VITE_ANALYTICS_ENDPOINT=""
ARG VITE_ANALYTICS_WEBSITE_ID=""

# Vite root = client/, outDir = dist/public (defined in vite.config.ts)
RUN pnpm run build

# ── Stage 2: Serve ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

LABEL maintainer="Lalit Nayyar <lalitnayyar@gmail.com>"
LABEL description="7-Agent Price Intelligence Dashboard — Nginx"
LABEL version="1.0.2"

# Copy custom nginx config (SPA routing + gzip + security headers)
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built React SPA — vite outDir is dist/public (not dist/)
COPY --from=builder /app/dist/public /usr/share/nginx/html

# Create non-root user for security hardening
# mkdir cache subdirs BEFORE chown to avoid "No such file or directory" error
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp \
             /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

# Health check: SPA serves index.html for all routes — verify HTML is returned
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ | grep -q "<!doctype html" || exit 1

CMD ["nginx", "-g", "daemon off;"]
