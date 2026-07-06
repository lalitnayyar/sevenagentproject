# ──────────────────────────────────────────────────────────────────────────────
# 7-Agent Price Intelligence Dashboard — Dockerfile
# Multi-stage build: Node build → Nginx serve
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

LABEL maintainer="Lalit Nayyar <lalitnayyar@gmail.com>"
LABEL description="7-Agent Price Intelligence Dashboard — React Frontend"
LABEL version="1.0.0"

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy package files first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build arguments for environment variables
ARG VITE_APP_TITLE="7-Agent Price Intelligence Dashboard"
ARG VITE_APP_ID="agent-dashboard"

# Build the React app
RUN pnpm run build

# ── Stage 2: Serve ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

LABEL maintainer="Lalit Nayyar <lalitnayyar@gmail.com>"

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist/public /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
