# MessageSender - Facebook Page Messaging Platform

A comprehensive Facebook Page Messaging & Management Platform for managing multiple business workspaces with bulk messaging capabilities and 24-hour bypass functionality.

> **Production Ready** ✅ — Includes Docker, CI/CD, comprehensive security, and complete deployment documentation.

## 📚 Documentation

- [📖 Deployment Guide](./docs/DEPLOYMENT.md) — Production deployment instructions
- [✅ Production Checklist](./docs/PRODUCTION_CHECKLIST.md) — Pre-deployment verification
- [🔒 Security Policy](./SECURITY.md) — Security best practices & reporting
- [📋 Development Plan](./docs/Development_Plan.md) — Project roadmap
- [📄 SRS Document](./docs/SRS_Document.md) — Requirements specification

## 🚀 Features

- **Multi-Workspace Management**: 5 isolated business workspaces
- **Facebook Integration**: OAuth, page management, webhooks
- **24-Hour Bypass System**: Message Tags, OTN, Recurring Notifications
- **Bulk Messaging**: Rate-limited mass messaging with progress tracking
- **Campaign Management**: One-time, scheduled, recurring, drip campaigns
- **A/B Testing**: Test message variants and auto-select winners
- **Unified Inbox**: Real-time conversations across all pages
- **Analytics Dashboard**: Comprehensive metrics and reporting
- **Team Management**: Role-based access control

## 📋 Prerequisites

- Node.js 20.x LTS
- pnpm 8.x
- PostgreSQL 15.x
- Redis 7.x
- Docker & Docker Compose (optional)

## 🛠️ Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- Socket.io Client

### Backend
- NestJS 10
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Socket.io
- Passport.js + JWT

## 📦 Project Structure

```
MessageSender/
├── frontend/           # Next.js 14 application
├── backend/            # NestJS 10 application
├── shared/             # Shared types and utilities
├── docs/               # Documentation
├── scripts/            # Utility scripts
└── docker/             # Docker configurations
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd MessageSender

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Important: Set DATABASE_URL, REDIS_HOST, JWT_SECRET, ENCRYPTION_KEY
```

### 3. Start Database Services

```bash
# Using Docker
pnpm docker:up

# Or start PostgreSQL and Redis manually
```

### 4. Initialize Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed
```

### 5. Start Development

```bash
# Start both frontend and backend
pnpm dev

# Or start separately
pnpm dev:frontend  # http://localhost:3000
pnpm dev:backend   # http://localhost:4000
```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages for production |
| `pnpm test` | Run all tests |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database with initial data |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |

## 🔐 Security

- All Facebook tokens encrypted with AES-256-GCM
- Passwords hashed with bcrypt (cost factor 12)
- JWT authentication with refresh tokens
- Rate limiting on all endpoints
- Webhook signature verification (HMAC-SHA256)
- Input validation on all endpoints
- HTTPS enforced in production
- Non-root Docker containers
- Security headers (Helmet.js)

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## 📚 Documentation

- [SRS Document](./docs/SRS_Document.md) - Software Requirements Specification
- [Development Plan](./docs/Development_Plan.md) - Phase-wise development guide
- [Tech Stack & Guidelines](./docs/Tech_Stack_And_Guidelines.md) - Technical reference
- [Phase To-Do Lists](./docs/Phase_ToDo_Lists.md) - Task tracking
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [Production Checklist](./docs/PRODUCTION_CHECKLIST.md) - Pre-deployment verification

## 🤝 Contributing

This is a private project. Please contact the administrator for contribution guidelines.

## 📄 License

Private - All rights reserved.

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-04
