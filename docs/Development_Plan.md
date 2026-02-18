# Comprehensive Development Plan
## Facebook Page Messaging & Management Platform
### Complete Implementation Roadmap

**Document Version:** 1.0  
**Date:** 2026-02-04  
**Based On:** SRS_Document.md v2.0  
**Project Duration:** 18 Weeks (4.5 Months)  
**Document Type:** Development Blueprint & Implementation Guide

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview & Objectives](#2-project-overview--objectives)
3. [Development Methodology](#3-development-methodology)
4. [Phase-wise Development Plan](#4-phase-wise-development-plan)
5. [Technical Implementation Details](#5-technical-implementation-details)
6. [Module Breakdown & Task Lists](#6-module-breakdown--task-lists)
7. [Database Implementation Plan](#7-database-implementation-plan)
8. [API Development Specifications](#8-api-development-specifications)
9. [Frontend Implementation Guide](#9-frontend-implementation-guide)
10. [24-Hour Bypass System Implementation](#10-24-hour-bypass-system-implementation)
11. [Testing Strategy](#11-testing-strategy)
12. [Security Implementation Checklist](#12-security-implementation-checklist)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Documentation Requirements](#14-documentation-requirements)
15. [Risk Management](#15-risk-management)
16. [Milestones & Deliverables](#16-milestones--deliverables)
17. [Quality Assurance Checklist](#17-quality-assurance-checklist)
18. [Post-Deployment Plan](#18-post-deployment-plan)

---

## 1. Executive Summary

### 1.1 Project Vision

Build a professional, enterprise-grade Facebook Page Messaging & Management Platform that enables a single owner to manage up to 5 isolated business workspaces, each connected to separate Facebook accounts with multiple pages. The platform will provide comprehensive bulk messaging capabilities with full 24-hour window bypass functionality.

### 1.2 Key Success Metrics

| Metric | Target |
|--------|--------|
| All SRS Requirements Implemented | 100% |
| 24-Hour Bypass Methods Working | All 4 methods |
| Page Load Time | < 2 seconds |
| API Response Time | < 500ms (95th percentile) |
| System Uptime | 99.5% |
| Contact Capacity | 100,000+ per workspace |
| Message Processing | 5,000 messages/hour |
| Code Coverage | > 80% |

### 1.3 Critical Features Priority

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FEATURE PRIORITY MATRIX                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚠️ P0 - CRITICAL (Must Have - Project Fails Without)               │
│  ├── 24-Hour Bypass System (ALL 4 Methods)                         │
│  ├── Facebook OAuth & Page Connection                               │
│  ├── Bulk Messaging Engine                                          │
│  ├── Contact/Lead Management                                        │
│  └── Webhook Integration                                            │
│                                                                     │
│  🔴 P1 - HIGH (Core Functionality)                                  │
│  ├── Multi-Workspace Isolation                                      │
│  ├── Campaign Management                                            │
│  ├── Audience Segmentation                                          │
│  ├── Unified Inbox                                                  │
│  └── Authentication & Security                                      │
│                                                                     │
│  🟡 P2 - MEDIUM (Important Features)                                │
│  ├── Analytics Dashboard                                            │
│  ├── Team Management                                                │
│  ├── A/B Testing                                                    │
│  ├── Drip Campaigns                                                 │
│  └── Message Templates                                              │
│                                                                     │
│  🟢 P3 - LOW (Nice to Have)                                         │
│  ├── Sponsored Messages Integration                                 │
│  ├── Advanced Reports Export                                        │
│  ├── Keyboard Shortcuts                                             │
│  └── Custom Themes                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Project Overview & Objectives

### 2.1 Business Objectives

1. **Enable Multi-Business Management**: Single owner manages 5 isolated workspaces
2. **Maximize Reach**: Bypass 24-hour messaging limitation using ALL approved methods
3. **Automation**: Scheduled campaigns, drip sequences, trigger-based messaging
4. **Compliance**: Full adherence to Facebook Platform Policies
5. **Scalability**: Handle 500,000+ total contacts across all workspaces

### 2.2 Technical Objectives

1. **Modern Tech Stack**: Next.js 14 + NestJS 10 + PostgreSQL 15 + Redis 7
2. **Real-time Communication**: Socket.io for live inbox updates
3. **Background Processing**: BullMQ for message queuing and rate limiting
4. **Security First**: AES-256 encryption, bcrypt hashing, JWT authentication
5. **Self-Hosted**: VPS deployment with Docker containerization

### 2.3 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SYSTEM ARCHITECTURE OVERVIEW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   FRONTEND (Next.js 14)          BACKEND (NestJS 10)                       │
│   ┌─────────────────────┐        ┌─────────────────────┐                   │
│   │                     │        │                     │                   │
│   │  • App Router       │  REST  │  • REST API         │                   │
│   │  • Server Components│◄──────►│  • WebSocket Server │                   │
│   │  • Client Components│  WS    │  • Job Workers      │                   │
│   │  • Tailwind CSS     │        │  • Webhook Handler  │                   │
│   │  • shadcn/ui        │        │  • Prisma ORM       │                   │
│   │                     │        │                     │                   │
│   └─────────────────────┘        └──────────┬──────────┘                   │
│                                             │                               │
│                          ┌──────────────────┼──────────────────┐           │
│                          │                  │                  │           │
│                          ▼                  ▼                  ▼           │
│                    ┌───────────┐      ┌───────────┐      ┌───────────┐    │
│                    │PostgreSQL │      │   Redis   │      │  Storage  │    │
│                    │  Database │      │Cache/Queue│      │   Files   │    │
│                    └───────────┘      └───────────┘      └───────────┘    │
│                                                                             │
│   EXTERNAL INTEGRATIONS                                                     │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │  Facebook Graph API  │  Messenger Platform  │  Marketing API    │      │
│   │  (OAuth, Pages)      │  (Send API, Webhooks)│  (Sponsored Msgs) │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Development Methodology

### 3.1 Agile Implementation

- **Sprint Duration**: 1 Week
- **Total Sprints**: 18 Sprints
- **Review Cycle**: End of each sprint
- **Documentation**: Continuous throughout development

### 3.2 Development Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │  PLAN    │───►│  BUILD   │───►│  TEST    │───►│  REVIEW  │            │
│   │          │    │          │    │          │    │          │            │
│   │• Tasks   │    │• Code    │    │• Unit    │    │• Code    │            │
│   │• Design  │    │• Commit  │    │• E2E     │    │• Demo    │            │
│   │• Schema  │    │• PR      │    │• Manual  │    │• Approve │            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│        │                                               │                    │
│        │              ┌──────────┐                     │                    │
│        └──────────────│  DEPLOY  │◄────────────────────┘                    │
│                       │          │                                          │
│                       │• Staging │                                          │
│                       │• Prod    │                                          │
│                       └──────────┘                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Version Control Strategy

```
BRANCH STRUCTURE:
├── main (production)
├── staging (pre-production testing)
├── develop (integration)
└── feature/* (individual features)
    ├── feature/auth-system
    ├── feature/workspace-management
    ├── feature/facebook-integration
    ├── feature/bulk-messaging
    ├── feature/24h-bypass
    ├── feature/campaigns
    ├── feature/inbox
    ├── feature/analytics
    └── feature/team-management
```

### 3.4 Code Standards

| Category | Standard |
|----------|----------|
| Language | TypeScript (strict mode) |
| Linting | ESLint with Airbnb config |
| Formatting | Prettier |
| Commit Messages | Conventional Commits |
| Code Review | Required for all PRs |
| Documentation | JSDoc + README per module |

---

## 4. Phase-wise Development Plan

### Phase 1: Foundation (Weeks 1-3)

**Objective**: Establish project infrastructure, database, and authentication system

#### Week 1: Project Setup & Infrastructure

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Initialize monorepo structure | Project scaffolding |
|     | Setup Next.js 14 frontend | Frontend base |
|     | Setup NestJS 10 backend | Backend base |
|     | Configure TypeScript | Type safety |
| 3-4 | Setup PostgreSQL database | Database running |
|     | Configure Prisma ORM | ORM configured |
|     | Setup Redis | Cache/Queue ready |
|     | Configure Docker Compose | Containerization |
| 5-6 | Implement database schema | All tables created |
|     | Create seed scripts | Initial data |
|     | Setup migration system | Migrations working |
| 7   | Setup CI/CD pipeline | Automated builds |
|     | Configure ESLint/Prettier | Code quality tools |

**Deliverables Week 1:**
- [ ] Monorepo with frontend/backend
- [ ] Database schema implemented
- [ ] Docker Compose setup
- [ ] CI/CD pipeline configured

#### Week 2: Authentication System

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Implement Admin model | Admin entity |
|     | Implement password hashing (bcrypt) | Secure passwords |
|     | Create login endpoint | Auth API |
| 3-4 | Implement JWT tokens | Token system |
|     | Access token (1h expiry) | Short-lived tokens |
|     | Refresh token (7d/30d expiry) | Long-lived tokens |
|     | Token refresh mechanism | Auto-renewal |
| 5-6 | Implement session management | Session tracking |
|     | Rate limiting (5 attempts = lockout) | Brute force protection |
|     | Login attempt logging | Security logs |
| 7   | Password reset functionality | Recovery system |
|     | "Remember Me" implementation | Extended sessions |

**Deliverables Week 2:**
- [ ] Admin authentication working
- [ ] JWT token system complete
- [ ] Session management implemented
- [ ] Rate limiting active

#### Week 3: Team Members & Authorization

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Team member model | User entity |
|     | Invitation system | Email invites |
|     | First-login password setup | Onboarding |
| 3-4 | Role-based access control | RBAC system |
|     | Permission guards | Route protection |
|     | Workspace access control | Isolation |
| 5-6 | Login page UI (Next.js) | Frontend auth |
|     | Session UI management | User sessions |
|     | Team management UI | Admin panel |
| 7   | Integration testing | Auth tests |
|     | Security audit | Vulnerability check |

**Deliverables Week 3:**
- [ ] Team member system complete
- [ ] RBAC implemented
- [ ] Auth UI complete
- [ ] All auth tests passing

---

### Phase 2: Facebook Integration (Weeks 4-6)

**Objective**: Complete Facebook OAuth, page connection, and webhook integration

#### Week 4: Facebook OAuth & Account Connection

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Facebook App configuration | FB Developer setup |
|     | OAuth flow implementation | Login with Facebook |
|     | Permission scope handling | Required permissions |
| 3-4 | User Access Token retrieval | Token storage |
|     | Long-lived token exchange | Extended tokens |
|     | Token refresh mechanism | Auto-renewal |
| 5-6 | Facebook account model | Entity + Relations |
|     | Token encryption (AES-256) | Secure storage |
|     | Connection status tracking | Health monitoring |
| 7   | Reconnection flow | Error recovery |
|     | Token error handling | Graceful failures |

**Deliverables Week 4:**
- [ ] Facebook OAuth working
- [ ] Tokens securely stored
- [ ] Auto-refresh implemented
- [ ] Error handling complete

#### Week 5: Page Management

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Fetch user's pages | Page listing |
|     | Page Access Token retrieval | Per-page tokens |
|     | Page model implementation | Entity + Relations |
| 3-4 | Page activation/deactivation | Admin controls |
|     | Page data sync | Name, picture, followers |
|     | Scheduled sync (15 min) | Background job |
| 5-6 | Page health monitoring | Status tracking |
|     | Token error detection | Alert system |
|     | Page dashboard UI | Visual management |
| 7   | Multi-page testing | Integration tests |
|     | Error scenarios | Edge cases |

**Deliverables Week 5:**
- [ ] Page connection working
- [ ] Page tokens secured
- [ ] Sync job running
- [ ] Page management UI complete

#### Week 6: Webhook Integration

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Webhook endpoint setup | /api/webhooks/facebook |
|     | Signature verification | HMAC-SHA256 |
|     | Challenge response | FB verification |
| 3-4 | Message event handling | Incoming messages |
|     | Delivery/Read receipts | Status tracking |
|     | Postback handling | Button clicks |
| 5-6 | Opt-in/Opt-out events | OTN + Recurring |
|     | Referral tracking | Source attribution |
|     | Event queuing | Async processing |
| 7   | Webhook testing | End-to-end test |
|     | Error handling | Failure recovery |

**Deliverables Week 6:**
- [ ] Webhooks receiving events
- [ ] All event types handled
- [ ] Message capture working
- [ ] Robust error handling

---

### Phase 3: Messaging Engine (Weeks 7-9) ⚠️ CRITICAL PHASE

**Objective**: Implement complete bulk messaging with ALL 24-hour bypass methods

#### Week 7: Core Messaging System

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Message model implementation | Entity + Relations |
|     | Send API integration | Facebook Send API |
|     | Message types support | Text, Image, Video, File |
| 3-4 | Attachment handling | Upload + Cache |
|     | Facebook attachment upload | Reusable IDs |
|     | Template messages | Buttons, Quick Replies |
| 5-6 | Personalization engine | Token replacement |
|     | {{first_name}}, {{last_name}}, etc. | Dynamic content |
|     | Fallback values | Empty field handling |
| 7   | Message composer UI | Rich editor |
|     | Preview functionality | Visual preview |

**Deliverables Week 7:**
- [ ] Single message sending works
- [ ] All message types supported
- [ ] Personalization working
- [ ] Composer UI complete

#### Week 8: 24-Hour Bypass System ⚠️ MOST CRITICAL

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | 24-hour window tracking | Timestamp tracking |
|     | Window status calculation | Active/Expired |
|     | Contact status indicators | UI display |
| 3-4 | **MESSAGE TAGS IMPLEMENTATION** | All 4 tags |
|     | CONFIRMED_EVENT_UPDATE | Event updates |
|     | POST_PURCHASE_UPDATE | Order updates |
|     | ACCOUNT_UPDATE | Account alerts |
|     | HUMAN_AGENT | Support replies |
| 5-6 | **OTN IMPLEMENTATION** | One-Time Notifications |
|     | OTN request generation | Opt-in prompts |
|     | OTN token storage | Secure storage |
|     | OTN token usage | Single-use send |
|     | OTN webhook handling | Opt-in capture |
| 7   | **RECURRING NOTIFICATIONS** | Subscription system |
|     | Subscription opt-in flow | DAILY/WEEKLY/MONTHLY |
|     | Token management | Frequency tracking |
|     | Send with recurring token | Bypass send |

**Deliverables Week 8:**
- [ ] ✅ Message Tags working (ALL 4)
- [ ] ✅ OTN system complete
- [ ] ✅ Recurring Notifications working
- [ ] ✅ Auto-bypass selection

#### Week 9: Bulk Messaging & Rate Limiting

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | BullMQ job queue setup | Message queue |
|     | Worker implementation | Job processors |
|     | Job prioritization | Priority handling |
| 3-4 | Rate limiting system | 200/hour/page |
|     | Multi-page distribution | Load balancing |
|     | Exponential backoff | Error handling |
| 5-6 | Bulk send processing | Mass messaging |
|     | Progress tracking | Real-time status |
|     | Cancellation support | Stop queued jobs |
| 7   | Retry mechanism | Failed message retry |
|     | Delivery logging | Complete audit trail |

**Deliverables Week 9:**
- [ ] Bulk messaging working
- [ ] Rate limits respected
- [ ] Progress tracking live
- [ ] Retry mechanism active

---

### Phase 4: Campaigns & Segmentation (Weeks 10-12)

**Objective**: Implement audience segmentation and campaign management

#### Week 10: Contact Management & Segmentation

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Contact CRUD operations | Full contact management |
|     | Custom fields system | Dynamic fields |
|     | Tag management | Contact tagging |
| 3-4 | Search & filtering | Advanced search |
|     | Pagination | Performance optimization |
|     | Import/Export (CSV) | Data portability |
| 5-6 | **SEGMENT BUILDER** | Visual interface |
|     | Filter conditions | 12+ filter types |
|     | AND/OR/NOT logic | Complex queries |
|     | Nested conditions | Group logic |
| 7   | Dynamic segment calculation | Auto-update |
|     | Segment preview | Contact preview |

**Deliverables Week 10:**
- [ ] Contact management complete
- [ ] Custom fields working
- [ ] Segment builder functional
- [ ] Import/Export working

#### Week 11: Campaign Creation

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Campaign model | Entity + Relations |
|     | Campaign types | One-time, Scheduled, Recurring |
|     | Campaign wizard UI | Step-by-step |
| 3-4 | Audience selection | Segment/Page/Manual |
|     | Message configuration | Content + Bypass |
|     | Schedule configuration | Date/Time/Timezone |
| 5-6 | Drip campaign builder | Visual sequence |
|     | Multi-step sequences | Delays + Conditions |
|     | Drip progress tracking | Contact status |
| 7   | Campaign preview | Full preview |
|     | Validation system | Error checking |

**Deliverables Week 11:**
- [ ] All campaign types working
- [ ] Campaign wizard complete
- [ ] Drip campaigns functional
- [ ] Full validation in place

#### Week 12: Campaign Execution & A/B Testing

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Campaign execution engine | Job processing |
|     | Scheduled job triggering | Cron scheduling |
|     | Campaign state management | Status transitions |
| 3-4 | A/B testing implementation | Variant creation |
|     | Audience splitting | Random distribution |
|     | Variant tracking | Performance metrics |
| 5-6 | Winner determination | Auto-selection |
|     | Campaign management UI | List, Edit, Delete |
|     | Pause/Resume/Cancel | Admin controls |
| 7   | Campaign testing | Full integration |
|     | Edge case handling | Error scenarios |

**Deliverables Week 12:**
- [ ] Campaign execution working
- [ ] Scheduling functional
- [ ] A/B testing complete
- [ ] All controls working

---

### Phase 5: Inbox & Analytics (Weeks 13-14)

**Objective**: Implement unified inbox and analytics dashboard

#### Week 13: Unified Inbox

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Conversation model | Entity + Relations |
|     | Message aggregation | By contact/page |
|     | Conversation list UI | Visual inbox |
| 3-4 | Real-time updates | Socket.io integration |
|     | Unread tracking | Badge counts |
|     | Search within inbox | Message search |
| 5-6 | Reply functionality | Send responses |
|     | 24-hour bypass in inbox | Warning + Selection |
|     | Attachment replies | Media support |
| 7   | Conversation management | Assign, Label, Status |
|     | Canned responses | Quick replies |

**Deliverables Week 13:**
- [ ] Inbox displaying conversations
- [ ] Real-time message updates
- [ ] Reply functionality working
- [ ] Conversation management complete

#### Week 14: Analytics Dashboard

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Dashboard metrics calculation | Core stats |
|     | Time-series data | Historical tracking |
|     | Comparison calculations | Period comparison |
| 3-4 | Chart components | Recharts integration |
|     | Dashboard UI | Visual metrics |
|     | Date range filters | Flexible filtering |
| 5-6 | Campaign analytics | Per-campaign stats |
|     | Contact analytics | Growth + Engagement |
|     | Page analytics | Per-page metrics |
| 7   | Report generation | PDF/CSV/Excel export |
|     | Scheduled reports | Email delivery |

**Deliverables Week 14:**
- [ ] Dashboard with all metrics
- [ ] Charts rendering correctly
- [ ] Campaign stats complete
- [ ] Report export working

---

### Phase 6: Team & Settings (Week 15)

**Objective**: Complete team management and system settings

#### Week 15: Team Management & System Settings

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Team invitation flow | Email invites |
|     | Permission levels | View/Operator/Manager |
|     | Workspace assignment | Multi-workspace |
| 3-4 | Activity logging | Audit trail |
|     | Activity log viewer | Admin UI |
|     | Session management UI | Active sessions |
| 5-6 | System settings | App config |
|     | Email configuration | SMTP setup |
|     | Notification preferences | Alerts config |
| 7   | Backup system | Manual + Scheduled |
|     | System health page | Status dashboard |

**Deliverables Week 15:**
- [ ] Team management complete
- [ ] Activity logging working
- [ ] All settings functional
- [ ] Backup system operational

---

### Phase 7: Testing & Polish (Weeks 16-17)

**Objective**: Comprehensive testing and UI/UX refinement

#### Week 16: Testing

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Unit tests (backend) | Jest tests |
|     | Unit tests (frontend) | Component tests |
|     | API integration tests | Supertest |
| 3-4 | E2E tests | Playwright tests |
|     | User flow testing | Critical paths |
|     | Cross-browser testing | Browser compatibility |
| 5-6 | Performance testing | Load testing |
|     | Security testing | OWASP check |
|     | Facebook API testing | All integrations |
| 7   | Bug fixing | Issue resolution |
|     | Code review | Final review |

**Deliverables Week 16:**
- [ ] All unit tests passing
- [ ] E2E tests covering critical flows
- [ ] Performance benchmarks met
- [ ] Security audit passed

#### Week 17: Polish & Documentation

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | UI/UX refinement | Visual polish |
|     | Responsive testing | Mobile/Tablet |
|     | Accessibility check | A11y compliance |
| 3-4 | Error handling improvement | User-friendly errors |
|     | Loading states | Better UX |
|     | Empty states | Helpful guidance |
| 5-6 | Technical documentation | Code docs |
|     | API documentation | Swagger/OpenAPI |
|     | User guide | End-user docs |
| 7   | Final bug fixes | Last issues |
|     | Code cleanup | Refactoring |

**Deliverables Week 17:**
- [ ] Polished UI/UX
- [ ] Complete documentation
- [ ] All bugs resolved
- [ ] Production-ready code

---

### Phase 8: Deployment (Week 18)

**Objective**: Production deployment and handover

#### Week 18: Deployment & Handover

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | VPS provisioning | Server ready |
|     | Server configuration | Ubuntu 22.04 |
|     | Docker deployment | Containers running |
| 3-4 | Domain & SSL setup | HTTPS enabled |
|     | Nginx configuration | Reverse proxy |
|     | Database migration | Production DB |
| 5-6 | Monitoring setup | Sentry, Uptime |
|     | Backup automation | Scheduled backups |
|     | Security hardening | Final security |
| 7   | Client handover | Documentation |
|     | Admin training | User training |
|     | Go-live | Production launch |

**Deliverables Week 18:**
- [ ] Production server running
- [ ] All services operational
- [ ] Monitoring active
- [ ] Client trained and handed over

---

## 5. Technical Implementation Details

### 5.1 Project Structure

```
MessageSender/
├── 📁 frontend/                    # Next.js 14 Application
│   ├── 📁 app/                     # App Router
│   │   ├── 📁 (auth)/              # Auth routes (login, etc.)
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── 📁 (dashboard)/         # Protected routes
│   │   │   ├── 📁 workspace/
│   │   │   │   └── [workspaceId]/
│   │   │   │       ├── 📁 contacts/
│   │   │   │       ├── 📁 segments/
│   │   │   │       ├── 📁 campaigns/
│   │   │   │       ├── 📁 inbox/
│   │   │   │       ├── 📁 analytics/
│   │   │   │       ├── 📁 pages/
│   │   │   │       └── 📁 settings/
│   │   │   ├── 📁 team/
│   │   │   ├── 📁 settings/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx            # Dashboard home
│   │   ├── 📁 api/                 # API routes (if needed)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── 📁 components/
│   │   ├── 📁 ui/                  # shadcn/ui components
│   │   ├── 📁 forms/               # Form components
│   │   ├── 📁 layout/              # Layout components
│   │   ├── 📁 workspace/           # Workspace components
│   │   ├── 📁 contacts/            # Contact components
│   │   ├── 📁 campaigns/           # Campaign components
│   │   ├── 📁 inbox/               # Inbox components
│   │   └── 📁 analytics/           # Analytics components
│   ├── 📁 lib/
│   │   ├── api.ts                  # API client
│   │   ├── auth.ts                 # Auth utilities
│   │   ├── utils.ts                # General utilities
│   │   └── socket.ts               # Socket.io client
│   ├── 📁 hooks/
│   │   ├── useAuth.ts
│   │   ├── useWorkspace.ts
│   │   └── useSocket.ts
│   ├── 📁 stores/                  # Zustand stores
│   │   ├── authStore.ts
│   │   └── workspaceStore.ts
│   ├── 📁 types/                   # TypeScript types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── forms.ts
│   ├── 📁 styles/
│   │   └── globals.css
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── 📁 backend/                     # NestJS Application
│   ├── 📁 src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── 📁 common/
│   │   │   ├── 📁 decorators/
│   │   │   ├── 📁 guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── roles.guard.ts
│   │   │   │   └── workspace.guard.ts
│   │   │   ├── 📁 interceptors/
│   │   │   ├── 📁 filters/
│   │   │   └── 📁 pipes/
│   │   ├── 📁 modules/
│   │   │   ├── 📁 auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── strategies/
│   │   │   │   └── dto/
│   │   │   ├── 📁 workspaces/
│   │   │   ├── 📁 facebook/
│   │   │   │   ├── facebook.module.ts
│   │   │   │   ├── facebook.controller.ts
│   │   │   │   ├── facebook.service.ts
│   │   │   │   ├── facebook-api.service.ts
│   │   │   │   └── dto/
│   │   │   ├── 📁 pages/
│   │   │   ├── 📁 contacts/
│   │   │   ├── 📁 segments/
│   │   │   ├── 📁 campaigns/
│   │   │   ├── 📁 messages/
│   │   │   │   ├── messages.module.ts
│   │   │   │   ├── messages.controller.ts
│   │   │   │   ├── messages.service.ts
│   │   │   │   ├── bulk-send.service.ts
│   │   │   │   ├── bypass/
│   │   │   │   │   ├── bypass.service.ts
│   │   │   │   │   ├── message-tags.service.ts
│   │   │   │   │   ├── otn.service.ts
│   │   │   │   │   └── recurring.service.ts
│   │   │   │   └── dto/
│   │   │   ├── 📁 inbox/
│   │   │   ├── 📁 webhooks/
│   │   │   ├── 📁 analytics/
│   │   │   ├── 📁 team/
│   │   │   ├── 📁 templates/
│   │   │   └── 📁 settings/
│   │   ├── 📁 jobs/
│   │   │   ├── jobs.module.ts
│   │   │   ├── 📁 processors/
│   │   │   │   ├── message.processor.ts
│   │   │   │   ├── campaign.processor.ts
│   │   │   │   └── sync.processor.ts
│   │   │   └── 📁 queues/
│   │   ├── 📁 websocket/
│   │   │   ├── websocket.module.ts
│   │   │   └── websocket.gateway.ts
│   │   └── 📁 prisma/
│   │       ├── prisma.module.ts
│   │       ├── prisma.service.ts
│   │       └── 📁 migrations/
│   ├── 📁 prisma/
│   │   └── schema.prisma
│   ├── 📁 test/
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── 📁 shared/                      # Shared types/utilities
│   ├── types/
│   └── constants/
│
├── 📁 docs/                        # Documentation
│   ├── SRS_Document.md
│   ├── Development_Plan.md
│   ├── API_Documentation.md
│   ├── User_Guide.md
│   └── Deployment_Guide.md
│
├── 📁 docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── nginx.conf
│
├── 📁 scripts/
│   ├── setup.sh
│   ├── deploy.sh
│   └── backup.sh
│
├── .env.example
├── .gitignore
├── README.md
└── package.json                    # Root package.json for monorepo
```

### 5.2 Environment Variables

```env
# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=development
APP_NAME=MessageSender
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# ===========================================
# DATABASE
# ===========================================
DATABASE_URL=postgresql://user:password@localhost:5432/messagesender
DATABASE_SSL=false

# ===========================================
# REDIS
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ===========================================
# JWT AUTHENTICATION
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d
JWT_REFRESH_REMEMBER_ME_EXPIRATION=30d

# ===========================================
# ENCRYPTION (for Facebook tokens)
# ===========================================
ENCRYPTION_KEY=your-32-character-encryption-key!!

# ===========================================
# FACEBOOK API
# ===========================================
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
FACEBOOK_API_VERSION=v18.0

# ===========================================
# EMAIL (SMTP)
# ===========================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_NAME=MessageSender
SMTP_FROM_EMAIL=noreply@example.com

# ===========================================
# FILE STORAGE
# ===========================================
STORAGE_TYPE=local
STORAGE_PATH=./uploads
# For S3 (optional)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
# AWS_S3_REGION=

# ===========================================
# MONITORING (Optional)
# ===========================================
SENTRY_DSN=
```

---

## 6. Module Breakdown & Task Lists

### 6.1 Authentication Module

**Backend Tasks:**
- [ ] Create `admin` table and Prisma model
- [ ] Create `users` table and Prisma model
- [ ] Create `sessions` table and Prisma model
- [ ] Create `login_attempts` table and Prisma model
- [ ] Implement bcrypt password hashing (cost factor 12)
- [ ] Implement JWT access token generation
- [ ] Implement JWT refresh token generation
- [ ] Implement token refresh endpoint
- [ ] Implement login rate limiting (5 attempts = 15 min lockout)
- [ ] Implement session management service
- [ ] Implement session termination endpoint
- [ ] Implement password change endpoint
- [ ] Implement password reset flow
- [ ] Create authentication guards
- [ ] Create role-based guards
- [ ] Implement login attempt logging

**Frontend Tasks:**
- [ ] Create login page
- [ ] Create password reset page
- [ ] Create session management page
- [ ] Implement auth state management (Zustand)
- [ ] Implement token storage (httpOnly cookies or secure storage)
- [ ] Implement automatic token refresh
- [ ] Implement protected route wrapper
- [ ] Create "Remember Me" checkbox functionality

### 6.2 Workspace Module

**Backend Tasks:**
- [ ] Create `workspaces` table and Prisma model
- [ ] Create `user_workspaces` junction table
- [ ] Implement workspace CRUD operations
- [ ] Implement workspace isolation middleware
- [ ] Implement workspace access control
- [ ] Implement workspace dashboard endpoint
- [ ] Implement workspace quick stats endpoint

**Frontend Tasks:**
- [ ] Create workspace selector component
- [ ] Create workspace dashboard page
- [ ] Create workspace settings page
- [ ] Implement workspace switching
- [ ] Create workspace configuration form
- [ ] Implement workspace color theming

### 6.3 Facebook Integration Module

**Backend Tasks:**
- [ ] Create `facebook_accounts` table and Prisma model
- [ ] Create `pages` table and Prisma model
- [ ] Implement Facebook OAuth flow
- [ ] Implement token encryption/decryption (AES-256)
- [ ] Implement long-lived token exchange
- [ ] Implement token refresh scheduler
- [ ] Implement page listing endpoint
- [ ] Implement page activation/deactivation
- [ ] Implement page sync job (15 min interval)
- [ ] Implement page health monitoring
- [ ] Implement webhook signature verification
- [ ] Implement webhook event handlers:
  - [ ] messages
  - [ ] messaging_postbacks
  - [ ] messaging_optins
  - [ ] messaging_optouts
  - [ ] message_deliveries
  - [ ] message_reads
  - [ ] messaging_referrals

**Frontend Tasks:**
- [ ] Create Facebook connection UI
- [ ] Create page selection interface
- [ ] Create page management dashboard
- [ ] Display page health status
- [ ] Create page sync status indicator
- [ ] Implement connection error handling UI

### 6.4 Contact Module

**Backend Tasks:**
- [ ] Create `contacts` table and Prisma model
- [ ] Create `tags` table and Prisma model
- [ ] Create `contact_tags` junction table
- [ ] Create `custom_field_definitions` table
- [ ] Implement contact auto-capture from webhooks
- [ ] Implement contact CRUD operations
- [ ] Implement contact search with filters
- [ ] Implement contact pagination
- [ ] Implement tag CRUD operations
- [ ] Implement custom fields management
- [ ] Implement engagement score calculation
- [ ] Implement contact import (CSV)
- [ ] Implement contact export (CSV/Excel)
- [ ] Implement 24-hour window status calculation

**Frontend Tasks:**
- [ ] Create contact list page with search/filter
- [ ] Create contact profile page
- [ ] Create contact edit form
- [ ] Create tag management interface
- [ ] Create custom fields configuration
- [ ] Create import/export interface
- [ ] Display 24-hour window status
- [ ] Display engagement level indicators

### 6.5 Segmentation Module

**Backend Tasks:**
- [ ] Create `segments` table and Prisma model
- [ ] Create `segment_members` table (for static segments)
- [ ] Implement segment CRUD operations
- [ ] Implement filter engine with support for:
  - [ ] Page filter
  - [ ] Date range filters
  - [ ] Tag filters (has/doesn't have)
  - [ ] Custom field filters
  - [ ] Engagement score filter
  - [ ] 24-hour window status filter
  - [ ] OTN token status filter
  - [ ] Recurring subscription status filter
  - [ ] Campaign status filter
  - [ ] Source filter
- [ ] Implement AND/OR/NOT logic
- [ ] Implement nested conditions (groups)
- [ ] Implement dynamic segment calculation
- [ ] Implement segment contact count
- [ ] Implement segment preview
- [ ] Implement segment duplication

**Frontend Tasks:**
- [ ] Create segment builder UI
- [ ] Create filter condition components
- [ ] Create condition group components
- [ ] Create logic selector (AND/OR)
- [ ] Create segment preview panel
- [ ] Create segment list page
- [ ] Implement drag-and-drop condition ordering

### 6.6 Messaging Module ⚠️ CRITICAL

**Backend Tasks:**
- [ ] Create `messages` table and Prisma model
- [ ] Implement Facebook Send API integration
- [ ] Implement message types:
  - [ ] Text messages
  - [ ] Image attachments
  - [ ] Video attachments
  - [ ] File attachments
  - [ ] Button templates
  - [ ] Quick reply templates
  - [ ] Generic templates (cards)
- [ ] Implement personalization engine
- [ ] Implement attachment upload and caching
- [ ] Implement BullMQ job queue
- [ ] Implement message worker
- [ ] Implement rate limiting (200/hour/page)
- [ ] Implement multi-page load distribution
- [ ] Implement retry mechanism (3 attempts)
- [ ] Implement exponential backoff
- [ ] Implement delivery status tracking
- [ ] Implement bulk send endpoint
- [ ] Implement send progress WebSocket updates

**Frontend Tasks:**
- [ ] Create message composer component
- [ ] Create attachment upload component
- [ ] Create personalization token picker
- [ ] Create template selector
- [ ] Create message preview
- [ ] Create recipient selection interface
- [ ] Create bypass method selector
- [ ] Create send progress indicator
- [ ] Create bulk send status page

### 6.7 24-Hour Bypass Module ⚠️ MOST CRITICAL

**Backend Tasks:**
- [ ] Create `otn_tokens` table and Prisma model
- [ ] Create `recurring_subscriptions` table and Prisma model
- [ ] Create `message_tag_usage` table and Prisma model
- [ ] Implement 24-hour window tracking service
- [ ] **Message Tags Implementation:**
  - [ ] CONFIRMED_EVENT_UPDATE
  - [ ] POST_PURCHASE_UPDATE
  - [ ] ACCOUNT_UPDATE
  - [ ] HUMAN_AGENT
- [ ] **OTN Implementation:**
  - [ ] OTN request generation
  - [ ] OTN opt-in webhook handling
  - [ ] OTN token storage
  - [ ] OTN token usage (single-use)
  - [ ] OTN status tracking
- [ ] **Recurring Notifications Implementation:**
  - [ ] Subscription opt-in request
  - [ ] Subscription webhook handling
  - [ ] Token storage with frequency
  - [ ] Token expiration tracking
  - [ ] Send with recurring token
  - [ ] Frequency limit enforcement
  - [ ] Opt-out handling
  - [ ] Re-request before expiration
- [ ] Implement bypass method auto-selection
- [ ] Implement compliance monitoring
- [ ] Implement tag usage frequency tracking
- [ ] Implement cool-down period enforcement
- [ ] Implement compliance audit reporting

**Frontend Tasks:**
- [ ] Create 24-hour status indicator component
- [ ] Create message tag selector with warnings
- [ ] Create OTN request interface
- [ ] Create OTN status display
- [ ] Create recurring subscription management UI
- [ ] Create bypass method selection in composer
- [ ] Create compliance warning modals
- [ ] Create bypass availability indicator per contact

### 6.8 Campaign Module

**Backend Tasks:**
- [ ] Create `campaigns` table and Prisma model
- [ ] Create `campaign_logs` table and Prisma model
- [ ] Create `drip_progress` table and Prisma model
- [ ] Implement campaign types:
  - [ ] One-time
  - [ ] Scheduled
  - [ ] Recurring
  - [ ] Drip
  - [ ] Trigger-based
- [ ] Implement campaign CRUD operations
- [ ] Implement campaign execution engine
- [ ] Implement scheduled campaign job
- [ ] Implement drip sequence processor
- [ ] Implement A/B testing:
  - [ ] Variant creation
  - [ ] Audience splitting
  - [ ] Variant performance tracking
  - [ ] Winner determination
  - [ ] Auto-send winner
- [ ] Implement campaign state management
- [ ] Implement pause/resume functionality
- [ ] Implement cancellation
- [ ] Implement campaign duplication
- [ ] Implement campaign archiving

**Frontend Tasks:**
- [ ] Create campaign list page
- [ ] Create campaign wizard (multi-step form)
- [ ] Create audience selection step
- [ ] Create message configuration step
- [ ] Create bypass method step
- [ ] Create schedule configuration step
- [ ] Create review/preview step
- [ ] Create drip sequence builder (visual)
- [ ] Create A/B test configuration
- [ ] Create campaign detail/stats page
- [ ] Create campaign calendar view
- [ ] Implement campaign controls (pause, resume, cancel)

### 6.9 Inbox Module

**Backend Tasks:**
- [ ] Create `conversations` table and Prisma model
- [ ] Create `conversation_notes` table and Prisma model
- [ ] Implement conversation aggregation
- [ ] Implement conversation CRUD operations
- [ ] Implement real-time message reception
- [ ] Implement WebSocket gateway for inbox
- [ ] Implement reply functionality with bypass support
- [ ] Implement conversation assignment
- [ ] Implement conversation labels
- [ ] Implement conversation status management
- [ ] Implement search within conversations
- [ ] Implement unread count tracking

**Frontend Tasks:**
- [ ] Create inbox layout (list + conversation view)
- [ ] Create conversation list component
- [ ] Create conversation thread component
- [ ] Create reply composer
- [ ] Implement real-time message updates
- [ ] Create conversation management panel
- [ ] Create canned responses interface
- [ ] Create 24-hour warning in reply composer
- [ ] Implement keyboard shortcuts

### 6.10 Analytics Module

**Backend Tasks:**
- [ ] Implement dashboard metrics calculation:
  - [ ] Total contacts
  - [ ] New contacts (period)
  - [ ] Messages sent/received
  - [ ] Delivery rate
  - [ ] Response rate
  - [ ] Active conversations
- [ ] Implement time-series data aggregation
- [ ] Implement period comparison
- [ ] Implement campaign analytics
- [ ] Implement contact analytics
- [ ] Implement page analytics
- [ ] Implement report generation (PDF, CSV, Excel)
- [ ] Implement scheduled report delivery

**Frontend Tasks:**
- [ ] Create analytics dashboard page
- [ ] Create metric cards
- [ ] Create time-series charts
- [ ] Create comparison indicators
- [ ] Create campaign analytics page
- [ ] Create contact analytics page
- [ ] Create page analytics page
- [ ] Create report configuration interface
- [ ] Implement date range picker

### 6.11 Team Module

**Backend Tasks:**
- [ ] Implement team member invitation
- [ ] Implement invitation email sending
- [ ] Implement first-login setup
- [ ] Implement team member CRUD
- [ ] Implement workspace assignment
- [ ] Implement permission levels (view_only, operator, manager)
- [ ] Implement activity logging
- [ ] Implement activity log query endpoint

**Frontend Tasks:**
- [ ] Create team management page
- [ ] Create invitation form
- [ ] Create team member edit form
- [ ] Create workspace assignment interface
- [ ] Create permission level selector
- [ ] Create activity log viewer
- [ ] Create activity filters

### 6.12 Templates Module

**Backend Tasks:**
- [ ] Create `message_templates` table and Prisma model
- [ ] Implement template CRUD operations
- [ ] Implement canned responses
- [ ] Implement template categories
- [ ] Implement template usage tracking

**Frontend Tasks:**
- [ ] Create template management page
- [ ] Create template editor
- [ ] Create template category management
- [ ] Create template picker in composer
- [ ] Create canned response quick access

### 6.13 Settings Module

**Backend Tasks:**
- [ ] Create `settings` table and Prisma model
- [ ] Implement general settings
- [ ] Implement email settings
- [ ] Implement notification preferences
- [ ] Implement manual backup trigger
- [ ] Implement backup download
- [ ] Implement system health check

**Frontend Tasks:**
- [ ] Create settings page layout
- [ ] Create general settings form
- [ ] Create email configuration form
- [ ] Create notification preferences form
- [ ] Create backup management interface
- [ ] Create system health status page

---

## 7. Database Implementation Plan

### 7.1 Migration Strategy

```
Migration Order:
1. Core tables (admin, users, sessions, settings)
2. Workspace tables (workspaces, user_workspaces)
3. Facebook tables (facebook_accounts, pages)
4. Contact tables (contacts, tags, contact_tags, custom_field_definitions)
5. Bypass tables (otn_tokens, recurring_subscriptions, message_tag_usage)
6. Segment tables (segments, segment_members)
7. Campaign tables (campaigns, campaign_logs, drip_progress)
8. Message tables (conversations, messages, conversation_notes)
9. Template tables (message_templates, attachments)
10. Activity tables (activity_logs, job_queue, login_attempts)
```

### 7.2 Index Strategy

```sql
-- Critical indexes for performance (as defined in SRS)
-- Users & Auth
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Contacts (high volume)
CREATE INDEX idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX idx_contacts_page ON contacts(page_id);
CREATE INDEX idx_contacts_psid ON contacts(psid);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction_at);

-- Messages (high volume)
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_fb_id ON messages(fb_message_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- Campaigns
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at);
```

### 7.3 Data Seeding

```typescript
// Seed data requirements
const seedData = {
  admin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'SecurePassword123!' // Will be hashed
  },
  workspaces: [
    { name: 'Business 1', color_theme: '#3B82F6' },
    { name: 'Business 2', color_theme: '#10B981' },
    { name: 'Business 3', color_theme: '#F59E0B' },
    { name: 'Business 4', color_theme: '#EF4444' },
    { name: 'Business 5', color_theme: '#8B5CF6' }
  ],
  settings: {
    app_name: 'MessageSender',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD'
  }
};
```

---

## 8. API Development Specifications

### 8.1 API Standards

| Standard | Implementation |
|----------|---------------|
| Protocol | REST |
| Format | JSON |
| Versioning | URL path (/api/v1/) |
| Authentication | Bearer JWT tokens |
| Error Format | { error: string, message: string, statusCode: number } |
| Pagination | cursor-based or offset-based |
| Rate Limiting | 100 requests/minute |

### 8.2 Core API Endpoints

#### Authentication Endpoints
```
POST   /api/v1/auth/login           # Admin/Team login
POST   /api/v1/auth/logout          # Logout (invalidate session)
POST   /api/v1/auth/refresh         # Refresh access token
POST   /api/v1/auth/password/change # Change password
POST   /api/v1/auth/password/reset  # Request password reset
POST   /api/v1/auth/password/confirm # Confirm password reset
GET    /api/v1/auth/sessions        # List active sessions
DELETE /api/v1/auth/sessions/:id    # Terminate session
```

#### Workspace Endpoints
```
GET    /api/v1/workspaces                    # List all workspaces
GET    /api/v1/workspaces/:id                # Get workspace details
PUT    /api/v1/workspaces/:id                # Update workspace
GET    /api/v1/workspaces/:id/dashboard      # Workspace dashboard stats
```

#### Facebook Endpoints
```
GET    /api/v1/workspaces/:id/facebook/auth-url      # Get OAuth URL
POST   /api/v1/workspaces/:id/facebook/callback      # OAuth callback
DELETE /api/v1/workspaces/:id/facebook/disconnect    # Disconnect FB account
GET    /api/v1/workspaces/:id/facebook/status        # Connection status
```

#### Page Endpoints
```
GET    /api/v1/workspaces/:id/pages                  # List pages
POST   /api/v1/workspaces/:id/pages/:pageId/activate # Activate page
POST   /api/v1/workspaces/:id/pages/:pageId/deactivate # Deactivate page
POST   /api/v1/workspaces/:id/pages/sync             # Force sync
GET    /api/v1/workspaces/:id/pages/:pageId/stats    # Page stats
```

#### Contact Endpoints
```
GET    /api/v1/workspaces/:id/contacts               # List contacts
GET    /api/v1/workspaces/:id/contacts/:contactId    # Get contact details
PUT    /api/v1/workspaces/:id/contacts/:contactId    # Update contact
DELETE /api/v1/workspaces/:id/contacts/:contactId    # Delete contact
GET    /api/v1/workspaces/:id/contacts/:contactId/bypass-status # Bypass status
POST   /api/v1/workspaces/:id/contacts/import        # Import contacts
GET    /api/v1/workspaces/:id/contacts/export        # Export contacts
```

#### Tag Endpoints
```
GET    /api/v1/workspaces/:id/tags                   # List tags
POST   /api/v1/workspaces/:id/tags                   # Create tag
PUT    /api/v1/workspaces/:id/tags/:tagId            # Update tag
DELETE /api/v1/workspaces/:id/tags/:tagId            # Delete tag
POST   /api/v1/workspaces/:id/contacts/:contactId/tags # Add tags to contact
DELETE /api/v1/workspaces/:id/contacts/:contactId/tags/:tagId # Remove tag
```

#### Segment Endpoints
```
GET    /api/v1/workspaces/:id/segments               # List segments
POST   /api/v1/workspaces/:id/segments               # Create segment
GET    /api/v1/workspaces/:id/segments/:segmentId    # Get segment
PUT    /api/v1/workspaces/:id/segments/:segmentId    # Update segment
DELETE /api/v1/workspaces/:id/segments/:segmentId    # Delete segment
GET    /api/v1/workspaces/:id/segments/:segmentId/preview # Preview contacts
POST   /api/v1/workspaces/:id/segments/:segmentId/duplicate # Duplicate
```

#### Messaging Endpoints
```
POST   /api/v1/workspaces/:id/messages/send          # Send single message
POST   /api/v1/workspaces/:id/messages/send-bulk     # Send bulk messages
GET    /api/v1/workspaces/:id/messages/status/:jobId # Get send status
POST   /api/v1/workspaces/:id/messages/cancel/:jobId # Cancel queued messages
```

#### Bypass Endpoints
```
POST   /api/v1/workspaces/:id/bypass/otn/request     # Request OTN
GET    /api/v1/workspaces/:id/bypass/otn/tokens      # List OTN tokens
POST   /api/v1/workspaces/:id/bypass/recurring/request # Request recurring
GET    /api/v1/workspaces/:id/bypass/recurring/subscriptions # List subscriptions
GET    /api/v1/workspaces/:id/bypass/status/:contactId # Contact bypass status
```

#### Campaign Endpoints
```
GET    /api/v1/workspaces/:id/campaigns              # List campaigns
POST   /api/v1/workspaces/:id/campaigns              # Create campaign
GET    /api/v1/workspaces/:id/campaigns/:campaignId  # Get campaign
PUT    /api/v1/workspaces/:id/campaigns/:campaignId  # Update campaign
DELETE /api/v1/workspaces/:id/campaigns/:campaignId  # Delete campaign
POST   /api/v1/workspaces/:id/campaigns/:campaignId/send # Execute campaign
POST   /api/v1/workspaces/:id/campaigns/:campaignId/pause # Pause campaign
POST   /api/v1/workspaces/:id/campaigns/:campaignId/resume # Resume campaign
POST   /api/v1/workspaces/:id/campaigns/:campaignId/cancel # Cancel campaign
POST   /api/v1/workspaces/:id/campaigns/:campaignId/duplicate # Duplicate
GET    /api/v1/workspaces/:id/campaigns/:campaignId/stats # Campaign stats
```

#### Inbox Endpoints
```
GET    /api/v1/workspaces/:id/inbox/conversations    # List conversations
GET    /api/v1/workspaces/:id/inbox/conversations/:conversationId # Get conversation
POST   /api/v1/workspaces/:id/inbox/conversations/:conversationId/reply # Reply
PUT    /api/v1/workspaces/:id/inbox/conversations/:conversationId # Update status
POST   /api/v1/workspaces/:id/inbox/conversations/:conversationId/assign # Assign
```

#### Analytics Endpoints
```
GET    /api/v1/workspaces/:id/analytics/dashboard    # Dashboard stats
GET    /api/v1/workspaces/:id/analytics/campaigns    # Campaign analytics
GET    /api/v1/workspaces/:id/analytics/contacts     # Contact analytics
GET    /api/v1/workspaces/:id/analytics/pages        # Page analytics
POST   /api/v1/workspaces/:id/analytics/reports      # Generate report
```

#### Webhook Endpoints
```
GET    /api/v1/webhooks/facebook                     # Facebook verification
POST   /api/v1/webhooks/facebook                     # Facebook events
```

#### Team Endpoints
```
GET    /api/v1/team                                  # List team members
POST   /api/v1/team/invite                           # Invite team member
GET    /api/v1/team/:userId                          # Get team member
PUT    /api/v1/team/:userId                          # Update team member
DELETE /api/v1/team/:userId                          # Delete team member
POST   /api/v1/team/:userId/workspaces               # Assign workspaces
```

#### Template Endpoints
```
GET    /api/v1/workspaces/:id/templates              # List templates
POST   /api/v1/workspaces/:id/templates              # Create template
PUT    /api/v1/workspaces/:id/templates/:templateId  # Update template
DELETE /api/v1/workspaces/:id/templates/:templateId  # Delete template
```

#### Settings Endpoints
```
GET    /api/v1/settings                              # Get settings
PUT    /api/v1/settings                              # Update settings
POST   /api/v1/settings/backup                       # Trigger backup
GET    /api/v1/settings/backup                       # List backups
GET    /api/v1/settings/backup/:backupId             # Download backup
GET    /api/v1/settings/health                       # System health
```

---

## 9. Frontend Implementation Guide

### 9.1 Component Architecture

```
Component Hierarchy:
├── Layout Components
│   ├── RootLayout (app/layout.tsx)
│   ├── DashboardLayout (sidebar, header, workspace selector)
│   ├── AuthLayout (centered card layout)
│   └── WorkspaceLayout (workspace-specific layout)
│
├── Page Components
│   ├── LoginPage
│   ├── DashboardPage
│   ├── WorkspaceDashboardPage
│   ├── ContactsPage
│   ├── SegmentsPage
│   ├── CampaignsPage
│   ├── InboxPage
│   ├── AnalyticsPage
│   ├── TeamPage
│   └── SettingsPage
│
├── Feature Components
│   ├── Contacts/
│   │   ├── ContactList
│   │   ├── ContactProfile
│   │   ├── ContactForm
│   │   └── ImportExportDialog
│   ├── Segments/
│   │   ├── SegmentList
│   │   ├── SegmentBuilder
│   │   ├── FilterCondition
│   │   └── ConditionGroup
│   ├── Campaigns/
│   │   ├── CampaignList
│   │   ├── CampaignWizard
│   │   ├── DripSequenceBuilder
│   │   └── ABTestConfig
│   ├── Messaging/
│   │   ├── MessageComposer
│   │   ├── PersonalizationPicker
│   │   ├── BypassMethodSelector
│   │   └── SendProgressIndicator
│   ├── Inbox/
│   │   ├── ConversationList
│   │   ├── ConversationThread
│   │   ├── ReplyComposer
│   │   └── ConversationPanel
│   └── Analytics/
│       ├── MetricCard
│       ├── TimeSeriesChart
│       └── ComparisonIndicator
│
└── UI Components (shadcn/ui)
    ├── Button, Input, Select, Checkbox
    ├── Dialog, Sheet, Popover
    ├── Table, DataTable
    ├── Tabs, Card, Badge
    ├── Toast, Alert
    └── Form components
```

### 9.2 State Management

```typescript
// Zustand Stores

// Auth Store
interface AuthStore {
  user: Admin | User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Workspace Store
interface WorkspaceStore {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchWorkspaces: () => Promise<void>;
}

// Inbox Store (for real-time)
interface InboxStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  unreadCount: number;
  addMessage: (message: Message) => void;
  updateConversation: (conversation: Conversation) => void;
}
```

### 9.3 Key UI/UX Requirements

| Requirement | Implementation |
|-------------|----------------|
| Loading States | Skeleton loaders for all data fetching |
| Error Handling | Toast notifications + error boundaries |
| Empty States | Helpful illustrations with CTAs |
| Responsive | Mobile-first with breakpoints (sm, md, lg, xl) |
| Accessibility | WCAG 2.1 AA compliance |
| Dark Mode | System preference + manual toggle |
| Keyboard Navigation | Full support for power users |

---

## 10. 24-Hour Bypass System Implementation

### 10.1 Bypass Decision Flow

```typescript
// Bypass Service Implementation
interface BypassDecisionResult {
  canSend: boolean;
  method: BypassMethod;
  details: string;
  warning?: string;
}

enum BypassMethod {
  WITHIN_WINDOW = 'within_window',
  OTN_TOKEN = 'otn_token',
  RECURRING_NOTIFICATION = 'recurring_notification',
  MESSAGE_TAG_CONFIRMED_EVENT = 'message_tag_confirmed_event',
  MESSAGE_TAG_POST_PURCHASE = 'message_tag_post_purchase',
  MESSAGE_TAG_ACCOUNT_UPDATE = 'message_tag_account_update',
  MESSAGE_TAG_HUMAN_AGENT = 'message_tag_human_agent',
  SPONSORED_MESSAGE = 'sponsored_message',
  BLOCKED = 'blocked'
}

async function determineBypassMethod(
  contactId: string,
  pageId: string
): Promise<BypassDecisionResult> {
  // 1. Check 24-hour window
  const isWithinWindow = await check24HourWindow(contactId, pageId);
  if (isWithinWindow) {
    return {
      canSend: true,
      method: BypassMethod.WITHIN_WINDOW,
      details: 'Contact is within 24-hour messaging window'
    };
  }

  // 2. Check OTN token availability
  const otnToken = await getValidOTNToken(contactId, pageId);
  if (otnToken) {
    return {
      canSend: true,
      method: BypassMethod.OTN_TOKEN,
      details: 'Valid OTN token available (single-use)'
    };
  }

  // 3. Check recurring notification subscription
  const recurring = await getActiveRecurringSubscription(contactId, pageId);
  if (recurring && canSendRecurring(recurring)) {
    return {
      canSend: true,
      method: BypassMethod.RECURRING_NOTIFICATION,
      details: `Active ${recurring.frequency} subscription`
    };
  }

  // 4. Message tags available (admin must select appropriate one)
  return {
    canSend: true,
    method: BypassMethod.MESSAGE_TAG_ACCOUNT_UPDATE, // Default suggestion
    details: 'Message tags available - select appropriate tag',
    warning: 'Message tags must only be used for their intended purpose'
  };
}
```

### 10.2 Message Tag Implementation

```typescript
// Message Tag Service
const MESSAGE_TAG_CONFIG = {
  CONFIRMED_EVENT_UPDATE: {
    allowedContent: ['Event reminders', 'Schedule changes', 'Location changes'],
    complianceWarning: 'Only for events the user has registered for'
  },
  POST_PURCHASE_UPDATE: {
    allowedContent: ['Order confirmation', 'Shipping updates', 'Receipt'],
    complianceWarning: 'Only for purchases the user has made'
  },
  ACCOUNT_UPDATE: {
    allowedContent: ['Payment issues', 'Account status', 'Security alerts'],
    complianceWarning: 'Only for non-promotional account updates'
  },
  HUMAN_AGENT: {
    allowedContent: ['Customer support responses', 'Issue resolution'],
    complianceWarning: 'Only within 7 days of user message, no automation'
  }
};

async function sendWithMessageTag(
  contactId: string,
  pageId: string,
  messageContent: MessageContent,
  tag: MessageTagType
): Promise<SendResult> {
  // Log tag usage for compliance
  await logTagUsage(contactId, pageId, tag);
  
  // Send via Facebook API
  return await facebookApi.sendMessage({
    recipient: { id: contact.psid },
    message: messageContent,
    messaging_type: 'MESSAGE_TAG',
    tag: tag
  });
}
```

### 10.3 OTN Implementation

```typescript
// OTN Service
async function requestOTN(
  contactId: string,
  pageId: string,
  title: string,
  payload?: string
): Promise<void> {
  const template = {
    template_type: 'one_time_notif_req',
    title: title,
    payload: payload || 'OTN_REQUEST'
  };
  
  await facebookApi.sendTemplate(contactId, pageId, template);
  
  // Store pending request
  await prisma.otnTokens.create({
    data: {
      contactId,
      pageId,
      title,
      payload,
      requestedAt: new Date()
    }
  });
}

async function handleOTNOptIn(webhookEvent: WebhookEvent): Promise<void> {
  const { one_time_notif_token, payload } = webhookEvent.optin;
  const contactPsid = webhookEvent.sender.id;
  const pageId = webhookEvent.recipient.id;
  
  // Find contact
  const contact = await prisma.contacts.findFirst({
    where: { psid: contactPsid, page: { fbPageId: pageId } }
  });
  
  // Store token
  await prisma.otnTokens.create({
    data: {
      contactId: contact.id,
      pageId: contact.pageId,
      token: one_time_notif_token,
      payload,
      isUsed: false,
      optedInAt: new Date()
    }
  });
}

async function sendWithOTN(
  contactId: string,
  pageId: string,
  messageContent: MessageContent
): Promise<SendResult> {
  const token = await prisma.otnTokens.findFirst({
    where: { contactId, pageId, isUsed: false }
  });
  
  if (!token) throw new Error('No valid OTN token');
  
  const result = await facebookApi.sendMessage({
    recipient: { one_time_notif_token: token.token },
    message: messageContent
  });
  
  // Mark as used (single-use)
  await prisma.otnTokens.update({
    where: { id: token.id },
    data: { isUsed: true, usedAt: new Date() }
  });
  
  return result;
}
```

### 10.4 Recurring Notifications Implementation

```typescript
// Recurring Notifications Service
async function requestRecurringSubscription(
  contactId: string,
  pageId: string,
  topic: string,
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
): Promise<void> {
  const template = {
    template_type: 'notification_messages',
    title: topic,
    image_url: 'optional-image-url',
    payload: `RECURRING_${frequency}_${topic}`,
    notification_messages_frequency: frequency
  };
  
  await facebookApi.sendTemplate(contactId, pageId, template);
}

async function handleRecurringOptIn(webhookEvent: WebhookEvent): Promise<void> {
  const { notification_messages_token, notification_messages_frequency } = webhookEvent.optin;
  
  await prisma.recurringSubscriptions.create({
    data: {
      contactId: contact.id,
      pageId: contact.pageId,
      token: notification_messages_token,
      frequency: notification_messages_frequency,
      isActive: true,
      optedInAt: new Date(),
      expiresAt: calculateExpiration(notification_messages_frequency)
    }
  });
}

function canSendRecurring(subscription: RecurringSubscription): boolean {
  const now = new Date();
  
  // Check if expired
  if (subscription.expiresAt < now) return false;
  
  // Check frequency limits
  const lastSent = subscription.lastSentAt;
  if (!lastSent) return true;
  
  const timeSinceLastSent = now.getTime() - lastSent.getTime();
  const limits = {
    DAILY: 24 * 60 * 60 * 1000,
    WEEKLY: 7 * 24 * 60 * 60 * 1000,
    MONTHLY: 30 * 24 * 60 * 60 * 1000
  };
  
  return timeSinceLastSent >= limits[subscription.frequency];
}
```

---

## 11. Testing Strategy

### 11.1 Test Coverage Requirements

| Test Type | Coverage Target | Tools |
|-----------|-----------------|-------|
| Unit Tests (Backend) | > 80% | Jest |
| Unit Tests (Frontend) | > 70% | Jest + React Testing Library |
| Integration Tests | Critical paths | Supertest |
| E2E Tests | Critical user flows | Playwright |
| Performance Tests | Key operations | k6 or Artillery |

### 11.2 Test Categories

#### Backend Unit Tests
```
tests/
├── auth/
│   ├── auth.service.spec.ts
│   ├── jwt.strategy.spec.ts
│   └── password.service.spec.ts
├── contacts/
│   ├── contacts.service.spec.ts
│   └── engagement.service.spec.ts
├── messages/
│   ├── messages.service.spec.ts
│   ├── bulk-send.service.spec.ts
│   └── bypass/
│       ├── bypass.service.spec.ts
│       ├── otn.service.spec.ts
│       └── recurring.service.spec.ts
├── campaigns/
│   ├── campaigns.service.spec.ts
│   └── campaign-executor.spec.ts
└── segments/
    ├── segments.service.spec.ts
    └── filter-engine.spec.ts
```

#### E2E Test Scenarios
```
Critical User Flows:
1. Admin Login → Dashboard → Workspace Selection
2. Connect Facebook Account → Select Pages → Sync
3. View Contacts → Apply Filters → Export
4. Create Segment → Add Conditions → Preview → Save
5. Create Campaign → Select Audience → Compose Message → Select Bypass → Schedule → Send
6. Receive Message → View in Inbox → Reply with Bypass
7. View Analytics → Export Report
8. Invite Team Member → Assign Workspace → Team Member Login
```

### 11.3 Test Data Requirements

```typescript
// Test fixtures
const testFixtures = {
  admin: {
    username: 'testadmin',
    email: 'admin@test.com',
    password: 'TestPassword123!'
  },
  workspace: {
    name: 'Test Business',
    color_theme: '#3B82F6'
  },
  contact: {
    psid: 'test_psid_123',
    first_name: 'John',
    last_name: 'Doe'
  },
  // Mock Facebook API responses
  facebookMocks: {
    userPages: [...],
    sendMessageSuccess: {...},
    webhookMessage: {...}
  }
};
```

---

## 12. Security Implementation Checklist

### 12.1 Authentication Security

- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] Minimum password requirements enforced (8 chars, uppercase, number)
- [ ] JWT RS256 or HS256 signing
- [ ] Access token 1-hour expiry
- [ ] Refresh token 7-day expiry (30 days with Remember Me)
- [ ] Token rotation on refresh
- [ ] Rate limiting on login (5 attempts = 15 min lockout)
- [ ] Session invalidation on password change
- [ ] Secure cookie settings (httpOnly, secure, sameSite)

### 12.2 Data Security

- [ ] HTTPS/TLS 1.2+ enforced
- [ ] Facebook tokens encrypted with AES-256
- [ ] OTN/Recurring tokens encrypted
- [ ] Database connections use SSL
- [ ] No sensitive data in logs
- [ ] Encrypted database backups
- [ ] Secure environment variable handling

### 12.3 API Security

- [ ] Rate limiting (100 requests/minute)
- [ ] Helmet.js security headers
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention
- [ ] CSRF protection

### 12.4 Webhook Security

- [ ] HMAC-SHA256 signature verification
- [ ] Timing-safe comparison for signatures
- [ ] Request body validation
- [ ] Webhook secret rotation capability

### 12.5 Infrastructure Security

- [ ] Firewall configuration (UFW)
- [ ] SSH key authentication only
- [ ] Fail2ban for brute force protection
- [ ] Regular security updates
- [ ] Minimal exposed ports (80, 443 only)

---

## 13. Deployment Strategy

### 13.1 Infrastructure Setup

```bash
# VPS Setup Script (Ubuntu 22.04)

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
sudo apt install -y postgresql-15

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Docker
sudo apt install -y docker.io docker-compose

# Install PM2
sudo npm install -g pm2

# Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 13.2 Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: messagesender
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: messagesender
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://messagesender:${DB_PASSWORD}@postgres:5432/messagesender
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: always

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://messagesender:${DB_PASSWORD}@postgres:5432/messagesender
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - API_URL=http://backend:4000
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - frontend
      - backend
    restart: always

volumes:
  postgres_data:
```

### 13.3 Nginx Configuration

```nginx
# nginx.conf
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:4000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Webhooks
    location /api/webhooks {
        proxy_pass http://backend;
        proxy_http_version 1.1;
    }
}
```

### 13.4 Deployment Checklist

#### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates ready
- [ ] Domain DNS configured
- [ ] Facebook App URLs configured

#### Deployment Steps
- [ ] VPS provisioned and secured
- [ ] Docker and dependencies installed
- [ ] Clone repository to server
- [ ] Configure environment variables
- [ ] Build Docker images
- [ ] Run database migrations
- [ ] Seed initial data (admin, workspaces)
- [ ] Start all containers
- [ ] Configure Nginx with SSL
- [ ] Test all endpoints
- [ ] Configure Facebook webhooks
- [ ] Set up monitoring
- [ ] Configure backups

#### Post-Deployment
- [ ] Verify all services running
- [ ] Test Facebook OAuth flow
- [ ] Test webhook reception
- [ ] Test bulk messaging
- [ ] Monitor error logs
- [ ] Document admin credentials
- [ ] Client handover training

---

## 14. Documentation Requirements

### 14.1 Technical Documentation

| Document | Contents | Audience |
|----------|----------|----------|
| README.md | Project overview, quick start | All |
| API_Documentation.md | Full API reference (Swagger) | Developers |
| Database_Schema.md | ERD, table descriptions | Developers |
| Architecture.md | System design, diagrams | Developers |
| Security.md | Security implementation details | Developers/Admin |

### 14.2 User Documentation

| Document | Contents | Audience |
|----------|----------|----------|
| User_Guide.md | Complete user manual | Admin/Team |
| Quick_Start.md | Getting started guide | Admin |
| FAQ.md | Common questions/issues | Admin/Team |
| Troubleshooting.md | Issue resolution guide | Admin |

### 14.3 Operational Documentation

| Document | Contents | Audience |
|----------|----------|----------|
| Deployment_Guide.md | Full deployment instructions | Developer |
| Maintenance.md | Routine maintenance tasks | Developer/Admin |
| Backup_Recovery.md | Backup/restore procedures | Developer/Admin |
| Monitoring.md | Monitoring setup and alerts | Developer |

### 14.4 Documentation Templates

Each module should have:
```markdown
# Module Name

## Overview
Brief description of the module's purpose.

## Features
- Feature 1
- Feature 2

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/... | ... |

## Database Tables
- table_name: Description

## Configuration
Required environment variables and settings.

## Usage Examples
Code examples and screenshots.

## Troubleshooting
Common issues and solutions.
```

---

## 15. Risk Management

### 15.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Facebook API changes | High | Medium | Version locking, monitoring FB changelog |
| API rate limiting exceeded | High | Medium | Robust rate limiting, distributed queue |
| Token encryption key compromise | Critical | Low | Key rotation, secure storage |
| Database performance issues | Medium | Medium | Indexing, query optimization |
| Webhook failures | High | Medium | Retry mechanism, error logging |

### 15.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Facebook App rejection | Critical | Medium | Follow policies strictly, proper documentation |
| Policy violation (message tags) | High | Medium | Compliance warnings, usage tracking |
| Data loss | Critical | Low | Regular backups, replication |
| Downtime during campaigns | High | Medium | Health monitoring, alerting |

### 15.3 Risk Response Plan

```
CRITICAL RISK RESPONSE:
1. Immediate notification to admin
2. Automatic pause of affected operations
3. Detailed error logging
4. Fallback mechanisms where possible
5. Post-incident analysis and fix
```

---

## 16. Milestones & Deliverables

### 16.1 Project Milestones

| Milestone | Week | Deliverables |
|-----------|------|--------------|
| M1: Foundation Complete | 3 | Auth system, database, team management |
| M2: Facebook Integration Complete | 6 | OAuth, page connection, webhooks |
| M3: Messaging Engine Complete | 9 | All bypass methods, bulk messaging |
| M4: Campaigns Complete | 12 | All campaign types, A/B testing |
| M5: Full Features Complete | 15 | Inbox, analytics, team, settings |
| M6: Testing Complete | 17 | All tests passing, bugs fixed |
| M7: Production Launch | 18 | Live deployment, client handover |

### 16.2 Acceptance Criteria

#### M1: Foundation Complete
- [ ] Admin can login with username/password
- [ ] Team members can login with credentials
- [ ] JWT authentication working
- [ ] Rate limiting active
- [ ] 5 workspaces created
- [ ] Workspace isolation working

#### M2: Facebook Integration Complete
- [ ] Facebook OAuth flow working
- [ ] Long-lived tokens stored securely
- [ ] All pages can be connected
- [ ] Webhooks receiving all event types
- [ ] Page sync job running

#### M3: Messaging Engine Complete ⚠️ CRITICAL
- [ ] Single message sending works
- [ ] All attachment types supported
- [ ] Personalization working
- [ ] **Message Tags (ALL 4) working**
- [ ] **OTN system complete**
- [ ] **Recurring Notifications working**
- [ ] Bulk messaging with rate limiting
- [ ] Progress tracking real-time

#### M4: Campaigns Complete
- [ ] All campaign types working
- [ ] Campaign wizard functional
- [ ] Drip campaigns executing
- [ ] A/B testing working
- [ ] Segment builder functional

#### M5: Full Features Complete
- [ ] Unified inbox with real-time
- [ ] Analytics dashboard complete
- [ ] Team management working
- [ ] All settings functional
- [ ] Backup system operational

#### M6: Testing Complete
- [ ] Unit test coverage > 80%
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] All bugs resolved

#### M7: Production Launch
- [ ] Production server stable
- [ ] All services operational
- [ ] Monitoring active
- [ ] Documentation complete
- [ ] Client trained

---

## 17. Quality Assurance Checklist

### 17.1 Code Quality

- [ ] TypeScript strict mode enabled
- [ ] No TypeScript `any` types (except justified cases)
- [ ] ESLint passing with no errors
- [ ] Prettier formatting applied
- [ ] No console.log in production code
- [ ] Error handling in all async operations
- [ ] Proper logging with levels

### 17.2 Security Quality

- [ ] OWASP Top 10 addressed
- [ ] All inputs validated
- [ ] All outputs sanitized
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protected
- [ ] Secrets not in code

### 17.3 Performance Quality

- [ ] Page load < 2 seconds
- [ ] API response < 500ms
- [ ] No N+1 queries
- [ ] Proper database indexes
- [ ] Caching implemented
- [ ] Lazy loading for large data

### 17.4 UX Quality

- [ ] Responsive on all devices
- [ ] Loading states everywhere
- [ ] Error messages helpful
- [ ] Empty states with guidance
- [ ] Consistent design
- [ ] Accessibility compliant

---

## 18. Post-Deployment Plan

### 18.1 Monitoring Setup

```
Monitoring Components:
1. Error Tracking (Sentry)
   - All backend errors
   - All frontend errors
   - Performance monitoring

2. Uptime Monitoring (UptimeRobot)
   - API health check
   - Webhook endpoint
   - Frontend availability

3. Log Management
   - PM2 logs
   - Application logs
   - Access logs

4. Alerts
   - Error spike
   - Downtime
   - High memory/CPU
   - Failed jobs
```

### 18.2 Maintenance Schedule

| Task | Frequency | Responsible |
|------|-----------|-------------|
| Database backup | Every 6 hours | Automated |
| Log rotation | Daily | Automated |
| Security updates | Weekly | Developer |
| Token refresh check | Daily | Automated |
| Performance review | Weekly | Developer |
| Dependency updates | Monthly | Developer |

### 18.3 Support Handover

```
Client Training Topics:
1. Admin login and navigation
2. Workspace management
3. Facebook account connection
4. Page management
5. Contact management
6. Segment creation
7. Campaign creation and management
8. Using bypass methods (compliance)
9. Inbox management
10. Analytics interpretation
11. Team management
12. Settings configuration
13. Backup management
```

### 18.4 Continuous Improvement

```
Post-Launch Priorities:
1. Monitor user feedback
2. Track feature usage
3. Identify performance bottlenecks
4. Address common support issues
5. Plan feature enhancements
6. Regular security reviews
7. Facebook API updates monitoring
```

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Client (Owner) | | | |
| Developer | | | |
| Project Manager | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Development Team | Initial Development Plan |

---

## Quick Reference

### Key Commands

```bash
# Development
npm run dev:frontend    # Start frontend dev server
npm run dev:backend     # Start backend dev server
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed initial data
npm run test            # Run all tests
npm run lint            # Run linter

# Production
npm run build           # Build all projects
npm run start           # Start production servers
docker-compose up -d    # Start with Docker

# Maintenance
npm run backup          # Manual backup
npm run health          # Check system health
```

### Important URLs

| Environment | Frontend | API | Webhooks |
|-------------|----------|-----|----------|
| Development | localhost:3000 | localhost:4000 | localhost:4000/api/webhooks |
| Production | yourdomain.com | yourdomain.com/api | yourdomain.com/api/webhooks/facebook |

### Emergency Contacts

| Issue | Contact | Method |
|-------|---------|--------|
| System Down | Developer | Email/Phone |
| Facebook Issues | FB Support | Developer Portal |
| Security Incident | Developer | Immediate |

---

## END OF DEVELOPMENT PLAN

**Summary:**

This comprehensive development plan provides a complete roadmap for building the Facebook Page Messaging & Management Platform as specified in the SRS document. Key highlights:

✅ **18-Week Timeline** with detailed weekly tasks  
✅ **8 Development Phases** from foundation to deployment  
✅ **Complete Module Breakdown** with task checklists  
✅ **24-Hour Bypass Implementation** (ALL 4 methods detailed)  
✅ **Full API Specifications** (60+ endpoints)  
✅ **Testing Strategy** with coverage targets  
✅ **Security Checklist** comprehensive  
✅ **Deployment Guide** with Docker and scripts  
✅ **Documentation Requirements** complete  
✅ **Risk Management** plan  
✅ **Quality Assurance** checklists

**Next Steps:**
1. Review and approve this Development Plan
2. Set up development environment
3. Begin Phase 1: Foundation (Week 1)
4. Track progress against milestones
5. Document all development decisions

**Reference Documents:**
- [SRS_Document.md](SRS_Document.md) - Requirements Specification
- Development_Plan.md (this document) - Implementation Guide
