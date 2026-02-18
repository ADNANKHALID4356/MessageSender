# ===========================================
# Backend Dockerfile — NestJS (multi-stage)
# Stage 1: Install & build
# Stage 2: Production-only image (no devDeps, no source)
# ===========================================

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:25-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy package.json files for each workspace package
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install ALL dependencies (including devDeps for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/

# Generate Prisma client
RUN pnpm --filter backend prisma:generate

# Build backend (outputs to backend/dist/)
RUN pnpm --filter backend build

# Prune dev dependencies — keep only production deps
RUN pnpm --filter backend --prod deploy /app/backend-prod


# ── Stage 2: Production image ───────────────────────────────
FROM node:25-alpine AS production

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy pruned production dependencies
COPY --from=builder /app/backend-prod/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/backend/dist ./dist

# Copy Prisma schema & generated client (needed at runtime)
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend-prod/node_modules/.prisma ./node_modules/.prisma

# Ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

# Production start — runs Prisma migrations then starts the server
CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node dist/backend/src/main"]
