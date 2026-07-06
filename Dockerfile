# ──────────────────────────────────────────────────────────────────────────────
# 7-Agent Price Intelligence Dashboard — Dockerfile
# Multi-stage build: Node 22 (pnpm build) → Nginx 1.27 (serve)
#
# FIX v1.0.1 — Changes from v1.0.0:
#   1. Added .dockerignore (node_modules/dist excluded from build context)
#   2. ARG expanded: VITE_ANALYTICS_ENDPOINT + VITE_ANALYTICS_WEBSITE_ID added
#   3. Nginx mkdir for cache subdirs before chown (prevents permission error)
#   4. HEALTHCHECK: /health → / with html grep (SPA has no /health route)
#   5. start-period: 5s → 10s (gives Nginx more time to start)
#   6. LABEL version bumped to 1.0.1
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

LABEL maintainer="Lalit Nayyar <lalitnayyar@gmail.com>"
LABEL description="7-Agent Price Intelligence Dashboard — React Frontend"
LABEL version="1.0.1"

WORKDIR /app

# Install pnpm via corepack (matches packageManager field in package.json)
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# ── Layer cache: copy lockfiles first, install, then copy source ──────────────
# package.json and pnpm-lock.yaml are at project root (same dir as Dockerfile)
COPY package.json pnpm-lock.yaml ./

# patches/ required by pnpm patchedDependencies (wouter@3.7.1 patch)
COPY patches/ ./patches/

# Install all dependencies (frozen for reproducible builds)
RUN pnpm install --frozen-lockfile

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
LABEL version="1.0.1"

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
