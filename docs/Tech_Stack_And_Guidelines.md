# Tech Stack & Development Guidelines
## Facebook Page Messaging Platform

**Version:** 1.0 | **Date:** 2026-02-04 | **Type:** Quick Reference Guide

---

## 1. Complete Tech Stack

### 1.1 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.x | React framework with App Router |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **shadcn/ui** | Latest | Pre-built UI components |
| **Radix UI** | Latest | Headless accessible components |
| **Zustand** | 4.x | Global state management |
| **TanStack Query** | 5.x | Server state & caching |
| **React Hook Form** | 7.x | Form handling |
| **Zod** | 3.x | Schema validation |
| **Recharts** | 2.x | Charts & graphs |
| **Socket.io Client** | 4.x | Real-time communication |
| **date-fns** | 3.x | Date manipulation |
| **Lucide React** | Latest | Icons |

### 1.2 Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x LTS | Runtime environment |
| **NestJS** | 10.x | Backend framework |
| **TypeScript** | 5.x | Type safety |
| **Prisma** | 5.x | ORM & database toolkit |
| **Passport.js** | 0.7.x | Authentication |
| **BullMQ** | 5.x | Job queue (Redis-based) |
| **Socket.io** | 4.x | WebSocket server |
| **class-validator** | 0.14.x | DTO validation |
| **class-transformer** | 0.5.x | Object transformation |
| **Winston** | 3.x | Logging |
| **Multer** | 1.x | File uploads |
| **@nestjs/swagger** | 7.x | API documentation |

### 1.3 Database & Cache

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15.x | Primary database |
| **Redis** | 7.x | Cache, sessions, job queue |

### 1.4 Infrastructure

| Technology | Purpose |
|------------|---------|
| **Ubuntu** | 22.04 LTS server OS |
| **Nginx** | Reverse proxy, SSL termination |
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **PM2** | Process manager (alternative to Docker) |
| **Let's Encrypt** | Free SSL certificates |

### 1.5 Development Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (faster, disk-efficient) |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |
| **Git** | Version control |

### 1.6 Testing Tools

| Tool | Purpose |
|------|---------|
| **Jest** | Unit & integration testing |
| **Supertest** | API endpoint testing |
| **React Testing Library** | Component testing |
| **Playwright** | E2E browser testing |
| **MSW** | API mocking |

### 1.7 Monitoring & Error Tracking

| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking (free tier) |
| **UptimeRobot** | Uptime monitoring (free) |
| **PM2 Logs** | Application logs |

---

## 2. Unit Testing Plan

### 2.1 Testing Coverage Targets

| Area | Target | Priority |
|------|--------|----------|
| Backend Services | > 85% | Critical |
| Backend Controllers | > 80% | High |
| Bypass System | > 95% | **Critical** |
| Frontend Hooks | > 70% | Medium |
| Frontend Components | > 60% | Medium |
| E2E Critical Paths | 100% | Critical |

### 2.2 Backend Unit Tests

```
tests/unit/
├── auth/
│   ├── auth.service.spec.ts          # Login, logout, token refresh
│   ├── password.service.spec.ts      # Hashing, validation
│   └── jwt.strategy.spec.ts          # Token generation/validation
│
├── facebook/
│   ├── facebook.service.spec.ts      # OAuth, token exchange
│   ├── facebook-api.service.spec.ts  # API calls mocking
│   └── webhook.service.spec.ts       # Event processing
│
├── contacts/
│   ├── contacts.service.spec.ts      # CRUD operations
│   ├── engagement.service.spec.ts    # Score calculation
│   └── import-export.service.spec.ts # CSV handling
│
├── messages/
│   ├── messages.service.spec.ts      # Single message send
│   ├── bulk-send.service.spec.ts     # Bulk processing
│   └── bypass/
│       ├── bypass.service.spec.ts    # ⚠️ Auto-selection logic
│       ├── window-tracker.spec.ts    # ⚠️ 24-hour calculation
│       ├── message-tags.spec.ts      # ⚠️ Tag validation
│       ├── otn.service.spec.ts       # ⚠️ OTN flow
│       └── recurring.service.spec.ts # ⚠️ Recurring flow
│
├── segments/
│   ├── segments.service.spec.ts      # CRUD
│   └── filter-engine.spec.ts         # Filter logic (AND/OR/NOT)
│
├── campaigns/
│   ├── campaigns.service.spec.ts     # CRUD
│   ├── scheduler.service.spec.ts     # Scheduling logic
│   └── executor.service.spec.ts      # Execution flow
│
└── inbox/
    ├── conversations.service.spec.ts # Conversation management
    └── realtime.service.spec.ts      # Socket events
```

### 2.3 Frontend Unit Tests

```
__tests__/
├── hooks/
│   ├── useAuth.test.ts
│   ├── useWorkspace.test.ts
│   └── useSocket.test.ts
│
├── components/
│   ├── MessageComposer.test.tsx
│   ├── SegmentBuilder.test.tsx
│   ├── BypassSelector.test.tsx
│   └── CampaignWizard.test.tsx
│
└── utils/
    ├── personalization.test.ts
    ├── validation.test.ts
    └── formatting.test.ts
```

### 2.4 Integration Tests

```
tests/integration/
├── auth.integration.spec.ts       # Full auth flow
├── facebook.integration.spec.ts   # OAuth + page connection
├── messaging.integration.spec.ts  # Send with bypass
├── campaigns.integration.spec.ts  # Create + execute
└── webhooks.integration.spec.ts   # Event processing
```

### 2.5 E2E Test Scenarios

| Scenario | Priority | Coverage |
|----------|----------|----------|
| Admin login → Dashboard | Critical | Auth flow |
| Connect Facebook → Select pages | Critical | FB integration |
| Create segment → Preview contacts | High | Segmentation |
| Compose message → Select bypass → Send | **Critical** | Core feature |
| Create campaign → Schedule → Execute | High | Campaigns |
| Receive message → Reply in inbox | High | Inbox |
| View analytics dashboard | Medium | Analytics |

### 2.6 Test Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Run specific module
pnpm test -- --testPathPattern=bypass

# Run E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

---

## 3. Project Setup Plan

### 3.1 Initial Setup (Day 1)

```bash
# 1. Create project root
mkdir MessageSender && cd MessageSender

# 2. Initialize monorepo
pnpm init
touch pnpm-workspace.yaml

# 3. Create workspace structure
mkdir -p frontend backend shared docs scripts

# 4. Initialize frontend (Next.js 14)
cd frontend
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir

# 5. Initialize backend (NestJS 10)
cd ../backend
pnpm add -g @nestjs/cli
nest new . --package-manager pnpm --skip-git

# 6. Install shared dependencies
cd ..
pnpm add -D typescript eslint prettier husky lint-staged
```

### 3.2 pnpm-workspace.yaml

```yaml
packages:
  - 'frontend'
  - 'backend'
  - 'shared'
```

### 3.3 Root package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter frontend dev\" \"pnpm --filter backend start:dev\"",
    "build": "pnpm --filter frontend build && pnpm --filter backend build",
    "test": "pnpm --filter backend test && pnpm --filter frontend test",
    "test:cov": "pnpm --filter backend test:cov",
    "test:e2e": "pnpm --filter backend test:e2e",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "db:migrate": "pnpm --filter backend prisma migrate dev",
    "db:seed": "pnpm --filter backend prisma db seed",
    "db:studio": "pnpm --filter backend prisma studio",
    "prepare": "husky install"
  }
}
```

### 3.4 Backend Setup Checklist

- [ ] Install NestJS core dependencies
- [ ] Configure Prisma with PostgreSQL
- [ ] Setup Redis connection
- [ ] Configure JWT authentication
- [ ] Setup BullMQ queues
- [ ] Configure Socket.io gateway
- [ ] Setup Swagger documentation
- [ ] Configure Winston logging
- [ ] Setup validation pipes
- [ ] Configure CORS

### 3.5 Frontend Setup Checklist

- [ ] Configure Next.js App Router
- [ ] Install and configure shadcn/ui
- [ ] Setup Tailwind CSS with custom theme
- [ ] Configure Zustand stores
- [ ] Setup TanStack Query provider
- [ ] Configure axios/fetch interceptors
- [ ] Setup Socket.io client
- [ ] Configure authentication wrapper
- [ ] Setup error boundaries

### 3.6 Database Setup

```bash
# Install Prisma
pnpm --filter backend add prisma @prisma/client

# Initialize Prisma
cd backend && npx prisma init

# After schema creation
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

### 3.7 Environment Files Structure

```
MessageSender/
├── .env.example           # Template
├── .env.local             # Local dev (git-ignored)
├── frontend/
│   └── .env.local         # Frontend env
└── backend/
    ├── .env               # Backend env
    └── .env.test          # Test env
```

---

## 4. Security Guidelines ⚠️

### 4.1 Authentication Security

| Rule | Implementation |
|------|----------------|
| Password Hashing | bcrypt, cost factor 12 |
| Password Requirements | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| JWT Signing | HS256 or RS256 |
| Access Token Expiry | 1 hour |
| Refresh Token Expiry | 7 days (30 days with Remember Me) |
| Login Rate Limiting | 5 failed attempts = 15 min lockout |
| Session Storage | httpOnly, secure, sameSite cookies |

### 4.2 Data Encryption

| Data | Method |
|------|--------|
| Facebook Tokens | AES-256-GCM encryption at rest |
| OTN Tokens | AES-256-GCM encryption |
| Recurring Tokens | AES-256-GCM encryption |
| Database Connection | SSL required in production |
| API Communication | HTTPS/TLS 1.2+ only |

### 4.3 API Security Checklist

- [ ] Rate limiting on all endpoints (100 req/min default)
- [ ] Strict CORS configuration (whitelist domains)
- [ ] Helmet.js for security headers
- [ ] Input validation on ALL endpoints (class-validator)
- [ ] Output sanitization
- [ ] SQL injection prevention (Prisma parameterized)
- [ ] XSS prevention (escape outputs)
- [ ] CSRF tokens for state-changing operations
- [ ] Request size limits (1MB default, 25MB for uploads)

### 4.4 Webhook Security

```typescript
// ALWAYS verify Facebook webhook signatures
function verifySignature(signature: string, body: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  );
}
```

### 4.5 Sensitive Data Rules

| ❌ NEVER | ✅ ALWAYS |
|----------|-----------|
| Log tokens or passwords | Log sanitized request IDs |
| Expose stack traces to client | Return generic error messages |
| Store secrets in code | Use environment variables |
| Commit .env files | Use .env.example templates |
| Trust user input | Validate and sanitize everything |

---

## 5. Performance Guidelines

### 5.1 Database Performance

| Rule | Implementation |
|------|----------------|
| Indexing | Add indexes on frequently queried columns |
| Pagination | Use cursor-based for large datasets |
| Query Optimization | Avoid N+1 queries, use Prisma `include` |
| Connection Pooling | Configure Prisma connection pool |
| Read Replicas | Consider for analytics queries (future) |

**Critical Indexes:**
```sql
-- Contacts (high volume)
CREATE INDEX idx_contacts_workspace_page ON contacts(workspace_id, page_id);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction_at);
CREATE INDEX idx_contacts_psid ON contacts(psid);

-- Messages (high volume)
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Campaigns
CREATE INDEX idx_campaigns_status_scheduled ON campaigns(status, scheduled_at);
```

### 5.2 Caching Strategy

| Data | Cache Duration | Storage |
|------|----------------|---------|
| User Sessions | Until expiry | Redis |
| Page Details | 15 minutes | Redis |
| Segment Counts | 5 minutes | Redis |
| Dashboard Stats | 1 minute | Redis |
| FB Attachment IDs | 24 hours | Redis |

### 5.3 API Response Times

| Endpoint Type | Target | Action if Exceeded |
|---------------|--------|-------------------|
| Auth endpoints | < 200ms | Optimize queries |
| List endpoints | < 300ms | Add pagination/caching |
| Detail endpoints | < 200ms | Add caching |
| Send endpoints | < 500ms | Queue + async |
| Analytics | < 1s | Pre-aggregate data |

### 5.4 Frontend Performance

| Rule | Implementation |
|------|----------------|
| Code Splitting | Use Next.js dynamic imports |
| Image Optimization | Use next/image component |
| Bundle Size | Monitor with bundle analyzer |
| Lazy Loading | Load components on demand |
| Memoization | Use useMemo, useCallback appropriately |
| Virtual Lists | Use for long contact/message lists |

### 5.5 Bulk Messaging Performance

```typescript
// Rate Limiting Configuration
const RATE_LIMITS = {
  MESSAGES_PER_PAGE_PER_HOUR: 200,  // Facebook limit
  BATCH_SIZE: 50,                    // Process in batches
  DELAY_BETWEEN_BATCHES: 1000,       // 1 second
  MAX_CONCURRENT_WORKERS: 5,         // Parallel processing
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: [1000, 5000, 15000]   // Exponential backoff
};
```

---

## 6. Code Quality Standards

### 6.1 TypeScript Rules

```typescript
// tsconfig.json strict settings
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 6.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `MessageComposer.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |
| Files (backend) | kebab-case | `bulk-send.service.ts` |
| Interfaces | PascalCase, prefix I (optional) | `Contact`, `IContactService` |
| Types | PascalCase | `MessageType` |
| Enums | PascalCase | `BypassMethod` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Functions | camelCase | `calculateEngagementScore` |
| React Components | PascalCase | `ContactProfile` |

### 6.3 File Organization

```typescript
// Service file structure
import statements (external)
import statements (internal)

constants

interfaces/types

@Injectable()
export class MyService {
  // Constructor
  constructor() {}
  
  // Public methods (alphabetical or logical grouping)
  async publicMethod() {}
  
  // Private methods
  private helperMethod() {}
}
```

### 6.4 Error Handling Pattern

```typescript
// Backend: Use custom exceptions
throw new BadRequestException('Invalid message tag');
throw new UnauthorizedException('Token expired');
throw new NotFoundException('Contact not found');

// Frontend: Use error boundaries + toast
try {
  await sendMessage(data);
  toast.success('Message sent!');
} catch (error) {
  toast.error(getErrorMessage(error));
}
```

### 6.5 Git Commit Convention

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore

Examples:
feat(auth): implement JWT refresh token
fix(messaging): handle rate limit errors
docs(api): update endpoint documentation
test(bypass): add OTN service unit tests
```

---

## 7. Facebook API Guidelines

### 7.1 Required Permissions

| Permission | Purpose | Review |
|------------|---------|--------|
| pages_messaging | Send/receive messages | Yes |
| pages_manage_metadata | Manage webhooks | Yes |
| pages_read_engagement | Read interactions | Yes |
| pages_show_list | List user's pages | No |
| pages_read_user_content | Read content | Yes |

### 7.2 Rate Limits

| API | Limit | Handling |
|-----|-------|----------|
| Send API | 200 calls/page/hour | Queue + distribute |
| Graph API | 200 calls/user/hour | Cache responses |
| Batch API | 50 requests/batch | Use for bulk operations |

### 7.3 Message Tag Compliance ⚠️

| Tag | Valid Use | Invalid Use |
|-----|-----------|-------------|
| CONFIRMED_EVENT_UPDATE | Event reminders, changes | New event promotions |
| POST_PURCHASE_UPDATE | Order status, shipping | Upsells, new products |
| ACCOUNT_UPDATE | Account alerts, security | Marketing, promotions |
| HUMAN_AGENT | Support responses (7 days) | Automated messages |

### 7.4 Token Management

```typescript
// Token refresh schedule
const TOKEN_REFRESH_SCHEDULE = {
  CHECK_INTERVAL: '0 */6 * * *',  // Every 6 hours
  REFRESH_BEFORE_EXPIRY: 7 * 24 * 60 * 60 * 1000,  // 7 days before
  ALERT_BEFORE_EXPIRY: 14 * 24 * 60 * 60 * 1000    // 14 days before
};
```

---

## 8. Development Workflow

### 8.1 Feature Development Flow

```
1. Create feature branch: git checkout -b feature/feature-name
2. Implement with tests
3. Run linting: pnpm lint
4. Run tests: pnpm test
5. Create PR with description
6. Code review
7. Merge to develop
8. Deploy to staging
9. QA testing
10. Merge to main
11. Deploy to production
```

### 8.2 Pre-Commit Hooks

```json
// .husky/pre-commit
#!/bin/sh
pnpm lint-staged

// lint-staged.config.js
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write']
};
```

### 8.3 PR Checklist

- [ ] Code follows naming conventions
- [ ] No TypeScript errors
- [ ] Unit tests written/updated
- [ ] Integration tests if needed
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Tested locally

---

## 9. Quick Reference Commands

### Development

```bash
pnpm dev                    # Start all services
pnpm dev:frontend           # Start frontend only
pnpm dev:backend            # Start backend only
pnpm db:studio              # Open Prisma Studio
```

### Database

```bash
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed data
pnpm db:reset               # Reset database
pnpm db:generate            # Generate Prisma client
```

### Testing

```bash
pnpm test                   # Run all tests
pnpm test:cov               # With coverage
pnpm test:watch             # Watch mode
pnpm test:e2e               # E2E tests
```

### Production

```bash
pnpm build                  # Build all
docker-compose up -d        # Start containers
docker-compose logs -f      # View logs
```

---

## 10. Critical Reminders

### ⚠️ MUST DO

1. **Encrypt ALL Facebook tokens** - AES-256 at rest
2. **Verify webhook signatures** - HMAC-SHA256
3. **Respect rate limits** - 200/hour/page
4. **Track 24-hour window** - Per contact per page
5. **Log bypass method usage** - Compliance audit
6. **Test all 4 bypass methods** - Critical feature
7. **Backup database** - Every 6 hours minimum
8. **Monitor token expiration** - Auto-refresh

### ❌ NEVER DO

1. Store tokens in plain text
2. Skip webhook signature verification
3. Send messages without checking window status
4. Ignore Facebook API rate limit errors
5. Log sensitive data (tokens, passwords)
6. Skip input validation
7. Expose stack traces to users
8. Commit environment files

### 📋 Before Each Release

- [ ] All tests passing
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Database backed up
- [ ] Rollback plan ready

---

**Document End**

*Use this as your quick reference during development. For detailed specifications, refer to SRS_Document.md and Development_Plan.md*
