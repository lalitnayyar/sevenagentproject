# ──────────────────────────────────────────────────────────────────────────────
# 7-Agent Price Intelligence Dashboard — Dockerfile
# Multi-stage build: Node 22 (pnpm build) → Node 22 slim (run Express server)
#
# v2.0.0 — Architecture change from v1.0.x:
#   BEFORE: Node build → Nginx static serve
#     Problem: Nginx only served static files. All /api/trpc calls returned
#     Nginx's own HTML 404 page, causing "Unexpected token '<'" JSON parse
#     errors in the UI (Pushover notify, API key verification, etc.)
#   AFTER: Node build → Node Express+tRPC server
#     The Express server handles /api/trpc (tRPC), /api/oauth (auth),
#     /manus-storage (S3 proxy), AND serves the React SPA static files.
#     All API calls now work correctly in the container.
#
# Port: 3000 (was 80 with Nginx)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

LABEL maintainer="Lalit Nayyar <lalitnayyar@gmail.com>"
LABEL description="7-Agent Price Intelligence Dashboard — Build Stage"
LABEL version="2.0.0"

WORKDIR /app

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Layer cache: install deps first, then copy source
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# --no-frozen-lockfile: avoids ERR_PNPM_OUTDATED_LOCKFILE when pnpm version
# differs between sandbox and builder image
RUN pnpm install --no-frozen-lockfile

# Copy full source tree
COPY . .

# Build-time env vars for Vite
ARG VITE_APP_TITLE="7-Agent Price Intelligence Dashboard"
ARG VITE_APP_ID="agent-dashboard"
ARG VITE_ANALYTICS_ENDPOINT=""
ARG VITE_ANALYTICS_WEBSITE_ID=""

# Build:
#   1. vite build  → dist/public/  (React SPA)
#   2. esbuild     → dist/index.js (Express+tRPC server bundle)
RUN pnpm run build

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM node:22-alpine AS production

LABEL maintainer="Lalit Nayyar <lalitnayyar@gmail.com>"
LABEL description="7-Agent Price Intelligence Dashboard — Runtime"
LABEL version="2.0.0"

WORKDIR /app

# Install only production-critical native deps (mysql2 needs none extra on alpine)
# Install pnpm for potential runtime scripts
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy package.json for module resolution metadata
COPY package.json ./

# Copy only the built output from builder stage:
#   dist/index.js       — Express+tRPC server
#   dist/public/        — React SPA static files
COPY --from=builder /app/dist ./dist

# Copy node_modules (needed at runtime for packages=external esbuild bundles)
# Only production deps are needed but copying all is simpler and still fast
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

# Express server listens on PORT env var (default 3000)
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check: Express serves index.html at /
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/ | grep -q "<!doctype html" || exit 1

CMD ["node", "dist/index.js"]
