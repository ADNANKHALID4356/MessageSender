# ===========================================
# Frontend Dockerfile — Next.js 14 (multi-stage)
# Uses Next.js standalone output for minimal image size.
# Set NEXT_BUILD_STANDALONE=true to activate standalone mode.
# ===========================================

# ── Stage 1: Install & build ──────────────────────────────
FROM node:25-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /app

# Copy workspace manifests for layer caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Build args passed at build time (public vars baked into bundle)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_FACEBOOK_APP_ID
ARG NEXT_PUBLIC_FACEBOOK_AUTH_APP_ID

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_FACEBOOK_APP_ID=$NEXT_PUBLIC_FACEBOOK_APP_ID
ENV NEXT_PUBLIC_FACEBOOK_AUTH_APP_ID=$NEXT_PUBLIC_FACEBOOK_AUTH_APP_ID

# Enable standalone output for minimal container
ENV NEXT_BUILD_STANDALONE=true

# Build the Next.js app
RUN pnpm --filter frontend build


# ── Stage 2: Production image ────────────────────────────
FROM node:25-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy standalone server bundle
COPY --from=builder /app/frontend/.next/standalone ./
# Copy static assets (standalone omits these by design)
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

CMD ["node", "frontend/server.js"]
