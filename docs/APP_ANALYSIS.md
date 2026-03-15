# 📊 MessageSender — Deep & Comprehensive Application Analysis

> **Version:** 1.0.0 | **Status:** Production Ready ✅  
> **Last Updated:** March 2026

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Full Directory Structure](#2-full-directory-structure)
3. [Tech Stack](#3-tech-stack)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend–Backend Communication](#6-frontendbackend-communication)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Environment Variables & Configuration](#8-environment-variables--configuration)
9. [Docker & Deployment Setup](#9-docker--deployment-setup)
10. [Package Scripts](#10-package-scripts)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Shared Package](#12-shared-package)
13. [Database Models & Schema](#13-database-models--schema)
14. [Notable Features](#14-notable-features)
15. [Security Architecture](#15-security-architecture)
16. [Real-time Features](#16-real-time-features)
17. [Performance Architecture](#17-performance-architecture)
18. [Summary & Readiness Assessment](#18-summary--readiness-assessment)

---

## 1. Application Overview

**MessageSender** is a **production-ready Facebook Page Messaging & Management Platform** designed for businesses to manage and automate messaging across multiple Facebook Pages.

### What It Does

| Capability | Description |
|------------|-------------|
| **Multi-Workspace Management** | Up to 5 isolated business workspaces per instance |
| **Facebook Integration** | OAuth 2.0 login, multi-page management, Graph API v18.0 |
| **24-Hour Bypass System** | OTN tokens, recurring notifications, message tags — extends messaging beyond the 24-hour window |
| **Bulk Messaging & Campaigns** | Rate-limited mass messaging with progress tracking |
| **Campaign Types** | One-time, scheduled, recurring, drip sequences, trigger-based |
| **A/B Testing** | Test message variants, auto-select winner by delivery/clicks/responses |
| **Unified Inbox** | Real-time conversations across all connected pages |
| **Analytics & Reporting** | Comprehensive metrics: engagement, delivery, campaign performance |
| **Team Management** | Role-based access control (VIEW_ONLY, OPERATOR, MANAGER) |
| **Compliance Tracking** | Facebook messaging policy audit trail |
| **Segmentation** | Dynamic (rule-based) and static contact groups |
| **Custom Fields** | Per-workspace contact enrichment fields |
| **Sponsored Messaging** | Paid messages outside the 24-hour window |

### Who It's For

- Digital marketing agencies managing multiple Facebook Pages
- E-commerce businesses sending order updates & promotions
- Customer support teams managing Facebook Messenger conversations
- Content creators and community managers with large follower bases

---

## 2. Full Directory Structure

```
MessageSender/                              # Monorepo root
│
├── .github/
│   ├── dependabot.yml                      # Automated dependency updates
│   └── workflows/
│       └── ci-cd.yml                       # Full CI/CD pipeline
│
├── backend/                                # NestJS 10 — Port 4000
│   ├── src/
│   │   ├── main.ts                         # App bootstrap (Sentry, Swagger, security)
│   │   ├── app.module.ts                   # Root module
│   │   ├── config/                         # Joi-based env validation
│   │   ├── common/                         # Shared utilities (encryption, exception filter, shutdown)
│   │   ├── prisma/                         # Prisma module & service
│   │   ├── redis/                          # Redis module & service
│   │   └── modules/
│   │       ├── auth/                       # JWT auth, sessions, password management
│   │       ├── admin/                      # Admin dashboard, settings, reports, backups
│   │       ├── users/                      # User management
│   │       ├── workspaces/                 # Workspace CRUD & user access
│   │       ├── facebook/                   # OAuth flow, token management
│   │       ├── pages/                      # Facebook page management
│   │       ├── contacts/                   # Contact CRUD, tags, custom fields
│   │       ├── messages/                   # Send API, OTN, recurring notifications
│   │       ├── conversations/              # Inbox, real-time messaging
│   │       ├── campaigns/                  # CRUD, drip campaigns, A/B testing
│   │       ├── segments/                   # Dynamic/static segments
│   │       ├── webhooks/                   # Facebook webhook receiver
│   │       ├── analytics/                  # Metrics & reporting
│   │       ├── security/                   # Rate limiting, input validation
│   │       └── health/                     # Health check endpoints
│   │
│   ├── prisma/
│   │   ├── schema.prisma                   # 921-line full data model
│   │   ├── migrations/                     # Auto-generated DB migrations
│   │   └── seed.ts                         # Initial data seeding
│   │
│   ├── test/                               # E2E and unit tests
│   ├── Dockerfile                          # Multi-stage production Docker build
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                               # Next.js 14 — Port 3000
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                  # Root layout with providers
│   │   │   ├── page.tsx                    # Landing/home page
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── admin/signup/page.tsx       # First-time admin bootstrap
│   │   │   └── (dashboard)/               # Protected route group
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       ├── campaigns/page.tsx
│   │   │       ├── campaigns/create/page.tsx
│   │   │       ├── compliance/page.tsx
│   │   │       ├── contacts/page.tsx
│   │   │       ├── contacts/[contactId]/page.tsx
│   │   │       ├── inbox/page.tsx
│   │   │       ├── pages/page.tsx
│   │   │       ├── reports/page.tsx
│   │   │       ├── segments/page.tsx
│   │   │       ├── send-message/page.tsx
│   │   │       ├── settings/page.tsx
│   │   │       ├── tags/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       ├── templates/page.tsx
│   │   │       ├── workspaces/page.tsx
│   │   │       └── health/page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── auth/                       # Auth guard, login forms
│   │   │   └── skeletons/                  # Page loading skeletons
│   │   │
│   │   ├── hooks/                          # 18 custom React hooks
│   │   ├── stores/                         # Zustand stores (auth, workspace)
│   │   ├── lib/                            # API client (axios), utilities
│   │   └── types/                          # TypeScript type definitions
│   │
│   ├── Dockerfile                          # Multi-stage Next.js build
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── shared/                                 # Shared types & constants (monorepo)
│   ├── src/
│   │   ├── types/index.ts
│   │   ├── constants/index.ts
│   │   └── index.ts
│   └── package.json
│
├── docs/                                   # All documentation
│   ├── APP_ANALYSIS.md                     # This document
│   ├── VPS_DEPLOYMENT.md                   # VPS deployment guide
│   ├── DEPLOYMENT.md                       # General deployment guide
│   ├── DEPLOYMENT_SUMMARY.md               # Deployment readiness summary
│   ├── PRODUCTION_CHECKLIST.md             # Pre-deployment checklist
│   ├── SRS_Document.md                     # Software Requirements Specification
│   ├── Development_Plan.md                 # Phase-wise roadmap
│   ├── Tech_Stack_And_Guidelines.md        # Technical reference
│   ├── nginx.conf                          # Production Nginx template
│   └── ...
│
├── scripts/
│   ├── validate-production.js              # Production validation
│   └── check_ports.js                      # Port checker
│
├── docker-compose.yml                      # Dev: PostgreSQL, Redis, pgAdmin, Redis Commander
├── docker-compose.prod.yml                 # Prod: locked-down, resource-limited
├── .env.example                            # Development env template
├── .env.prod.example                       # Production env template
├── pnpm-workspace.yaml                     # Monorepo configuration
├── package.json                            # Root scripts
├── vercel.json                             # Vercel deployment config
└── .github/workflows/ci-cd.yml             # Full CI/CD pipeline
```

---

## 3. Tech Stack

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | **NestJS** | 10.3.0 |
| Language | **TypeScript** | 5.3.3 |
| Database | **PostgreSQL** | 15.x |
| ORM | **Prisma** | 5.8.0 |
| Cache / Queue | **Redis** | 7.x |
| Job Queue | **BullMQ** | 5.1.1 |
| Real-time | **Socket.io** | 4.6.1 |
| Authentication | **Passport.js + JWT** | — |
| Password Hashing | **bcrypt** | 5.1.1 (cost 12) |
| Encryption | **AES-256-GCM** (Node crypto) | native |
| HTTP Client | **axios** | 1.6.5 |
| Validation | **class-validator + Joi** | — |
| Error Tracking | **Sentry** | 10.38.0 |
| Security Headers | **Helmet.js** | 7.1.0 |
| Monitoring | **@nestjs/terminus** | 11.0.0 |
| Rate Limiting | **@nestjs/throttler** | 5.1.1 |
| Scheduling | **@nestjs/schedule** | 4.0.0 |
| API Docs | **Swagger/OpenAPI** | 7.2.0 |
| PDF Export | **PDFKit** | 0.17.2 |

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | **Next.js** | 14.1.0 (App Router) |
| Language | **TypeScript** | 5.3.3 |
| UI Library | **React** | 18.2.0 |
| UI Components | **shadcn/ui + Radix UI** | — |
| Styling | **Tailwind CSS** | 3.4.1 |
| State Management | **Zustand** | 4.4.7 |
| Data Fetching | **TanStack Query** | 5.17.9 |
| HTTP Client | **axios** | 1.6.5 |
| Real-time | **Socket.io Client** | 4.6.1 |
| Forms | **React Hook Form + Zod** | — |
| Charts | **Recharts** | 2.10.3 |
| Date/Time | **date-fns** | 3.2.0 |
| Icons | **Lucide React** | 0.311.0 |
| Dark Mode | **next-themes** | 0.2.1 |
| Testing | **Jest + Testing Library** | — |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Container Runtime | Docker & Docker Compose |
| Package Manager | pnpm 8.x (workspaces) |
| CI/CD | GitHub Actions |
| Reverse Proxy | Nginx (template provided) |
| Deployment Targets | VPS, Docker Compose, Vercel (frontend) |

---

## 4. Frontend Architecture

### Routes

**Public Routes:**
| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login` | User + admin login |
| `/signup` | User registration (pending approval) |
| `/forgot-password` | Password reset |
| `/admin/signup` | First admin bootstrap (blocked once an admin exists) |

**Protected Dashboard Routes** (requires auth via `AuthGuard`):
| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview metrics |
| `/analytics` | Engagement analytics |
| `/campaigns` | Campaign list |
| `/campaigns/create` | Campaign builder |
| `/compliance` | Message-tag audit trail |
| `/contacts` | Contact list |
| `/contacts/[contactId]` | Contact detail + history |
| `/inbox` | Real-time conversation inbox |
| `/pages` | Facebook page management |
| `/reports` | Reporting dashboard |
| `/segments` | Segment builder |
| `/send-message` | Direct message sender |
| `/settings` | Workspace settings |
| `/tags` | Tag management |
| `/team` | Team members & permissions |
| `/templates` | Message template library |
| `/workspaces` | Workspace switcher |
| `/health` | System health monitor |

### State Management

```
┌─────────────────────────────────────────────────────┐
│                  Zustand Stores                     │
│                                                     │
│  auth-store.ts                                      │
│    • currentUser (admin or user)                    │
│    • accessToken / refreshToken                     │
│    • active sessions list                           │
│    • login / logout / refreshToken actions          │
│                                                     │
│  workspace-store.ts                                 │
│    • selectedWorkspace                              │
│    • accessibleWorkspaces list                      │
│    • switchWorkspace action                         │
└─────────────────────────────────────────────────────┘
              ↕ (read/write)
┌─────────────────────────────────────────────────────┐
│             TanStack Query (server state)           │
│                                                     │
│  Custom Hooks (18 total):                           │
│  useAuth, useWorkspace, useContacts, useCampaigns,  │
│  usePages, useSegments, useConversations,           │
│  useAnalytics, useTemplates, useTags, useBypass,    │
│  useSponsored, useWindowStatus, useCustomFields,    │
│  useAdmin, useToast                                 │
└─────────────────────────────────────────────────────┘
              ↕ (HTTP + WebSocket)
┌─────────────────────────────────────────────────────┐
│                   api-client.ts                     │
│  • Axios instance                                   │
│  • Auto-inject Authorization: Bearer {token}        │
│  • Auto-inject X-Workspace-Id header                │
│  • 401 → refresh token → retry                      │
│  • Global error → toast notifications               │
└─────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/layout.tsx
  └── Providers (QueryClient, ThemeProvider, Toaster)
      └── AuthGuard
          └── (dashboard)/layout.tsx
              ├── Sidebar navigation
              ├── Workspace switcher
              └── [page content]
                  ├── Skeleton (loading state)
                  ├── Error boundary
                  └── Feature UI
```

---

## 5. Backend Architecture

### API Endpoint Summary

The backend exposes **100+ REST endpoints** under `/api/v1` grouped as:

| Group | Prefix | Count |
|-------|--------|-------|
| Auth | `/auth` | 20+ endpoints |
| Admin | `/admin` | 20+ endpoints |
| Workspaces | `/workspaces` | 8 endpoints |
| Facebook OAuth | `/facebook` | 6 endpoints |
| Pages | `/pages` | 9 endpoints |
| Contacts | `/contacts` | 15+ endpoints |
| Messages | `/messages` | 30+ endpoints |
| Campaigns | `/campaigns` | 15 endpoints |
| Conversations | `/conversations` | 11 endpoints |
| Segments | `/segments` | 8 endpoints |
| Analytics | `/workspaces/:id/analytics` | 6 endpoints |
| Webhooks | `/webhooks/facebook` | 2 endpoints (public) |
| Health | `/health` | 2 endpoints (public) |

### Module Dependency Graph

```
AppModule
├── ConfigModule (Joi validation)
├── PrismaModule
├── RedisModule
├── AuthModule
│   ├── UsersModule
│   └── WorkspacesModule
├── AdminModule
├── FacebookModule
├── PagesModule
├── ContactsModule
├── MessagesModule
│   ├── SendApiService (Facebook Graph API)
│   ├── MessageQueueService (BullMQ)
│   ├── MessageWorkerService
│   ├── OtnService
│   ├── RecurringNotificationService
│   ├── ComplianceService
│   ├── SponsoredMessageService
│   └── TemplatesService
├── CampaignsModule
│   ├── DripCampaignService
│   ├── AbTestingService
│   └── TriggerCampaignService
├── ConversationsModule
├── SegmentsModule
├── AnalyticsModule
├── WebhooksModule
├── SecurityModule
└── HealthModule
```

### Key Services

**MessagesModule** (most complex):
- `messages.service.ts` — Message CRUD and retrieval
- `send-api.service.ts` — Facebook Graph API calls
- `message-queue.service.ts` — BullMQ job enqueueing
- `message-worker.service.ts` — Async job processing
- `otn.service.ts` — One-Time Notification token lifecycle
- `recurring-notification.service.ts` — Subscription management
- `compliance.service.ts` — 24-hour window checks + tag validation
- `sponsored-message.service.ts` — Paid message campaigns
- `templates.service.ts` — Templates + canned responses
- `rate-limit.service.ts` — Per-page/contact send throttling

**24-Hour Bypass Methods (in compliance order):**

| Method | Use Case |
|--------|---------|
| `WITHIN_WINDOW` | User sent a message in last 24 hours |
| `OTN_TOKEN` | One-Time Notification: user opted in |
| `RECURRING_NOTIFICATION` | User subscribed to daily/weekly/monthly |
| `CONFIRMED_EVENT_UPDATE` | Event reminder tag |
| `POST_PURCHASE_UPDATE` | Order status tag |
| `ACCOUNT_UPDATE` | Account-related tag |
| `HUMAN_AGENT` | 7-day window for human support |
| `SPONSORED_MESSAGE` | Paid ad message |

---

## 6. Frontend–Backend Communication

### HTTP Flow

```
Browser (Next.js)
       │
       ▼ axios + interceptors
   api-client.ts
       │ Headers:
       │   Authorization: Bearer <accessToken>
       │   X-Workspace-Id: <workspaceId>
       │   Content-Type: application/json
       │
       ▼ HTTPS
  NestJS Backend
       │
       ▼ Guards
   JwtAuthGuard → RolesGuard → WorkspaceGuard
       │
       ▼
  Controller → Service → Prisma → PostgreSQL
                            └──── Redis
                            └──── BullMQ → Worker
       │
       ▼ Response
  JSON payload or Error (standardized format)
       │
       ▼
  TanStack Query (cache + UI update)
```

### WebSocket Flow (Socket.io)

```
Frontend connects to ws://api-host:4000
       │
       ▼ Join room
   workspace:{workspaceId}
       │
  Listens for events:
  • conversation:new-message
  • conversation:status-change
  • campaign:progress
  • page:sync-complete
       │
  Backend emits via Gateway
  (NestJS @WebSocketGateway)
```

### Data Flow: Sending a Message

```
1. Frontend form → React Hook Form + Zod validation
2. POST /api/v1/messages
3. Backend: ComplianceService checks 24-hour window
4. MessageQueueService enqueues BullMQ job
5. Returns 202 Accepted immediately
6. MessageWorkerService (async) processes job
7. SendApiService calls Facebook Graph API
8. Updates message status in DB
9. Socket.io emits "message:sent" to workspace room
10. Frontend updates conversation in real time
```

### Data Flow: Campaign Execution

```
1. User creates campaign → POST /api/v1/campaigns
2. User starts campaign → POST /api/v1/campaigns/:id/start
3. Backend resolves audience (segment / page / manual)
4. Creates BullMQ job per contact
5. Workers send messages (rate-limited: burst + delay)
6. CampaignLog updated per contact (sent/failed/delivered)
7. Socket.io emits campaign:progress updates
8. Frontend shows progress bar and stats
```

---

## 7. Authentication & Authorization

### User Types

| Type | Role | Capabilities |
|------|------|-------------|
| **Admin** | Platform admin | Manage users, approve signups, configure system, all workspaces |
| **User** | Workspace member | Access assigned workspaces with a permission level |

### Permission Levels (Users)

| Level | Read | Send Messages | Create Campaigns | Delete / Admin |
|-------|------|--------------|-----------------|----------------|
| `VIEW_ONLY` | ✅ | ❌ | ❌ | ❌ |
| `OPERATOR` | ✅ | ✅ | ✅ | ❌ |
| `MANAGER` | ✅ | ✅ | ✅ | ✅ |

### Token Architecture

```
Login
  │
  ▼
Access Token (JWT, 15m) ← short-lived
  + 
Refresh Token (JWT, 7d / 30d remember-me) ← stored in Session table
  │
  ▼
401 Detected by Axios Interceptor
  │
  ▼
POST /auth/refresh → New Access Token
  │
  ▼
Retry Original Request
```

### Session Management

Each login creates a `Session` record:
- `userId` or `adminId`
- `refreshToken` (hashed)
- `ipAddress` + `userAgent`
- `expiresAt`
- Users can list and terminate individual sessions

---

## 8. Environment Variables & Configuration

### Critical Secrets (must be changed before any deployment)

| Variable | How to Generate | Notes |
|----------|----------------|-------|
| `JWT_SECRET` | `openssl rand -hex 64` | Min 64 hex chars |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 64` | Must differ from JWT_SECRET |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | Exactly 64 hex chars — **never change after first use** |
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` | Strong random |
| `REDIS_PASSWORD` | `openssl rand -base64 32` | Strong random |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | `openssl rand -hex 16` | You set this, then enter in FB Console |

### Environment Files

| File | Purpose | Committed? |
|------|---------|-----------|
| `.env.example` | Development template | ✅ Yes (no secrets) |
| `.env.prod.example` | Production template | ✅ Yes (no secrets) |
| `.env` | Development secrets | ❌ No (gitignored) |
| `.env.prod` | Production secrets | ❌ No (gitignored) |

### Key Application URLs

| Variable | Dev Value | Prod Value |
|----------|-----------|-----------|
| `FRONTEND_URL` | `http://localhost:3000` | `https://app.yourdomain.com` |
| `API_URL` | `http://localhost:4000` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | `https://api.yourdomain.com/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | `ws://localhost:4000` | `wss://api.yourdomain.com` |

---

## 9. Docker & Deployment Setup

### Development Stack (`docker-compose.yml`)

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `postgres` | postgres:15-alpine | 5432 | With health check |
| `redis` | redis:7-alpine | 6379 | AOF persistence |
| `pgadmin` | dpage/pgadmin4 | 5050 | Dev-only UI |
| `redis-commander` | rediscommander | 8081 | Dev-only UI |

Backend and frontend are started manually (`pnpm dev`).

### Production Stack (`docker-compose.prod.yml`)

| Service | Details |
|---------|---------|
| `postgres` | No public port, 512 MB memory limit, `restart: always` |
| `redis` | No public port, password auth, 256 MB limit, LRU eviction |
| `backend` | Builds from `backend/Dockerfile`, health check, 512 MB limit |
| `frontend` | Builds from `frontend/Dockerfile`, depends on healthy backend, 256 MB limit |
| `pgadmin` | Disabled via `profiles: [dev-tools]` |
| `redis-commander` | Disabled via `profiles: [dev-tools]` |

### Dockerfile Features

**Backend (multi-stage):**
1. **Build stage** — Install deps, build NestJS, prune to prod deps
2. **Run stage** — Non-root user (`appuser`), health check, auto-run migrations on start

**Frontend (multi-stage):**
1. **Build stage** — Install deps, inject `NEXT_PUBLIC_*` env vars at build time, `next build`
2. **Run stage** — Non-root user, standalone output, 3000 port exposed

### Resource Requirements

| Setup | CPU | RAM | Disk |
|-------|-----|-----|------|
| **Minimum** | 2 vCPU | 2 GB RAM | 30 GB SSD |
| **Recommended** | 4 vCPU | 4 GB RAM | 80 GB SSD |
| **High Volume** | 8 vCPU | 8 GB RAM | 200 GB SSD |

---

## 10. Package Scripts

### Root Workspace

```bash
# Development
pnpm dev                    # Start frontend + backend concurrently
pnpm dev:frontend           # Start Next.js dev server
pnpm dev:backend            # Start NestJS dev server

# Build
pnpm build                  # Build all packages
pnpm build:frontend
pnpm build:backend

# Testing
pnpm test                   # Run all tests
pnpm test:cov               # Backend coverage
pnpm test:e2e               # Backend E2E tests

# Code Quality
pnpm lint                   # ESLint all packages
pnpm lint:fix               # Auto-fix lint issues
pnpm format                 # Prettier formatting
pnpm typecheck              # TypeScript check (no emit)

# Database
pnpm db:migrate             # Run migrations (dev)
pnpm db:migrate:prod        # Deploy migrations (prod)
pnpm db:seed                # Seed initial data
pnpm db:studio              # Open Prisma Studio
pnpm db:reset               # Reset and re-migrate

# Docker
pnpm docker:up              # Start dev infrastructure
pnpm docker:down            # Stop dev infrastructure
pnpm docker:prod:build      # Build production images
pnpm docker:prod:up         # Start production stack
pnpm docker:prod:down       # Stop production stack
pnpm docker:prod:restart    # Rolling restart
pnpm docker:prod:logs       # Follow all logs

# Utilities
pnpm backup:db              # PostgreSQL dump
pnpm validate:prod          # Validate production config
```

---

## 11. CI/CD Pipeline

**File:** `.github/workflows/ci-cd.yml`

### Stages

```
Push/PR to main/develop
         │
         ▼
   ┌─────────────┐
   │  Lint &     │
   │  Format     │─── ESLint + Prettier check
   └─────────────┘
         │
         ▼
   ┌─────────────────────────┐
   │   Backend Tests         │
   │   (PostgreSQL + Redis   │─── Unit + E2E tests + coverage
   │    test services)       │
   └─────────────────────────┘
         │
         ▼
   ┌─────────────────┐
   │ Frontend Tests  │─── Jest + Testing Library
   └─────────────────┘
         │
         ▼
   ┌─────────────────────────┐
   │   Build Check           │─── Prisma generate → shared → backend → frontend
   │   (all packages)        │
   └─────────────────────────┘
         │
    (main branch only)
         │
         ▼
   ┌─────────────────────────┐
   │   Docker Build & Push   │─── backend + frontend images → Docker Hub
   │                         │    Tags: latest + git SHA
   └─────────────────────────┘
         │
         ▼
   ┌─────────────────────────┐
   │   Security Scan         │─── Trivy → GitHub Security tab
   └─────────────────────────┘
```

---

## 12. Shared Package

**Location:** `shared/`  
**Package name:** `@messagesender/shared`

The shared package provides type-safe constants and interfaces used by both frontend and backend:

```typescript
// shared/src/types/index.ts — common TypeScript interfaces
// shared/src/constants/index.ts — app-wide constants
// shared/src/index.ts — barrel export
```

Both frontend (`package.json`) and backend (`package.json`) declare a local dependency:
```json
"@messagesender/shared": "workspace:*"
```

This ensures DRY, type-safe sharing without runtime compilation overhead.

---

## 13. Database Models & Schema

**ORM:** Prisma 5.8.0  
**Database:** PostgreSQL 15  
**Schema size:** ~921 lines

### Entity Relationship Overview

```
Admin ─────────────────────────────────────── Session
User ───────────────────────────────────────── Session
User ◄──── WorkspaceUserAccess ────► Workspace
                                         │
                                         ├── FacebookAccount ──► Page
                                         │
                                         ├── Contact
                                         │     ├── ContactTag ──► Tag
                                         │     ├── CustomFields (JSON)
                                         │     ├── OtnToken
                                         │     └── RecurringSubscription
                                         │
                                         ├── Message ──► Campaign
                                         │     └── MessageTagUsage
                                         │
                                         ├── Conversation
                                         │     ├── ConversationNote
                                         │     └── Labels (array)
                                         │
                                         ├── Campaign
                                         │     ├── CampaignLog (per contact)
                                         │     └── DripProgress
                                         │
                                         ├── Segment
                                         │     └── SegmentContact ──► Contact
                                         │
                                         ├── MessageTemplate
                                         ├── CannedResponse
                                         ├── ActivityLog
                                         ├── SystemSetting
                                         ├── Attachment
                                         ├── LoginAttempt
                                         └── JobQueue
```

### Key Enums

```
MessageStatus:    PENDING | QUEUED | SENT | DELIVERED | READ | FAILED | RECEIVED
MessageType:      TEXT | IMAGE | VIDEO | FILE | TEMPLATE
MessageDirection: INBOUND | OUTBOUND
BypassMethod:     WITHIN_WINDOW | OTN_TOKEN | RECURRING_NOTIFICATION |
                  CONFIRMED_EVENT_UPDATE | POST_PURCHASE_UPDATE |
                  ACCOUNT_UPDATE | HUMAN_AGENT | SPONSORED_MESSAGE

CampaignType:     ONE_TIME | SCHEDULED | RECURRING | DRIP | TRIGGER
CampaignStatus:   DRAFT | SCHEDULED | RUNNING | PAUSED | COMPLETED | CANCELLED

UserRole:         VIEW_ONLY | OPERATOR | MANAGER
UserStatus:       PENDING | ACTIVE | INACTIVE

ConversationStatus: OPEN | PENDING | RESOLVED

EngagementLevel:  HOT | WARM | COLD | INACTIVE | NEW
ContactSource:    ORGANIC | AD | COMMENT | REFERRAL

SegmentType:      DYNAMIC | STATIC
RecurringFreq:    DAILY | WEEKLY | MONTHLY
```

---

## 14. Notable Features

### 🔄 24-Hour Bypass System (Facebook Compliance)

Facebook restricts messaging to users who have messaged in the last 24 hours. MessageSender implements all approved bypass mechanisms:

1. **Within Window** — Auto-detected using last interaction timestamp
2. **One-Time Notification (OTN)** — User opts in to receive one future message
3. **Recurring Notifications** — User subscribes to a cadence (daily/weekly/monthly)
4. **Message Tags** — Pre-approved use cases (event reminders, purchase updates, etc.)
5. **Sponsored Messages** — Paid advertising messages
6. **Pre-send Compliance Check** — Server validates eligibility before each send

### 📧 Campaign Management

| Type | Description |
|------|-------------|
| **One-Time** | Single message blast to audience |
| **Scheduled** | Send at specific datetime with timezone |
| **Recurring** | Repeat on regular interval |
| **Drip** | Sequential messages with configurable delays |
| **Trigger** | Automated on user actions *(future phase)* |

**A/B Testing:** Create 2 message variants, send to split audience, auto-select winner based on delivery rate, click rate, or response rate.

**Audience Types:** Segment, Page subscribers, Manual list, CSV import

### 👥 Dynamic Segmentation

Dynamic segments use a JSON filter engine:
```json
{
  "rules": [
    { "field": "engagementLevel", "operator": "in", "value": ["HOT", "WARM"] },
    { "field": "tags", "operator": "contains", "value": "vip" },
    { "field": "lastInteraction", "operator": "gte", "value": "30days" }
  ],
  "logic": "AND"
}
```
Segments recalculate automatically on a schedule.

### 📊 Analytics Dashboard

| Report | Metrics |
|--------|---------|
| **Overview** | Total messages, delivery rate, response rate |
| **Messages** | Volume by page, by type, by date range |
| **Campaigns** | Sent, delivered, failed, opened, clicked per campaign |
| **Contacts** | Growth over time, engagement distribution, source breakdown |
| **Pages** | Follower growth, message volume per page |
| **Engagement** | Trend over time with custom date ranges |

### 💬 Unified Inbox

- Real-time new message notifications via Socket.io
- Conversation statuses: OPEN / PENDING / RESOLVED
- Assign to team member or admin
- Internal notes (not visible to customer)
- Custom labels on conversations
- Unread count per conversation

### 🔐 Security Highlights

| Feature | Implementation |
|---------|---------------|
| Facebook token storage | AES-256-GCM encrypted at rest |
| Password storage | bcrypt with cost factor 12 |
| JWT access tokens | 15-minute TTL |
| JWT refresh tokens | 7-day TTL with rotation |
| Login brute force | 5 attempts / 15 minutes (Redis-backed) |
| Global rate limiting | 100 req / 60s per IP |
| Webhook verification | HMAC-SHA256 signature check |
| SQL injection | Parameterized queries (Prisma) |
| XSS / CSRF | Helmet.js security headers |
| CORS | Origin whitelist (no wildcards in prod) |
| Input validation | class-validator on all DTOs |
| Non-root containers | Docker `appuser` |
| Audit logging | All admin actions in ActivityLog |

---

## 15. Security Architecture

### Threat Model & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Stolen JWT token | Short TTL (15 min), refresh rotation, session termination |
| Leaked .env file | .gitignore, secrets manager recommended for prod |
| Compromised Facebook token | AES-256-GCM encryption at rest, rotate via OAuth |
| Brute force login | Rate limiting: 5 attempts/15 min, IP tracked |
| Mass messaging abuse | Per-page rate limiting, Facebook API rate respect |
| Webhook spoofing | HMAC-SHA256 signature verification |
| XSS | Helmet.js CSP headers, React escaping |
| SQL injection | Prisma ORM parameterized queries |
| CSRF | SameSite cookies (where applicable), Origin validation |
| Container escape | Non-root user, no --privileged flag |
| Dependency vulnerabilities | Dependabot auto-PRs + Trivy scanning in CI |

---

## 16. Real-time Features

**Technology:** Socket.io 4.6.1 (backend gateway + frontend client)

### Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `conversation:new-message` | Server → Client | `{conversationId, message}` |
| `conversation:status-change` | Server → Client | `{conversationId, status}` |
| `campaign:progress` | Server → Client | `{campaignId, sent, total}` |
| `page:sync-complete` | Server → Client | `{pageId, followers}` |

### Rooms

Clients join a workspace-scoped room:
```
workspace:{workspaceId}
```
Only users with access to that workspace receive events.

---

## 17. Performance Architecture

### Async Message Processing

```
POST /messages
     │
     ▼ (immediate 202)
 BullMQ Queue
     │
     ▼ (workers)
 MessageWorkerService
     │
     ├── Rate limiter check (per page + contact)
     ├── Facebook Graph API call
     └── DB status update
```

### Caching Strategy

| Data | Cache | TTL |
|------|-------|-----|
| JWT sessions | Redis | Token expiry |
| Rate limit counters | Redis | Per window |
| BullMQ job metadata | Redis | Job lifetime |
| Segment contact counts | DB query (indexed) | On change |

### Database Optimization

- All `workspaceId` columns indexed (workspace isolation)
- Composite indexes for: `(workspaceId, status)`, `(pageId, contactId)`, `(createdAt)`
- Pagination on all list endpoints (cursor or offset)
- N+1 prevention via Prisma `include` (eager loading)

---

## 18. Summary & Readiness Assessment

### Overall Assessment: ✅ PRODUCTION READY

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | ⭐⭐⭐⭐⭐ | Clean modular NestJS + Next.js monorepo |
| **Security** | ⭐⭐⭐⭐⭐ | Encryption, JWT rotation, rate limiting, Helmet |
| **Scalability** | ⭐⭐⭐⭐ | BullMQ + Redis + stateless backend |
| **Developer Experience** | ⭐⭐⭐⭐⭐ | TypeScript everywhere, Swagger docs, hot reload |
| **Deployment Readiness** | ⭐⭐⭐⭐⭐ | Docker, CI/CD, health checks, Nginx template |
| **Observability** | ⭐⭐⭐⭐ | Sentry, structured logs, health endpoints |
| **Testing** | ⭐⭐⭐⭐ | Jest unit + E2E, CI-enforced |
| **Documentation** | ⭐⭐⭐⭐⭐ | SRS, deployment guide, security policy, changelogs |
| **Facebook Compliance** | ⭐⭐⭐⭐⭐ | All bypass methods, compliance audit, pre-send check |

### Key Strengths

1. **Complete Facebook messaging stack** — Every approved bypass method implemented
2. **Production-grade security** — AES-256-GCM, bcrypt 12, HMAC webhook verification
3. **Real-time capable** — Socket.io for live inbox and campaign progress
4. **Multi-tenant design** — Strict workspace isolation at DB + API layer
5. **Async processing** — BullMQ prevents timeouts on large campaign sends
6. **Comprehensive analytics** — Pre-built dashboards for all key metrics

### Next Step: VPS Deployment

See [VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md) for a complete step-by-step guide to deploying MessageSender on a VPS server.
