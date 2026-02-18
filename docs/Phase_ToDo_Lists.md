# Phase-wise Development To-Do Lists
## Facebook Page Messaging Platform

**Created:** 2026-02-04 | **Status:** In Progress

---

## Overview

| Phase | Name | Duration | Status |
|-------|------|----------|--------|
| 1 | Foundation & Authentication | Weeks 1-3 | 🔄 In Progress |
| 2 | Facebook Integration | Weeks 4-6 | ⏳ Pending |
| 3 | Messaging Engine & 24H Bypass | Weeks 7-9 | ⏳ Pending |
| 4 | Campaigns & Segmentation | Weeks 10-12 | ⏳ Pending |
| 5 | Inbox & Analytics | Weeks 13-14 | ⏳ Pending |
| 6 | Team & Settings | Week 15 | ⏳ Pending |
| 7 | Testing & Polish | Weeks 16-17 | ⏳ Pending |
| 8 | Deployment & Handover | Week 18 | ⏳ Pending |

---

# PHASE 1: Foundation & Authentication (Weeks 1-3)

## Week 1: Project Setup & Infrastructure

### 1.1 Monorepo & Project Structure
- [ ] Create root project folder `MessageSender`
- [ ] Initialize pnpm workspace
- [ ] Create `pnpm-workspace.yaml` configuration
- [ ] Create folder structure:
  ```
  ├── frontend/
  ├── backend/
  ├── shared/
  ├── docs/
  ├── scripts/
  └── docker/
  ```
- [ ] Create root `package.json` with workspace scripts
- [ ] Create `.gitignore` file
- [ ] Create `.env.example` template
- [ ] Initialize Git repository
- [ ] Create initial commit

### 1.2 Frontend Setup (Next.js 14)
- [ ] Initialize Next.js 14 with App Router
- [ ] Configure TypeScript (strict mode)
- [ ] Install and configure Tailwind CSS
- [ ] Install shadcn/ui CLI
- [ ] Initialize shadcn/ui with default components:
  - [ ] Button
  - [ ] Input
  - [ ] Card
  - [ ] Dialog
  - [ ] Form
  - [ ] Toast
  - [ ] Dropdown Menu
  - [ ] Avatar
  - [ ] Badge
  - [ ] Skeleton
- [ ] Create base layout structure
- [ ] Configure path aliases (`@/`)
- [ ] Setup ESLint configuration
- [ ] Setup Prettier configuration
- [ ] Create `lib/utils.ts` with cn() helper
- [ ] Create base theme configuration

### 1.3 Backend Setup (NestJS 10)
- [ ] Initialize NestJS project
- [ ] Configure TypeScript (strict mode)
- [ ] Install core dependencies:
  - [ ] `@nestjs/config` - Configuration
  - [ ] `@nestjs/passport` - Authentication
  - [ ] `@nestjs/jwt` - JWT handling
  - [ ] `passport-jwt` - JWT strategy
  - [ ] `passport-local` - Local strategy
  - [ ] `bcrypt` - Password hashing
  - [ ] `class-validator` - Validation
  - [ ] `class-transformer` - Transformation
  - [ ] `@nestjs/swagger` - API docs
  - [ ] `helmet` - Security headers
  - [ ] `compression` - Response compression
- [ ] Configure module structure
- [ ] Setup global validation pipe
- [ ] Setup global exception filter
- [ ] Configure CORS
- [ ] Setup Swagger documentation
- [ ] Configure Winston logger
- [ ] Create health check endpoint

### 1.4 Database Setup (PostgreSQL + Prisma)
- [ ] Install PostgreSQL 15 (local/Docker)
- [ ] Create database `messagesender`
- [ ] Install Prisma dependencies
- [ ] Initialize Prisma (`npx prisma init`)
- [ ] Create complete database schema in `schema.prisma`:
  - [ ] Admin model
  - [ ] Users model (team members)
  - [ ] Sessions model
  - [ ] LoginAttempts model
  - [ ] Workspaces model
  - [ ] UserWorkspaces model
  - [ ] FacebookAccounts model
  - [ ] Pages model
  - [ ] Contacts model
  - [ ] Tags model
  - [ ] ContactTags model
  - [ ] CustomFieldDefinitions model
  - [ ] OtnTokens model
  - [ ] RecurringSubscriptions model
  - [ ] MessageTagUsage model
  - [ ] Segments model
  - [ ] SegmentMembers model
  - [ ] Campaigns model
  - [ ] CampaignLogs model
  - [ ] DripProgress model
  - [ ] Conversations model
  - [ ] Messages model
  - [ ] ConversationNotes model
  - [ ] MessageTemplates model
  - [ ] Attachments model
  - [ ] ActivityLogs model
  - [ ] Settings model
  - [ ] JobQueue model
- [ ] Run initial migration
- [ ] Generate Prisma client
- [ ] Create PrismaService in NestJS
- [ ] Create PrismaModule

### 1.5 Redis Setup
- [ ] Install Redis 7 (local/Docker)
- [ ] Install Redis dependencies (`ioredis`)
- [ ] Create RedisModule
- [ ] Create RedisService
- [ ] Test Redis connection
- [ ] Configure Redis for sessions
- [ ] Configure Redis for caching

### 1.6 Docker Configuration
- [ ] Create `docker-compose.yml` for development:
  - [ ] PostgreSQL service
  - [ ] Redis service
  - [ ] pgAdmin service (optional)
- [ ] Create `Dockerfile.frontend`
- [ ] Create `Dockerfile.backend`
- [ ] Create `.dockerignore`
- [ ] Test Docker Compose setup

### 1.7 Development Tools Setup
- [ ] Configure Husky for git hooks
- [ ] Configure lint-staged
- [ ] Create pre-commit hook (lint + format)
- [ ] Configure ESLint rules
- [ ] Configure Prettier rules
- [ ] Setup VS Code recommended extensions
- [ ] Create VS Code workspace settings

---

## Week 2: Authentication System

### 2.1 Admin Model & Service
- [ ] Create Admin entity/model
- [ ] Create AdminModule
- [ ] Create AdminService with methods:
  - [ ] `findByUsername()`
  - [ ] `findByEmail()`
  - [ ] `findById()`
  - [ ] `updateLastLogin()`
  - [ ] `updatePassword()`
- [ ] Create admin seed script

### 2.2 Password Security
- [ ] Create PasswordService:
  - [ ] `hashPassword()` - bcrypt cost factor 12
  - [ ] `comparePassword()` - timing-safe comparison
  - [ ] `validatePasswordStrength()` - min 8 chars, 1 upper, 1 lower, 1 number
  - [ ] `generateRandomPassword()`
- [ ] Write unit tests for PasswordService

### 2.3 JWT Authentication
- [ ] Create AuthModule
- [ ] Create AuthService with methods:
  - [ ] `validateAdmin()` - validate credentials
  - [ ] `login()` - generate tokens
  - [ ] `refreshToken()` - refresh access token
  - [ ] `logout()` - invalidate session
- [ ] Create JwtStrategy (Passport)
- [ ] Create LocalStrategy (Passport)
- [ ] Configure JWT options:
  - [ ] Access token: 1 hour expiry
  - [ ] Refresh token: 7 days expiry
  - [ ] Refresh token (Remember Me): 30 days expiry
- [ ] Create JwtAuthGuard
- [ ] Create token generation utilities
- [ ] Write unit tests for AuthService

### 2.4 Session Management
- [ ] Create SessionsService:
  - [ ] `createSession()` - store in DB + Redis
  - [ ] `findActiveSession()`
  - [ ] `findAllUserSessions()`
  - [ ] `terminateSession()`
  - [ ] `terminateAllSessions()`
  - [ ] `cleanExpiredSessions()`
- [ ] Store session metadata:
  - [ ] IP address
  - [ ] User agent
  - [ ] Created at
  - [ ] Expires at
  - [ ] Last activity
- [ ] Create session cleanup cron job

### 2.5 Rate Limiting
- [ ] Create RateLimitService:
  - [ ] `checkRateLimit()` - check attempts
  - [ ] `recordAttempt()` - log attempt
  - [ ] `isLocked()` - check lockout status
  - [ ] `getRemainingAttempts()`
- [ ] Configure limits:
  - [ ] 5 failed attempts = 15 minute lockout
  - [ ] Track by username AND IP
- [ ] Create LoginAttemptsService
- [ ] Store login attempts in database
- [ ] Write unit tests

### 2.6 Auth Controller & DTOs
- [ ] Create AuthController with endpoints:
  - [ ] `POST /api/v1/auth/login` - Admin login
  - [ ] `POST /api/v1/auth/logout` - Logout
  - [ ] `POST /api/v1/auth/refresh` - Refresh token
  - [ ] `GET /api/v1/auth/me` - Get current user
  - [ ] `GET /api/v1/auth/sessions` - List sessions
  - [ ] `DELETE /api/v1/auth/sessions/:id` - Terminate session
- [ ] Create DTOs with validation:
  - [ ] LoginDto
  - [ ] RefreshTokenDto
  - [ ] ChangePasswordDto
- [ ] Add Swagger documentation
- [ ] Write integration tests

### 2.7 Password Management
- [ ] Add password change endpoint:
  - [ ] `POST /api/v1/auth/password/change`
- [ ] Implement password change logic:
  - [ ] Verify current password
  - [ ] Validate new password strength
  - [ ] Hash new password
  - [ ] Invalidate all sessions
- [ ] Create password reset flow (email-based):
  - [ ] `POST /api/v1/auth/password/reset-request`
  - [ ] `POST /api/v1/auth/password/reset-confirm`
- [ ] Generate secure reset tokens
- [ ] Set token expiry (1 hour)

---

## Week 3: Team Members & Authorization

### 3.1 Team Member Model & Service
- [ ] Create User entity/model (team members)
- [ ] Create UsersModule
- [ ] Create UsersService with methods:
  - [ ] `create()` - create team member
  - [ ] `findAll()` - list all
  - [ ] `findById()`
  - [ ] `findByEmail()`
  - [ ] `update()`
  - [ ] `deactivate()`
  - [ ] `reactivate()`
  - [ ] `delete()`
- [ ] Handle user statuses: pending, active, inactive

### 3.2 Invitation System
- [ ] Create InvitationService:
  - [ ] `createInvitation()` - generate invite
  - [ ] `sendInvitationEmail()` - send email
  - [ ] `validateInvitation()` - verify token
  - [ ] `acceptInvitation()` - complete setup
  - [ ] `resendInvitation()`
  - [ ] `cancelInvitation()`
- [ ] Generate secure invitation tokens
- [ ] Set invitation expiry (48 hours)
- [ ] Create invitation email template

### 3.3 First Login Setup
- [ ] Create setup endpoint:
  - [ ] `POST /api/v1/auth/setup` - First login
- [ ] Accept invitation token
- [ ] Set password
- [ ] Update user status to 'active'
- [ ] Create initial session

### 3.4 Role-Based Access Control (RBAC)
- [ ] Define roles enum:
  - [ ] `admin` - Full system access
  - [ ] `team_member` - Limited access
- [ ] Define permission levels:
  - [ ] `view_only` - Read only
  - [ ] `operator` - Read + Send + Create
  - [ ] `manager` - All except system settings
- [ ] Create RolesGuard
- [ ] Create @Roles() decorator
- [ ] Create @Permissions() decorator
- [ ] Implement permission checking logic

### 3.5 Workspace Access Control
- [ ] Create UserWorkspace junction handling
- [ ] Create WorkspaceGuard:
  - [ ] Check user has access to workspace
  - [ ] Check permission level
- [ ] Create @WorkspaceAccess() decorator
- [ ] Implement workspace isolation:
  - [ ] All queries scoped to workspace
  - [ ] Cross-workspace access blocked

### 3.6 Team Management Endpoints
- [ ] Create TeamController:
  - [ ] `GET /api/v1/team` - List team members
  - [ ] `POST /api/v1/team/invite` - Send invitation
  - [ ] `GET /api/v1/team/:id` - Get member details
  - [ ] `PUT /api/v1/team/:id` - Update member
  - [ ] `DELETE /api/v1/team/:id` - Delete member
  - [ ] `POST /api/v1/team/:id/deactivate` - Deactivate
  - [ ] `POST /api/v1/team/:id/reactivate` - Reactivate
  - [ ] `POST /api/v1/team/:id/workspaces` - Assign workspaces
- [ ] Create DTOs with validation
- [ ] Add Swagger documentation

### 3.7 Frontend: Login Page
- [ ] Create login page (`/login`)
- [ ] Create LoginForm component:
  - [ ] Username/email input
  - [ ] Password input
  - [ ] Remember me checkbox
  - [ ] Submit button
  - [ ] Error display
- [ ] Implement form validation (Zod)
- [ ] Handle login API call
- [ ] Store tokens securely
- [ ] Redirect on success
- [ ] Show rate limit warnings

### 3.8 Frontend: Auth State Management
- [ ] Create authStore (Zustand):
  - [ ] `user` - Current user data
  - [ ] `isAuthenticated` - Auth status
  - [ ] `isAdmin` - Admin flag
  - [ ] `login()` - Login action
  - [ ] `logout()` - Logout action
  - [ ] `refreshToken()` - Refresh action
- [ ] Create useAuth hook
- [ ] Create AuthProvider component
- [ ] Implement token refresh interceptor
- [ ] Handle token expiration

### 3.9 Frontend: Protected Routes
- [ ] Create ProtectedRoute component
- [ ] Create AuthGuard for pages
- [ ] Implement redirect to login
- [ ] Handle loading states
- [ ] Create RoleGuard component

### 3.10 Frontend: Dashboard Layout
- [ ] Create DashboardLayout component:
  - [ ] Sidebar navigation
  - [ ] Header with user menu
  - [ ] Workspace selector
  - [ ] Main content area
- [ ] Create Sidebar component:
  - [ ] Navigation items
  - [ ] Active state
  - [ ] Collapse functionality
- [ ] Create Header component:
  - [ ] User avatar
  - [ ] Dropdown menu
  - [ ] Notifications (placeholder)
- [ ] Create WorkspaceSelector component

### 3.11 Frontend: Session Management UI
- [ ] Create sessions page
- [ ] Display active sessions list:
  - [ ] Device/browser info
  - [ ] IP address
  - [ ] Last activity
  - [ ] Current session indicator
- [ ] Add terminate session button
- [ ] Add terminate all sessions button
- [ ] Show confirmation dialogs

### 3.12 Testing & Documentation
- [ ] Write unit tests for all services
- [ ] Write integration tests for auth flow
- [ ] Write E2E test for login flow
- [ ] Update API documentation
- [ ] Create auth flow diagram

---

## Phase 1 Completion Checklist

### Backend ✓
- [ ] Admin authentication working
- [ ] JWT tokens generated correctly
- [ ] Refresh token flow working
- [ ] Session management complete
- [ ] Rate limiting active
- [ ] Team member CRUD complete
- [ ] Invitation system working
- [ ] RBAC implemented
- [ ] Workspace guard working
- [ ] All endpoints documented

### Frontend ✓
- [ ] Login page functional
- [ ] Auth state management working
- [ ] Protected routes working
- [ ] Dashboard layout complete
- [ ] Workspace selector working
- [ ] Session management UI complete
- [ ] Error handling implemented
- [ ] Loading states implemented

### Database ✓
- [ ] All tables created
- [ ] Indexes created
- [ ] Seed data working
- [ ] Migrations documented

### Testing ✓
- [ ] Auth unit tests passing
- [ ] Integration tests passing
- [ ] E2E login test passing
- [ ] Coverage > 80%

---

# PHASE 2: Facebook Integration (Weeks 4-6)

## Week 4: Facebook OAuth & Account Connection

### 4.1 Facebook App Configuration
- [ ] Create Facebook Developer App
- [ ] Configure App settings:
  - [ ] App ID
  - [ ] App Secret
  - [ ] Valid OAuth Redirect URIs
  - [ ] Webhook callback URL
  - [ ] Privacy Policy URL
  - [ ] Terms of Service URL
- [ ] Request required permissions:
  - [ ] pages_messaging
  - [ ] pages_manage_metadata
  - [ ] pages_read_engagement
  - [ ] pages_show_list
  - [ ] pages_read_user_content
- [ ] Configure Messenger Platform settings
- [ ] Note: App Review submission (prepare documentation)

### 4.2 Facebook Module Setup
- [ ] Create FacebookModule
- [ ] Create FacebookConfigService:
  - [ ] App ID
  - [ ] App Secret
  - [ ] API Version
  - [ ] Redirect URI
- [ ] Create FacebookApiService:
  - [ ] HTTP client setup
  - [ ] Error handling
  - [ ] Rate limit handling
  - [ ] Retry logic

### 4.3 OAuth Flow Implementation
- [ ] Create OAuth endpoints:
  - [ ] `GET /api/v1/workspaces/:id/facebook/auth-url` - Get OAuth URL
  - [ ] `GET /api/v1/workspaces/:id/facebook/callback` - OAuth callback
- [ ] Implement OAuth flow:
  - [ ] Generate state parameter (CSRF protection)
  - [ ] Build authorization URL with scopes
  - [ ] Handle callback with code
  - [ ] Exchange code for access token
  - [ ] Get long-lived token (60 days)
- [ ] Store state in Redis (5 min expiry)

### 4.4 Token Management
- [ ] Create TokenEncryptionService:
  - [ ] `encrypt()` - AES-256-GCM
  - [ ] `decrypt()` - AES-256-GCM
  - [ ] Use secure IV generation
- [ ] Create FacebookTokenService:
  - [ ] `storeToken()` - encrypt and save
  - [ ] `getToken()` - retrieve and decrypt
  - [ ] `refreshToken()` - exchange for new token
  - [ ] `deleteToken()` - secure deletion
- [ ] Implement token refresh scheduler:
  - [ ] Check tokens daily
  - [ ] Refresh 7 days before expiry
  - [ ] Alert 14 days before expiry
- [ ] Write unit tests

### 4.5 Facebook Account Model
- [ ] Create FacebookAccountsService:
  - [ ] `connect()` - connect FB account to workspace
  - [ ] `disconnect()` - remove connection
  - [ ] `getStatus()` - connection status
  - [ ] `refreshConnection()` - refresh tokens
- [ ] Handle connection states:
  - [ ] Connected
  - [ ] Disconnected
  - [ ] Token Error
  - [ ] Refreshing
- [ ] Create FacebookAccountsController

### 4.6 User Profile Retrieval
- [ ] Implement Graph API call for user:
  - [ ] `/me?fields=id,name,email`
- [ ] Store Facebook user ID
- [ ] Store user name
- [ ] Handle API errors

### 4.7 Error Handling
- [ ] Create FacebookApiException
- [ ] Handle common errors:
  - [ ] Invalid token
  - [ ] Expired token
  - [ ] Permission denied
  - [ ] Rate limited
  - [ ] Network errors
- [ ] Implement retry with backoff
- [ ] Log all errors with context

---

## Week 5: Page Management

### 5.1 Page Listing
- [ ] Implement `/me/accounts` API call
- [ ] Parse page data:
  - [ ] Page ID
  - [ ] Page Name
  - [ ] Page Access Token
  - [ ] Category
- [ ] Handle pagination for many pages
- [ ] Cache page list (15 min)

### 5.2 Page Access Token
- [ ] Extract page access tokens
- [ ] Request long-lived page tokens
- [ ] Encrypt and store page tokens
- [ ] Implement token refresh

### 5.3 Pages Module
- [ ] Create PagesModule
- [ ] Create PagesService:
  - [ ] `listAvailablePages()` - from FB
  - [ ] `activatePage()` - enable for workspace
  - [ ] `deactivatePage()` - disable
  - [ ] `syncPageData()` - refresh data
  - [ ] `getPageStatus()` - health check
- [ ] Create PagesController:
  - [ ] `GET /api/v1/workspaces/:id/pages` - List pages
  - [ ] `GET /api/v1/workspaces/:id/pages/available` - FB pages
  - [ ] `POST /api/v1/workspaces/:id/pages/:pageId/activate`
  - [ ] `POST /api/v1/workspaces/:id/pages/:pageId/deactivate`
  - [ ] `POST /api/v1/workspaces/:id/pages/sync`
  - [ ] `GET /api/v1/workspaces/:id/pages/:pageId/stats`

### 5.4 Page Data Sync
- [ ] Create PageSyncService
- [ ] Fetch page details:
  - [ ] Name
  - [ ] Profile picture
  - [ ] Cover photo
  - [ ] Category
  - [ ] Followers count
- [ ] Create sync cron job (every 15 minutes)
- [ ] Handle sync errors gracefully
- [ ] Log sync activities

### 5.5 Page Health Monitoring
- [ ] Create PageHealthService
- [ ] Check token validity
- [ ] Check webhook subscription
- [ ] Check API accessibility
- [ ] Create health status endpoint
- [ ] Alert on issues

### 5.6 Frontend: Facebook Connection UI
- [ ] Create FacebookConnection component
- [ ] Display connection status
- [ ] Create "Connect Facebook" button
- [ ] Handle OAuth popup/redirect
- [ ] Show connection progress
- [ ] Handle errors

### 5.7 Frontend: Page Management
- [ ] Create PagesPage
- [ ] Create PagesList component
- [ ] Create PageCard component:
  - [ ] Page picture
  - [ ] Page name
  - [ ] Followers count
  - [ ] Status indicator
  - [ ] Action buttons
- [ ] Create PageActivationDialog
- [ ] Implement page sync button
- [ ] Show sync status

---

## Week 6: Webhook Integration

### 6.1 Webhook Endpoint Setup
- [ ] Create WebhooksModule
- [ ] Create webhook endpoint:
  - [ ] `GET /api/webhooks/facebook` - Verification
  - [ ] `POST /api/webhooks/facebook` - Events
- [ ] Implement challenge verification:
  - [ ] Verify hub.verify_token
  - [ ] Return hub.challenge
- [ ] Configure in Facebook App

### 6.2 Signature Verification
- [ ] Create WebhookSecurityService
- [ ] Implement HMAC-SHA256 verification:
  ```typescript
  verifySignature(signature: string, payload: string): boolean
  ```
- [ ] Use timing-safe comparison
- [ ] Reject invalid signatures (401)
- [ ] Log security events

### 6.3 Event Processing
- [ ] Create WebhookProcessorService
- [ ] Parse webhook payload structure
- [ ] Route events by type:
  - [ ] `messages` → MessageHandler
  - [ ] `messaging_postbacks` → PostbackHandler
  - [ ] `messaging_optins` → OptinHandler
  - [ ] `messaging_optouts` → OptoutHandler
  - [ ] `message_deliveries` → DeliveryHandler
  - [ ] `message_reads` → ReadHandler
  - [ ] `messaging_referrals` → ReferralHandler
- [ ] Queue events for async processing

### 6.4 Message Event Handler
- [ ] Create MessageEventHandler
- [ ] Process incoming messages:
  - [ ] Extract sender PSID
  - [ ] Extract page ID
  - [ ] Extract message content
  - [ ] Extract attachments
  - [ ] Extract timestamp
- [ ] Create or update contact
- [ ] Create conversation if needed
- [ ] Store message
- [ ] Update 24-hour window timestamp
- [ ] Emit real-time event (Socket.io)

### 6.5 Contact Auto-Capture
- [ ] Create ContactCaptureService
- [ ] On first message:
  - [ ] Create contact record
  - [ ] Fetch profile data from FB
  - [ ] Store PSID, name, picture
  - [ ] Set source as 'organic'
  - [ ] Set first_interaction_at
- [ ] On subsequent messages:
  - [ ] Update last_interaction_at
  - [ ] Update last_message_from_contact_at
- [ ] Handle profile fetch errors

### 6.6 Delivery & Read Receipts
- [ ] Create DeliveryHandler
- [ ] Update message status to 'delivered'
- [ ] Create ReadHandler
- [ ] Update message status to 'read'
- [ ] Store timestamps
- [ ] Update campaign logs if applicable

### 6.7 Optin/Optout Handlers
- [ ] Create OptinHandler:
  - [ ] Handle OTN opt-ins
  - [ ] Handle recurring notification opt-ins
  - [ ] Store tokens
- [ ] Create OptoutHandler:
  - [ ] Mark subscriptions inactive
  - [ ] Update contact preferences
- [ ] Log all opt-in/opt-out events

### 6.8 Referral Handler
- [ ] Create ReferralHandler
- [ ] Extract referral data:
  - [ ] Source (ad, shortlink, etc.)
  - [ ] Ref parameter
  - [ ] Ad ID (if from ad)
- [ ] Update contact source
- [ ] Store referral details

### 6.9 Event Queue
- [ ] Create BullMQ queue for webhooks
- [ ] Create WebhookProcessor (worker)
- [ ] Process events asynchronously
- [ ] Handle failures with retry
- [ ] Log processing status

### 6.10 Testing
- [ ] Create webhook test endpoint (dev only)
- [ ] Write unit tests for handlers
- [ ] Write integration tests
- [ ] Test with Facebook webhook test tool
- [ ] Verify all event types processed

---

## Phase 2 Completion Checklist

### Facebook Integration ✓
- [ ] OAuth flow working
- [ ] Long-lived tokens stored (encrypted)
- [ ] Token refresh working
- [ ] All pages can be listed
- [ ] Pages can be activated/deactivated
- [ ] Page sync job running

### Webhooks ✓
- [ ] Endpoint verified with Facebook
- [ ] Signature verification working
- [ ] All event types handled
- [ ] Contacts auto-captured
- [ ] Messages stored
- [ ] Opt-in/opt-out working

### Frontend ✓
- [ ] Facebook connection UI complete
- [ ] Page management UI complete
- [ ] Status indicators working
- [ ] Error handling implemented

---

# PHASE 3: Messaging Engine & 24H Bypass (Weeks 7-9) ⚠️ CRITICAL

## Week 7: Core Messaging System

### 7.1 Messages Module Setup
- [ ] Create MessagesModule
- [ ] Create MessagesService
- [ ] Create message entity relationships
- [ ] Setup message types enum:
  - [ ] text
  - [ ] image
  - [ ] video
  - [ ] file
  - [ ] template

### 7.2 Facebook Send API Integration
- [ ] Create SendApiService
- [ ] Implement message sending:
  ```typescript
  sendMessage(pageId: string, recipientId: string, message: MessagePayload)
  ```
- [ ] Handle messaging_type:
  - [ ] RESPONSE (within 24h)
  - [ ] UPDATE (within 24h)
  - [ ] MESSAGE_TAG (outside 24h)
- [ ] Handle API responses
- [ ] Handle errors

### 7.3 Text Messages
- [ ] Implement text message sending
- [ ] Handle character limit (2000)
- [ ] Support emoji
- [ ] Create text message DTO

### 7.4 Attachment Handling
- [ ] Create AttachmentService
- [ ] Implement attachment upload:
  - [ ] Upload to Facebook
  - [ ] Get attachment_id
  - [ ] Cache for reuse
- [ ] Support file types:
  - [ ] Image (JPG, PNG, GIF) - 8MB
  - [ ] Video (MP4) - 25MB
  - [ ] File (PDF, DOC) - 25MB
- [ ] Store attachment metadata
- [ ] Create local file storage

### 7.5 Template Messages
- [ ] Implement button template:
  - [ ] URL buttons
  - [ ] Postback buttons
  - [ ] Call buttons
  - [ ] Max 3 buttons
- [ ] Implement quick replies:
  - [ ] Text quick replies
  - [ ] Max 13 quick replies
- [ ] Implement generic template (cards)
- [ ] Create template DTOs

### 7.6 Personalization Engine
- [ ] Create PersonalizationService
- [ ] Support tokens:
  - [ ] `{{first_name}}`
  - [ ] `{{last_name}}`
  - [ ] `{{full_name}}`
  - [ ] `{{page_name}}`
  - [ ] `{{custom_field_*}}`
- [ ] Implement token replacement
- [ ] Handle fallback values
- [ ] Handle missing data gracefully

### 7.7 Message Composer API
- [ ] Create endpoint:
  - [ ] `POST /api/v1/workspaces/:id/messages/send`
- [ ] Accept message payload:
  - [ ] recipient_id (PSID)
  - [ ] page_id
  - [ ] message_type
  - [ ] content
  - [ ] attachments
  - [ ] bypass_method (if outside 24h)
- [ ] Validate all inputs
- [ ] Return send status

### 7.8 Frontend: Message Composer
- [ ] Create MessageComposer component
- [ ] Implement text editor:
  - [ ] Character count
  - [ ] Emoji picker
- [ ] Create AttachmentUpload component
- [ ] Create PersonalizationPicker
- [ ] Create TemplateBuilder component
- [ ] Create MessagePreview component

---

## Week 8: 24-Hour Bypass System ⚠️ MOST CRITICAL

### 8.1 24-Hour Window Tracking
- [ ] Create WindowTrackingService
- [ ] Track last_message_from_contact_at per contact per page
- [ ] Calculate window status:
  ```typescript
  isWithin24Hours(contactId: string, pageId: string): boolean
  getWindowExpiry(contactId: string, pageId: string): Date | null
  ```
- [ ] Create window status endpoint
- [ ] Write comprehensive tests

### 8.2 Message Tags Implementation ⚠️
- [ ] Create MessageTagService
- [ ] Implement ALL 4 message tags:

#### CONFIRMED_EVENT_UPDATE
- [ ] Send with tag parameter
- [ ] Track usage
- [ ] Add compliance warning
- [ ] Valid: event reminders, changes
- [ ] Invalid: promotions, new events

#### POST_PURCHASE_UPDATE
- [ ] Send with tag parameter
- [ ] Track usage
- [ ] Add compliance warning
- [ ] Valid: order status, shipping
- [ ] Invalid: upsells, promotions

#### ACCOUNT_UPDATE
- [ ] Send with tag parameter
- [ ] Track usage
- [ ] Add compliance warning
- [ ] Valid: account alerts, security
- [ ] Invalid: marketing, promotions

#### HUMAN_AGENT
- [ ] Send with tag parameter
- [ ] Track usage (7-day limit)
- [ ] Add compliance warning
- [ ] Valid: support responses
- [ ] Invalid: automated, bulk

### 8.3 OTN (One-Time Notification) System ⚠️
- [ ] Create OtnService

#### OTN Request
- [ ] Create OTN request template:
  ```typescript
  requestOtn(contactId: string, pageId: string, title: string)
  ```
- [ ] Send notify_me button template
- [ ] Store pending request

#### OTN Webhook Handler
- [ ] Handle one_time_notif_token in webhook
- [ ] Store token in otn_tokens table
- [ ] Mark as opted_in

#### OTN Token Usage
- [ ] Send message with token:
  ```typescript
  sendWithOtn(contactId: string, pageId: string, message: Message)
  ```
- [ ] Mark token as used (SINGLE USE!)
- [ ] Handle expired tokens

#### OTN Status
- [ ] Check OTN availability for contact
- [ ] Display in contact profile
- [ ] Track opt-in rate

### 8.4 Recurring Notifications System ⚠️
- [ ] Create RecurringNotificationService

#### Subscription Request
- [ ] Create subscription request:
  ```typescript
  requestSubscription(contactId: string, pageId: string, topic: string, frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY')
  ```
- [ ] Send notification_messages template
- [ ] Store pending request

#### Subscription Webhook Handler
- [ ] Handle notification_messages_token
- [ ] Store in recurring_subscriptions table
- [ ] Store frequency
- [ ] Calculate expiration

#### Send with Recurring
- [ ] Send message with token:
  ```typescript
  sendWithRecurring(subscriptionId: string, message: Message)
  ```
- [ ] Check frequency limit (1/day, 1/week, 1/month)
- [ ] Update last_sent_at
- [ ] Handle expired subscriptions

#### Re-subscription
- [ ] Detect approaching expiration
- [ ] Send re-subscription request
- [ ] Handle renewal

#### Opt-out Handling
- [ ] Handle opt-out webhook
- [ ] Mark subscription inactive
- [ ] Stop all messages

### 8.5 Bypass Auto-Selection
- [ ] Create BypassDecisionService
- [ ] Implement priority logic:
  ```typescript
  determineBestBypass(contactId: string, pageId: string): BypassMethod
  ```
- [ ] Priority order:
  1. Within 24-hour window → No bypass needed
  2. Valid OTN token → Use OTN
  3. Active recurring subscription → Use recurring
  4. Applicable message tag → Suggest tag
  5. Sponsored message (if enabled)
  6. Cannot send → Block

### 8.6 Compliance Monitoring
- [ ] Create ComplianceService
- [ ] Track tag usage per contact
- [ ] Detect abuse patterns:
  - [ ] Excessive tag usage
  - [ ] Wrong tag for content
  - [ ] High unsubscribe rate
- [ ] Generate compliance alerts
- [ ] Create compliance audit report
- [ ] Implement cool-down periods

### 8.7 Bypass Endpoints
- [ ] Create BypassController:
  - [ ] `POST /api/v1/workspaces/:id/bypass/otn/request`
  - [ ] `GET /api/v1/workspaces/:id/bypass/otn/tokens`
  - [ ] `POST /api/v1/workspaces/:id/bypass/recurring/request`
  - [ ] `GET /api/v1/workspaces/:id/bypass/recurring/subscriptions`
  - [ ] `GET /api/v1/workspaces/:id/bypass/status/:contactId`
  - [ ] `GET /api/v1/workspaces/:id/bypass/compliance/report`

### 8.8 Frontend: Bypass UI
- [ ] Create WindowStatusIndicator component
- [ ] Create BypassMethodSelector component
- [ ] Create MessageTagSelector with warnings
- [ ] Create OtnRequestButton component
- [ ] Create RecurringSubscriptionManager
- [ ] Create ComplianceWarningDialog

---

## Week 9: Bulk Messaging & Rate Limiting

### 9.1 Job Queue Setup
- [ ] Create BullMQ queues:
  - [ ] `message-queue` - Individual messages
  - [ ] `bulk-send-queue` - Bulk operations
  - [ ] `campaign-queue` - Campaign execution
- [ ] Configure queue options:
  - [ ] Concurrency
  - [ ] Rate limiting
  - [ ] Retry settings

### 9.2 Message Worker
- [ ] Create MessageProcessor
- [ ] Process message jobs:
  - [ ] Fetch contact data
  - [ ] Apply personalization
  - [ ] Determine bypass method
  - [ ] Send via Facebook API
  - [ ] Update status
  - [ ] Handle errors

### 9.3 Rate Limiting System
- [ ] Create RateLimiterService
- [ ] Implement per-page limits:
  - [ ] 200 messages/page/hour
  - [ ] Track usage in Redis
- [ ] Implement queue throttling
- [ ] Distribute load across pages
- [ ] Handle rate limit errors

### 9.4 Bulk Send Processing
- [ ] Create BulkSendService
- [ ] Accept bulk send request:
  - [ ] Recipients (segment, manual, CSV)
  - [ ] Message content
  - [ ] Bypass method
- [ ] Create bulk send job
- [ ] Split into individual message jobs
- [ ] Track overall progress

### 9.5 Retry Mechanism
- [ ] Configure retry attempts (max 3)
- [ ] Implement exponential backoff:
  - [ ] 1st retry: 1 second
  - [ ] 2nd retry: 5 seconds
  - [ ] 3rd retry: 15 seconds
- [ ] Handle permanent failures
- [ ] Log all attempts

### 9.6 Progress Tracking
- [ ] Create SendProgressService
- [ ] Track statuses:
  - [ ] Queued
  - [ ] Sending
  - [ ] Sent
  - [ ] Delivered
  - [ ] Failed
- [ ] Calculate progress percentage
- [ ] Emit real-time updates (Socket.io)

### 9.7 Cancellation Support
- [ ] Implement job cancellation
- [ ] Cancel queued messages
- [ ] Cannot cancel sent messages
- [ ] Update status to 'cancelled'

### 9.8 Bulk Send Endpoints
- [ ] Create endpoints:
  - [ ] `POST /api/v1/workspaces/:id/messages/send-bulk`
  - [ ] `GET /api/v1/workspaces/:id/messages/status/:jobId`
  - [ ] `POST /api/v1/workspaces/:id/messages/cancel/:jobId`

### 9.9 Frontend: Bulk Send UI
- [ ] Create RecipientSelector component
- [ ] Create BulkSendWizard
- [ ] Create SendProgressIndicator
- [ ] Create SendStatusPage
- [ ] Implement real-time progress updates
- [ ] Add cancellation button

### 9.10 Testing
- [ ] Test all 4 bypass methods
- [ ] Test rate limiting
- [ ] Test retry mechanism
- [ ] Test progress tracking
- [ ] Test cancellation
- [ ] Load test with 1000+ messages

---

## Phase 3 Completion Checklist ⚠️

### Messaging Engine ✓
- [ ] Single message sending works
- [ ] All message types supported
- [ ] Attachments working
- [ ] Templates working
- [ ] Personalization working

### 24-Hour Bypass ✓ (CRITICAL)
- [ ] Window tracking accurate
- [ ] ✅ CONFIRMED_EVENT_UPDATE working
- [ ] ✅ POST_PURCHASE_UPDATE working
- [ ] ✅ ACCOUNT_UPDATE working
- [ ] ✅ HUMAN_AGENT working
- [ ] ✅ OTN request working
- [ ] ✅ OTN token usage working
- [ ] ✅ Recurring subscription working
- [ ] ✅ Recurring send working
- [ ] Auto-bypass selection working
- [ ] Compliance monitoring active

### Bulk Messaging ✓
- [ ] Rate limiting working
- [ ] Progress tracking real-time
- [ ] Retry mechanism working
- [ ] Cancellation working

---

# PHASE 4: Campaigns & Segmentation (Weeks 10-12)

## Week 10: Contact Management & Segmentation

### 10.1 Contact CRUD
- [ ] Create ContactsModule
- [ ] Create ContactsService with full CRUD
- [ ] Create ContactsController:
  - [ ] `GET /api/v1/workspaces/:id/contacts`
  - [ ] `GET /api/v1/workspaces/:id/contacts/:contactId`
  - [ ] `PUT /api/v1/workspaces/:id/contacts/:contactId`
  - [ ] `DELETE /api/v1/workspaces/:id/contacts/:contactId`
- [ ] Implement search with filters
- [ ] Implement pagination (cursor-based)
- [ ] Implement sorting

### 10.2 Tags System
- [ ] Create TagsService
- [ ] Create TagsController:
  - [ ] CRUD for tags
  - [ ] Add/remove tags from contacts
- [ ] Support tag colors
- [ ] Batch tag operations

### 10.3 Custom Fields
- [ ] Create CustomFieldsService
- [ ] Support field types:
  - [ ] Text
  - [ ] Number
  - [ ] Date
  - [ ] Dropdown
  - [ ] Checkbox
- [ ] Create field definitions per workspace
- [ ] Store values in contact custom_fields JSON

### 10.4 Engagement Scoring
- [ ] Create EngagementService
- [ ] Calculate score based on:
  - [ ] Message frequency
  - [ ] Response rate
  - [ ] Recency
- [ ] Categorize: Hot, Warm, Cold, Inactive
- [ ] Update scores on interactions
- [ ] Create cron job for batch updates

### 10.5 Import/Export
- [ ] Create ImportExportService
- [ ] Implement CSV import:
  - [ ] Field mapping UI
  - [ ] Validation
  - [ ] Error handling
  - [ ] Progress tracking
- [ ] Implement export:
  - [ ] CSV format
  - [ ] Excel format
  - [ ] Include all fields and tags

### 10.6 Segment Builder
- [ ] Create SegmentsModule
- [ ] Create SegmentsService
- [ ] Create SegmentsController
- [ ] Support filter conditions:
  - [ ] Page
  - [ ] Date range (first/last interaction)
  - [ ] Tags (has/doesn't have)
  - [ ] Custom fields (all operators)
  - [ ] Engagement level
  - [ ] 24-hour window status
  - [ ] OTN status
  - [ ] Recurring subscription status
  - [ ] Campaign status
  - [ ] Source

### 10.7 Segment Logic Engine
- [ ] Create FilterEngineService
- [ ] Implement AND logic
- [ ] Implement OR logic
- [ ] Implement NOT logic
- [ ] Implement nested groups
- [ ] Optimize query performance
- [ ] Write comprehensive tests

### 10.8 Dynamic Segments
- [ ] Auto-calculate segment size
- [ ] Update on contact changes
- [ ] Cache segment counts
- [ ] Provide segment preview

### 10.9 Frontend: Contact Management
- [ ] Create ContactsPage
- [ ] Create ContactList component
- [ ] Create ContactProfile component
- [ ] Create ContactEditForm
- [ ] Create TagManager
- [ ] Create CustomFieldsConfig
- [ ] Create ImportDialog
- [ ] Create ExportDialog

### 10.10 Frontend: Segment Builder
- [ ] Create SegmentsPage
- [ ] Create SegmentBuilder component
- [ ] Create FilterCondition component
- [ ] Create ConditionGroup component
- [ ] Create LogicSelector (AND/OR)
- [ ] Create SegmentPreview
- [ ] Implement drag-and-drop

---

## Week 11: Campaign Creation

### 11.1 Campaign Module
- [ ] Create CampaignsModule
- [ ] Create CampaignsService
- [ ] Create CampaignsController

### 11.2 Campaign Types
- [ ] Implement One-time campaign
- [ ] Implement Scheduled campaign
- [ ] Implement Recurring campaign
- [ ] Implement Drip campaign
- [ ] Implement Trigger-based campaign

### 11.3 Campaign CRUD
- [ ] Create campaign:
  - [ ] Name, description
  - [ ] Type
  - [ ] Audience selection
  - [ ] Message content
  - [ ] Bypass configuration
  - [ ] Schedule
- [ ] Read campaign details
- [ ] Update campaign (draft only)
- [ ] Delete campaign
- [ ] Duplicate campaign

### 11.4 Campaign Wizard
- [ ] Create multi-step wizard API:
  - [ ] Step 1: Basic info
  - [ ] Step 2: Audience selection
  - [ ] Step 3: Message content
  - [ ] Step 4: Bypass method
  - [ ] Step 5: Schedule
  - [ ] Step 6: Review
- [ ] Validate each step
- [ ] Save as draft at any step

### 11.5 Drip Campaign Builder
- [ ] Create drip sequence structure
- [ ] Support multiple messages
- [ ] Set delays between messages:
  - [ ] Minutes
  - [ ] Hours
  - [ ] Days
- [ ] Set conditions for next message:
  - [ ] If replied
  - [ ] If clicked
  - [ ] Always
- [ ] Track progress per contact

### 11.6 Frontend: Campaign Management
- [ ] Create CampaignsPage
- [ ] Create CampaignList
- [ ] Create CampaignCard
- [ ] Create CampaignWizard (multi-step)
- [ ] Create AudienceSelector
- [ ] Create MessageStep
- [ ] Create BypassStep
- [ ] Create ScheduleStep
- [ ] Create ReviewStep

### 11.7 Frontend: Drip Builder
- [ ] Create DripSequenceBuilder
- [ ] Create DripStep component
- [ ] Create DelayConfig
- [ ] Create ConditionConfig
- [ ] Implement drag-and-drop reordering

---

## Week 12: Campaign Execution & A/B Testing

### 12.1 Campaign Execution Engine
- [ ] Create CampaignExecutorService
- [ ] Process campaign execution:
  - [ ] Get audience contacts
  - [ ] Apply segment filters
  - [ ] Queue messages
  - [ ] Track progress

### 12.2 Scheduled Campaigns
- [ ] Create SchedulerService
- [ ] Create cron job for scheduled campaigns
- [ ] Support timezone handling
- [ ] Send reminder before launch

### 12.3 Recurring Campaigns
- [ ] Create RecurringCampaignService
- [ ] Support patterns:
  - [ ] Daily
  - [ ] Weekly
  - [ ] Monthly
- [ ] Track last run
- [ ] Avoid duplicate sends

### 12.4 Campaign State Management
- [ ] Handle states:
  - [ ] Draft
  - [ ] Scheduled
  - [ ] Running
  - [ ] Paused
  - [ ] Completed
  - [ ] Cancelled
- [ ] Implement state transitions
- [ ] Validate state changes

### 12.5 Pause/Resume/Cancel
- [ ] Implement pause:
  - [ ] Stop queuing new messages
  - [ ] Track paused position
- [ ] Implement resume:
  - [ ] Continue from paused position
- [ ] Implement cancel:
  - [ ] Stop all processing
  - [ ] Mark remaining as cancelled

### 12.6 A/B Testing
- [ ] Create ABTestService
- [ ] Support 2-4 variants
- [ ] Split audience:
  - [ ] Random split
  - [ ] Percentage split
- [ ] Track per-variant metrics:
  - [ ] Delivery rate
  - [ ] Response rate
  - [ ] Click rate
- [ ] Determine winner
- [ ] Optional: Auto-send winner to remaining

### 12.7 Campaign Statistics
- [ ] Track metrics:
  - [ ] Total recipients
  - [ ] Sent count
  - [ ] Delivered count
  - [ ] Failed count
  - [ ] Opened count (if trackable)
  - [ ] Clicked count
  - [ ] Replied count
  - [ ] Unsubscribed count
- [ ] Create campaign stats endpoint

### 12.8 Frontend: Campaign Controls
- [ ] Create CampaignDetailPage
- [ ] Create CampaignStats component
- [ ] Create CampaignControls (pause/resume/cancel)
- [ ] Create CampaignProgress
- [ ] Create ABTestResults component

### 12.9 Frontend: Calendar View
- [ ] Create CampaignCalendar
- [ ] Show scheduled campaigns
- [ ] Click to view details
- [ ] Drag to reschedule (optional)

---

## Phase 4 Completion Checklist

### Contact Management ✓
- [ ] Contact CRUD working
- [ ] Tags working
- [ ] Custom fields working
- [ ] Engagement scoring working
- [ ] Import/Export working

### Segmentation ✓
- [ ] Segment builder working
- [ ] All filter types working
- [ ] AND/OR/NOT logic working
- [ ] Dynamic calculation working

### Campaigns ✓
- [ ] All campaign types working
- [ ] Campaign wizard working
- [ ] Drip campaigns working
- [ ] A/B testing working
- [ ] Scheduling working
- [ ] Pause/Resume/Cancel working

---

# PHASE 5: Inbox & Analytics (Weeks 13-14)

## Week 13: Unified Inbox

### 13.1 Conversations Module
- [ ] Create ConversationsModule
- [ ] Create ConversationsService
- [ ] Create ConversationsController

### 13.2 Conversation Aggregation
- [ ] Group messages by contact per page
- [ ] Calculate unread count
- [ ] Track last message
- [ ] Track conversation status

### 13.3 Inbox Endpoints
- [ ] `GET /api/v1/workspaces/:id/inbox/conversations`
  - [ ] Pagination
  - [ ] Filters (status, page, assigned)
  - [ ] Search
- [ ] `GET /api/v1/workspaces/:id/inbox/conversations/:id`
- [ ] `PUT /api/v1/workspaces/:id/inbox/conversations/:id`
- [ ] `POST /api/v1/workspaces/:id/inbox/conversations/:id/reply`

### 13.4 Real-time Updates
- [ ] Create InboxGateway (Socket.io)
- [ ] Events:
  - [ ] new_message
  - [ ] message_status_update
  - [ ] conversation_assigned
- [ ] Join workspace room
- [ ] Emit on webhook events

### 13.5 Reply Functionality
- [ ] Create ReplyService
- [ ] Support all message types
- [ ] Check 24-hour window
- [ ] Suggest bypass method
- [ ] Allow bypass selection

### 13.6 Conversation Management
- [ ] Assign to team member
- [ ] Change status (open/pending/resolved)
- [ ] Add labels
- [ ] Add internal notes
- [ ] Mark as read/unread

### 13.7 Canned Responses
- [ ] Create CannedResponsesService
- [ ] CRUD operations
- [ ] Support personalization
- [ ] Create keyboard shortcuts

### 13.8 Frontend: Inbox
- [ ] Create InboxPage
- [ ] Create ConversationList
- [ ] Create ConversationThread
- [ ] Create ReplyComposer
- [ ] Create ConversationPanel
- [ ] Create CannedResponsePicker
- [ ] Implement real-time updates
- [ ] Create WindowWarning component

---

## Week 14: Analytics Dashboard

### 14.1 Analytics Module
- [ ] Create AnalyticsModule
- [ ] Create AnalyticsService

### 14.2 Dashboard Metrics
- [ ] Calculate metrics:
  - [ ] Total contacts
  - [ ] New contacts (period)
  - [ ] Messages sent
  - [ ] Messages received
  - [ ] Delivery rate
  - [ ] Response rate
  - [ ] Active conversations
- [ ] Support date range filtering
- [ ] Calculate period comparison

### 14.3 Time-series Data
- [ ] Aggregate daily/weekly/monthly
- [ ] Store pre-aggregated data
- [ ] Create trend calculations

### 14.4 Campaign Analytics
- [ ] Per-campaign metrics
- [ ] Campaign comparison
- [ ] A/B test results
- [ ] Best performing campaigns

### 14.5 Contact Analytics
- [ ] Growth over time
- [ ] By source
- [ ] Engagement distribution
- [ ] 24-hour window breakdown
- [ ] OTN/Recurring opt-in rates

### 14.6 Page Analytics
- [ ] Per-page metrics
- [ ] Page comparison
- [ ] Response time metrics

### 14.7 Analytics Endpoints
- [ ] `GET /api/v1/workspaces/:id/analytics/dashboard`
- [ ] `GET /api/v1/workspaces/:id/analytics/campaigns`
- [ ] `GET /api/v1/workspaces/:id/analytics/contacts`
- [ ] `GET /api/v1/workspaces/:id/analytics/pages`

### 14.8 Reports
- [ ] Create ReportService
- [ ] Generate report types:
  - [ ] Campaign Summary
  - [ ] Contact Growth
  - [ ] Engagement
  - [ ] Compliance
- [ ] Export formats:
  - [ ] PDF
  - [ ] CSV
  - [ ] Excel
- [ ] Schedule automated reports

### 14.9 Frontend: Analytics
- [ ] Create AnalyticsPage
- [ ] Create MetricCard component
- [ ] Create TimeSeriesChart (Recharts)
- [ ] Create ComparisonIndicator
- [ ] Create DateRangePicker
- [ ] Create CampaignAnalyticsPage
- [ ] Create ContactAnalyticsPage
- [ ] Create ReportGenerator

---

## Phase 5 Completion Checklist

### Inbox ✓
- [ ] Conversations displaying
- [ ] Real-time updates working
- [ ] Reply functionality working
- [ ] 24-hour warning showing
- [ ] Bypass selection in reply
- [ ] Conversation management working
- [ ] Canned responses working

### Analytics ✓
- [ ] Dashboard metrics correct
- [ ] Charts rendering
- [ ] Date range filtering working
- [ ] Campaign analytics working
- [ ] Contact analytics working
- [ ] Report generation working

---

# PHASE 6: Team & Settings (Week 15)

## Week 15: Team Management & System Settings

### 15.1 Team Invitation Flow
- [ ] Email invitation sending
- [ ] Invitation email template
- [ ] Track invitation status
- [ ] Resend capability
- [ ] Cancel invitation

### 15.2 Permission Management
- [ ] Assign workspaces
- [ ] Set permission levels
- [ ] Multiple workspace assignment
- [ ] Permission inheritance

### 15.3 Activity Logging
- [ ] Create ActivityLogService
- [ ] Log all actions:
  - [ ] Login/logout
  - [ ] Contact changes
  - [ ] Campaign actions
  - [ ] Message sends
  - [ ] Settings changes
- [ ] Store actor, action, entity, details
- [ ] Query with filters

### 15.4 Activity Log UI
- [ ] Create ActivityLogPage
- [ ] Create ActivityList component
- [ ] Implement filters
- [ ] Show action details

### 15.5 System Settings
- [ ] Create SettingsModule
- [ ] Create SettingsService
- [ ] Implement settings:
  - [ ] App name
  - [ ] App logo
  - [ ] Default timezone
  - [ ] Date/time format

### 15.6 Email Settings
- [ ] SMTP configuration
- [ ] Test email sending
- [ ] Support providers:
  - [ ] SMTP
  - [ ] SendGrid
  - [ ] AWS SES

### 15.7 Notification Preferences
- [ ] Configure notification types
- [ ] Configure channels:
  - [ ] In-app
  - [ ] Email
- [ ] Per-user preferences

### 15.8 Backup System
- [ ] Create BackupService
- [ ] Manual backup trigger
- [ ] Scheduled backups (every 6 hours)
- [ ] Backup download
- [ ] Backup restoration

### 15.9 System Health
- [ ] Create HealthService
- [ ] Check components:
  - [ ] Database
  - [ ] Redis
  - [ ] Facebook API
  - [ ] Job queue
- [ ] Create health endpoint
- [ ] Health dashboard

### 15.10 Frontend: Team Management
- [ ] Create TeamPage
- [ ] Create TeamMemberList
- [ ] Create InviteDialog
- [ ] Create PermissionEditor
- [ ] Create WorkspaceAssignment

### 15.11 Frontend: Settings
- [ ] Create SettingsPage
- [ ] Create GeneralSettings form
- [ ] Create EmailSettings form
- [ ] Create NotificationSettings
- [ ] Create BackupManager
- [ ] Create SystemHealth display

---

## Phase 6 Completion Checklist

### Team Management ✓
- [ ] Invitation flow working
- [ ] Permission levels working
- [ ] Workspace assignment working
- [ ] Activity logging working

### Settings ✓
- [ ] General settings working
- [ ] Email settings working
- [ ] Backup system working
- [ ] System health displaying

---

# PHASE 7: Testing & Polish (Weeks 16-17)

## Week 16: Testing

### 16.1 Unit Tests
- [ ] Auth module tests (>85% coverage)
- [ ] Facebook module tests (>80% coverage)
- [ ] Contacts module tests (>80% coverage)
- [ ] Segments module tests (>85% coverage)
- [ ] Campaigns module tests (>80% coverage)
- [ ] Messages module tests (>85% coverage)
- [ ] **Bypass module tests (>95% coverage)** ⚠️
- [ ] Inbox module tests (>80% coverage)
- [ ] Analytics module tests (>75% coverage)

### 16.2 Integration Tests
- [ ] Auth flow integration
- [ ] Facebook OAuth integration
- [ ] Webhook processing integration
- [ ] Message sending integration
- [ ] Campaign execution integration
- [ ] Inbox real-time integration

### 16.3 E2E Tests (Playwright)
- [ ] Login flow
- [ ] Facebook connection flow
- [ ] Contact management flow
- [ ] Segment creation flow
- [ ] Campaign creation flow
- [ ] Message sending flow (with bypass)
- [ ] Inbox reply flow
- [ ] Analytics viewing flow

### 16.4 Performance Testing
- [ ] API response time benchmarks
- [ ] Database query performance
- [ ] Bulk messaging performance
- [ ] Real-time updates performance
- [ ] Concurrent users test

### 16.5 Security Testing
- [ ] OWASP Top 10 check
- [ ] Input validation testing
- [ ] Authentication bypass attempts
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] Token security testing

### 16.6 Facebook API Testing
- [ ] All message types
- [ ] All bypass methods
- [ ] All webhook events
- [ ] Rate limit handling
- [ ] Error handling

### 16.7 Bug Fixes
- [ ] Fix all critical bugs
- [ ] Fix all high-priority bugs
- [ ] Document known issues

---

## Week 17: Polish & Documentation

### 17.1 UI/UX Refinement
- [ ] Review all pages
- [ ] Fix layout issues
- [ ] Improve responsiveness
- [ ] Enhance mobile experience
- [ ] Polish animations
- [ ] Improve accessibility

### 17.2 Error Handling
- [ ] Improve error messages
- [ ] Add user-friendly guidance
- [ ] Implement error boundaries
- [ ] Add recovery suggestions

### 17.3 Loading States
- [ ] Add skeleton loaders
- [ ] Add loading spinners
- [ ] Optimize perceived performance

### 17.4 Empty States
- [ ] Design empty states
- [ ] Add helpful CTAs
- [ ] Add illustrations

### 17.5 Technical Documentation
- [ ] Update API documentation
- [ ] Create architecture docs
- [ ] Document database schema
- [ ] Document security measures

### 17.6 User Documentation
- [ ] Create user guide
- [ ] Create quick start guide
- [ ] Create FAQ
- [ ] Create troubleshooting guide

### 17.7 Code Cleanup
- [ ] Remove console.logs
- [ ] Remove dead code
- [ ] Optimize imports
- [ ] Final refactoring

---

## Phase 7 Completion Checklist

### Testing ✓
- [ ] Unit tests passing (>80% overall)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] All critical bugs fixed

### Polish ✓
- [ ] UI polished
- [ ] Error handling improved
- [ ] Loading states implemented
- [ ] Empty states designed
- [ ] Documentation complete

---

# PHASE 8: Deployment & Handover (Week 18)

## Week 18: Production Deployment

### 18.1 VPS Setup
- [ ] Provision VPS (Ubuntu 22.04)
- [ ] Configure SSH keys
- [ ] Configure firewall (UFW)
- [ ] Install Fail2ban
- [ ] Configure swap
- [ ] Apply security hardening

### 18.2 Software Installation
- [ ] Install Node.js 20.x
- [ ] Install Docker & Docker Compose
- [ ] Install Nginx
- [ ] Install Certbot

### 18.3 Domain & SSL
- [ ] Configure DNS
- [ ] Point domain to VPS
- [ ] Generate SSL certificate
- [ ] Configure auto-renewal

### 18.4 Application Deployment
- [ ] Clone repository
- [ ] Configure environment variables
- [ ] Build Docker images
- [ ] Run database migrations
- [ ] Seed initial data
- [ ] Start containers

### 18.5 Nginx Configuration
- [ ] Configure reverse proxy
- [ ] Setup SSL termination
- [ ] Configure WebSocket proxy
- [ ] Setup static file serving
- [ ] Enable gzip compression

### 18.6 Facebook Configuration
- [ ] Update OAuth redirect URLs
- [ ] Update webhook URL
- [ ] Verify webhook
- [ ] Test all integrations

### 18.7 Monitoring Setup
- [ ] Configure Sentry
- [ ] Configure UptimeRobot
- [ ] Setup log rotation
- [ ] Configure alerts

### 18.8 Backup Configuration
- [ ] Setup automated backups
- [ ] Configure backup storage
- [ ] Test backup restoration

### 18.9 Security Final Check
- [ ] Verify HTTPS everywhere
- [ ] Check security headers
- [ ] Verify token encryption
- [ ] Check rate limiting
- [ ] Test webhook verification

### 18.10 Client Handover
- [ ] Create admin account
- [ ] Document credentials
- [ ] Conduct training session:
  - [ ] Navigation overview
  - [ ] Workspace management
  - [ ] Facebook connection
  - [ ] Contact management
  - [ ] Campaign creation
  - [ ] Bypass methods (compliance)
  - [ ] Inbox usage
  - [ ] Analytics
  - [ ] Team management
  - [ ] Settings
- [ ] Provide documentation
- [ ] Establish support channel

### 18.11 Go-Live
- [ ] Final testing in production
- [ ] Monitor for issues
- [ ] Verify all features working
- [ ] Celebrate! 🎉

---

## Phase 8 Completion Checklist

### Deployment ✓
- [ ] VPS configured and secured
- [ ] Application running
- [ ] SSL working
- [ ] Webhooks receiving events
- [ ] Monitoring active
- [ ] Backups running

### Handover ✓
- [ ] Documentation provided
- [ ] Training completed
- [ ] Support channel established
- [ ] Client sign-off received

---

# FINAL PROJECT CHECKLIST

## All Features Working ✓
- [ ] Authentication & Sessions
- [ ] Team Management
- [ ] Workspace Isolation
- [ ] Facebook OAuth
- [ ] Page Management
- [ ] Webhooks
- [ ] Contact Management
- [ ] Tags & Custom Fields
- [ ] Segment Builder
- [ ] All Bypass Methods (4 tags + OTN + Recurring)
- [ ] Bulk Messaging
- [ ] All Campaign Types
- [ ] A/B Testing
- [ ] Drip Campaigns
- [ ] Unified Inbox
- [ ] Real-time Updates
- [ ] Analytics Dashboard
- [ ] Reports
- [ ] Settings & Backups

## Quality Standards Met ✓
- [ ] Test coverage > 80%
- [ ] API response < 500ms
- [ ] Page load < 2 seconds
- [ ] No critical bugs
- [ ] Security audit passed
- [ ] Documentation complete

## Deployment Complete ✓
- [ ] Production server stable
- [ ] Monitoring active
- [ ] Backups working
- [ ] Client trained
- [ ] Project signed off

---

**END OF TO-DO LISTS**

*Track progress by checking off items as they are completed. Update status emojis:*
- 🔄 In Progress
- ✅ Complete
- ⏳ Pending
- ❌ Blocked
