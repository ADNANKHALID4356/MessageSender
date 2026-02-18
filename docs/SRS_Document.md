# Software Requirements Specification (SRS)
## Facebook Page Messaging & Management Platform
### Single-Owner Multi-Business Web Application

**Document Version:** 2.0  
**Date:** 2026-02-02  
**Prepared For:** MIbrahim282-ai (Client)  
**Prepared By:** Development Team  
**Document Type:** Technical Specification

---

## Table of Contents

1. Introduction
2. Overall Description
3. System Features & Functional Requirements
4. Non-Functional Requirements
5. External Interface Requirements
6. Database Design
7. Critical Feature: Bypassing 24-Hour Window
8. Recommended Tech Stack
9. System Architecture
10. Security Requirements
11. Deployment Guide
12. Appendices

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document provides a comprehensive blueprint for developing a single-owner, multi-business Facebook Page Messaging & Management Platform. The application enables one administrator to manage up to 5 isolated business workspaces, each connected to a separate Facebook account with multiple pages, while maintaining complete data isolation between businesses.

### 1.2 Scope

The system will provide:

- Single-owner administration with team member support
- 5 isolated business workspaces (expandable by developer only)
- Multi-page management per Facebook account
- Bulk messaging capabilities with 24-hour bypass methods
- Campaign scheduling and automation
- Contact/Lead management with segmentation
- Unified inbox per business
- Comprehensive analytics

### 1.3 Intended Audience

| Audience | Purpose |
|----------|---------|
| Developer(s) | Technical implementation guide |
| Client (Owner) | Feature validation & approval |
| QA Team | Testing specifications |

### 1.4 Definitions & Acronyms

| Term | Definition |
|------|-----------|
| Admin/Owner | Single user with full system access (client) |
| Team Member | User with limited access assigned by Admin |
| Business Workspace | Isolated environment for one Facebook account |
| FB Account | Facebook user account used for business |
| Page | Facebook Business Page connected to an FB Account |
| PSID | Page-Scoped User ID (Facebook's unique identifier) |
| OTN | One-Time Notification (Facebook opt-in feature) |
| Message Tag | Facebook-approved tags for messaging outside 24-hour window |
| Webhook | HTTP callback for real-time event notifications |

### 1.5 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM OVERVIEW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────────┐                              │
│                        │   ADMIN (Owner)     │                              │
│                        │   Single Login      │                              │
│                        └──────────┬──────────┘                              │
│                                   │                                         │
│                    ┌──────────────┴──────────────┐                          │
│                    │                             │                          │
│             ┌──────▼──────┐              ┌───────▼───────┐                  │
│             │    Team     │              │   Business    │                  │
│             │   Members   │              │  Workspaces   │                  │
│             │  (Limited)  │              │    (1-5)      │                  │
│             └─────────────┘              └───────┬───────┘                  │
│                                                  │                          │
│         ┌────────────┬────────────┬─────────────┼─────────────┐            │
│         │            │            │             │             │            │
│    ┌────▼────┐ ┌─────▼────┐ ┌────▼────┐ ┌─────▼────┐ ┌──────▼─────┐       │
│    │Business │ │Business  │ │Business │ │Business  │ │Business    │       │
│    │   1     │ │   2      │ │   3     │ │   4      │ │   5        │       │
│    │         │ │          │ │         │ │          │ │            │       │
│    │┌───────┐│ │┌────────┐│ │┌───────┐│ │┌────────┐│ │┌──────────┐│       │
│    ││Pages  ││ ││Pages   ││ ││Pages  ││ ││Pages   ││ ││Pages     ││       │
│    ││1,2,3..││ ││1,2,3...││ ││1,2,3..││ ││1,2,3...││ ││1,2,3...  ││       │
│    │└───────┘│ │└────────┘│ │└───────┘│ │└────────┘│ │└──────────┘│       │
│    └─────────┘ └──────────┘ └─────────┘ └──────────┘ └────────────┘       │
│         │            │            │             │             │            │
│         └────────────┴────────────┴─────────────┴─────────────┘            │
│                                   │                                         │
│                    ┌──────────────┴──────────────┐                          │
│                    │      CORE FEATURES          │                          │
│                    ├─────────────────────────────┤                          │
│                    │ • Bulk Messaging            │                          │
│                    │ • 24-Hour Bypass (CRITICAL) │                          │
│                    │ • Campaign Scheduling       │                          │
│                    │ • Contact Management        │                          │
│                    │ • Audience Segmentation     │                          │
│                    │ • Unified Inbox             │                          │
│                    │ • Analytics & Reporting     │                          │
│                    └─────────────────────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Overall Description

### 2.1 Product Perspective

This is a standalone, self-hosted web application designed for a single owner managing multiple businesses. Unlike SaaS platforms, this system:

- Has no multi-tenancy (single owner)
- Has no payment/subscription system
- Is self-hosted on VPS
- Has developer-controlled scalability

### 2.2 Product Functions (High-Level)

| Module | Functions |
|--------|-----------|
| Authentication | Admin login, team member login, session management |
| Business Workspaces | 5 isolated workspaces, FB account connection per workspace |
| Page Management | Connect/disconnect pages, page dashboard, sync |
| Contact Management | Contact capture, database, custom fields, import/export |
| Segmentation | Dynamic segments, filters, audience builder |
| Bulk Messaging | Message composer, personalization, attachments, bulk send |
| 24-Hour Bypass | Message tags, OTN, recurring notifications, sponsored messages |
| Campaigns | One-time, scheduled, recurring, drip campaigns |
| Unified Inbox | Conversations, replies, assignments, labels |
| Analytics | Dashboard, campaign stats, contact growth, reports |
| Team Management | Invite members, assign workspaces, permissions |
| Settings | System config, notifications, webhooks |

### 2.3 User Classes & Characteristics

| User Class | Description | Access Level |
|-----------|-------------|--------------|
| Admin (Owner) | Single system owner with full access | Full access to all features, all workspaces, system settings |
| Team Member | Staff assigned by Admin | Access only to assigned workspaces/pages, no system settings |
| Developer | System maintainer (you) | Backend access, database, workspace expansion |

### 2.4 User Permissions Matrix

| Feature | Admin | Team Member |
|---------|-------|-------------|
| System Settings | ✅ | ❌ |
| Manage Team Members | ✅ | ❌ |
| Create/Delete Workspaces | ❌ (Developer only) | ❌ |
| Connect FB Accounts | ✅ | ❌ |
| Connect Pages | ✅ | Assigned workspaces only |
| View Contacts | ✅ | Assigned workspaces only |
| Send Messages | ✅ | Assigned workspaces only |
| Create Campaigns | ✅ | Assigned workspaces only |
| View Analytics | ✅ | Assigned workspaces only |
| Access Inbox | ✅ | Assigned workspaces only |
| Export Data | ✅ | ❌ |

### 2.5 Operating Environment

| Component | Specification |
|-----------|--------------|
| Server | VPS (Ubuntu 22.04 LTS recommended) |
| Minimum RAM | 4GB (8GB recommended) |
| Storage | 50GB SSD minimum |
| Client Browsers | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| Mobile | Responsive design (tablet/mobile compatible) |

### 2.6 Design & Implementation Constraints

| Constraint | Description |
|-----------|-------------|
| Facebook API | Must comply with Facebook Platform Policies |
| Rate Limits | Facebook API rate limits (200 calls/hour/page) |
| Workspace Limit | Hard-coded to 5 (expandable by developer only) |
| Single Owner | No multi-tenant architecture |
| Self-Hosted | VPS deployment, no cloud-managed services required |

### 2.7 Assumptions & Dependencies

| Assumption/Dependency | Description |
|---------------------|-------------|
| Facebook App | A Facebook Developer App must be created and approved |
| FB Business Accounts | Client has 5 Facebook accounts for business use |
| VPS Access | Developer has SSH access for deployment & maintenance |
| Domain & SSL | Valid domain with SSL certificate for HTTPS |
| Internet | Stable internet connection on VPS |

---

## 3. System Features & Functional Requirements

### 3.1 Authentication & Session Management

#### FR-1.1: Admin Login

| ID | Requirement |
|----|-------------|
| FR-1.1.1 | System shall provide a login page with username/password fields |
| FR-1.1.2 | System shall authenticate Admin against stored credentials |
| FR-1.1.3 | System shall hash passwords using bcrypt (cost factor 12) |
| FR-1.1.4 | System shall implement rate limiting (5 failed attempts = 15-min lockout) |
| FR-1.1.5 | System shall create a secure session upon successful login |
| FR-1.1.6 | System shall support "Remember Me" option (30-day session) |

#### FR-1.2: Team Member Login

| ID | Requirement |
|----|-------------|
| FR-1.2.1 | System shall allow team members to login with credentials set by Admin |
| FR-1.2.2 | System shall redirect team members to their assigned workspace(s) |
| FR-1.2.3 | System shall restrict team members from accessing unassigned workspaces |

#### FR-1.3: Session Management

| ID | Requirement |
|----|-------------|
| FR-1.3.1 | System shall use JWT tokens for session management |
| FR-1.3.2 | Access token expiration: 1 hour |
| FR-1.3.3 | Refresh token expiration: 7 days (30 days with "Remember Me") |
| FR-1.3.4 | System shall allow Admin to view active sessions |
| FR-1.3.5 | System shall allow Admin to terminate any session |
| FR-1.3.6 | System shall log all login attempts with IP and timestamp |

#### FR-1.4: Password Management

| ID | Requirement |
|----|-------------|
| FR-1.4.1 | System shall allow Admin to change their password |
| FR-1.4.2 | System shall allow Admin to reset team member passwords |
| FR-1.4.3 | System shall enforce minimum password requirements (8 chars, 1 uppercase, 1 number) |

### 3.2 Business Workspace Management

#### FR-2.1: Workspace Structure

| ID | Requirement |
|----|-------------|
| FR-2.1.1 | System shall support exactly 5 business workspaces (developer-expandable) |
| FR-2.1.2 | Each workspace shall be completely isolated from others |
| FR-2.1.3 | Each workspace shall have its own: contacts, campaigns, inbox, analytics |
| FR-2.1.4 | System shall display workspace selector in navigation |

#### FR-2.2: Workspace Configuration

| ID | Requirement |
|----|-------------|
| FR-2.2.1 | Admin shall configure workspace name and description |
| FR-2.2.2 | Admin shall upload workspace logo/icon |
| FR-2.2.3 | Admin shall set workspace color theme for visual distinction |
| FR-2.2.4 | Admin shall enable/disable individual workspaces |

#### FR-2.3: Workspace Dashboard

| ID | Requirement |
|----|-------------|
| FR-2.3.1 | Each workspace shall have a dedicated dashboard |
| FR-2.3.2 | Dashboard shall display: connected pages, total contacts, recent activity |
| FR-2.3.3 | Dashboard shall show quick stats: messages sent (24h, 7d, 30d) |
| FR-2.3.4 | Dashboard shall display recent campaigns with status |

### 3.3 Facebook Account & Page Connection

#### FR-3.1: Facebook Account Connection (Per Workspace)

| ID | Requirement |
|----|-------------|
| FR-3.1.1 | Each workspace shall connect to ONE Facebook account |
| FR-3.1.2 | System shall initiate Facebook OAuth flow for connection |
| FR-3.1.3 | System shall request permissions: pages_messaging, pages_manage_metadata, pages_read_engagement, pages_show_list, pages_read_user_content |
| FR-3.1.4 | System shall store User Access Token securely (encrypted) |
| FR-3.1.5 | System shall handle token refresh automatically |
| FR-3.1.6 | System shall display connection status (Connected/Disconnected/Error) |
| FR-3.1.7 | Admin shall be able to disconnect and reconnect FB account |

#### FR-3.2: Page Management

| ID | Requirement |
|----|-------------|
| FR-3.2.1 | System shall list all pages accessible from connected FB account |
| FR-3.2.2 | Admin shall select which pages to activate for the workspace |
| FR-3.2.3 | System shall store Page Access Token per page (encrypted) |
| FR-3.2.4 | System shall support unlimited pages per workspace |
| FR-3.2.5 | System shall sync page data (name, picture, followers) every 15 minutes |
| FR-3.2.6 | System shall display page status: Active, Inactive, Token Error |

#### FR-3.3: Page Dashboard

| ID | Requirement |
|----|-------------|
| FR-3.3.1 | System shall display all connected pages in workspace |
| FR-3.3.2 | Each page card shall show: name, picture, followers, message count |
| FR-3.3.3 | System shall show page health indicators (token status, webhook status) |
| FR-3.3.4 | System shall allow quick actions: view contacts, send message, view inbox |

### 3.4 Contact/Lead Management

#### FR-4.1: Contact Acquisition

| ID | Requirement |
|----|-------------|
| FR-4.1.1 | System shall automatically capture contacts who message any connected page |
| FR-4.1.2 | System shall receive contact data via Facebook webhooks |
| FR-4.1.3 | System shall store: PSID, first name, last name, profile picture, locale, timezone |
| FR-4.1.4 | System shall record first interaction timestamp |
| FR-4.1.5 | System shall update last interaction timestamp on each message |
| FR-4.1.6 | System shall track contact source (organic, ad, comment reply, referral) |

#### FR-4.2: Contact Database

| ID | Requirement |
|----|-------------|
| FR-4.2.1 | System shall provide searchable contact list per workspace |
| FR-4.2.2 | System shall support filters: page, date range, tags, engagement level |
| FR-4.2.3 | System shall support sorting: name, date added, last active |
| FR-4.2.4 | System shall display contact count per workspace |
| FR-4.2.5 | System shall paginate results (50 per page default) |

#### FR-4.3: Contact Profile

| ID | Requirement |
|----|-------------|
| FR-4.3.1 | System shall display full contact profile with all data |
| FR-4.3.2 | System shall show complete message history with contact |
| FR-4.3.3 | System shall display 24-hour window status (Active/Expired) |
| FR-4.3.4 | System shall show bypass options available (OTN token, recurring subscription) |
| FR-4.3.5 | Admin shall add/edit custom fields on contact |
| FR-4.3.6 | Admin shall add/remove tags on contact |
| FR-4.3.7 | Admin shall add internal notes on contact |

#### FR-4.4: Custom Fields

| ID | Requirement |
|----|-------------|
| FR-4.4.1 | Admin shall create custom fields per workspace |
| FR-4.4.2 | Supported field types: Text, Number, Date, Dropdown, Checkbox |
| FR-4.4.3 | Custom fields shall be available for personalization in messages |
| FR-4.4.4 | Custom fields shall be usable in segment filters |

#### FR-4.5: Contact Import/Export

| ID | Requirement |
|----|-------------|
| FR-4.5.1 | Admin shall import contacts via CSV |
| FR-4.5.2 | Import shall support field mapping |
| FR-4.5.3 | Import shall validate PSID format |
| FR-4.5.4 | Admin shall export contacts to CSV/Excel |
| FR-4.5.5 | Export shall include all contact fields and tags |

#### FR-4.6: Contact Engagement Scoring

| ID | Requirement |
|----|-------------|
| FR-4.6.1 | System shall calculate engagement score per contact |
| FR-4.6.2 | Score factors: message frequency, response rate, recency |
| FR-4.6.3 | System shall categorize: Hot, Warm, Cold, Inactive |
| FR-4.6.4 | Score shall update automatically on interactions |

### 3.5 Audience Segmentation

#### FR-5.1: Segment Creation

| ID | Requirement |
|----|-------------|
| FR-5.1.1 | Admin shall create segments per workspace |
| FR-5.1.2 | System shall provide segment builder with visual interface |
| FR-5.1.3 | Segments shall be named and described |
| FR-5.1.4 | System shall support both static and dynamic segments |

#### FR-5.2: Segment Filters

| ID | Requirement |
|----|-------------|
| FR-5.2.1 | System shall support filters on:<br/>• Page (which page contact messaged)<br/>• First interaction date<br/>• Last interaction date<br/>• Tags (has/doesn't have)<br/>• Custom fields (equals, contains, greater than, less than)<br/>• Engagement score (Hot, Warm, Cold, Inactive)<br/>• 24-hour window status (Active/Expired)<br/>• OTN token status (Has valid token/No token)<br/>• Recurring notification status (Subscribed/Not subscribed)<br/>• Message status (Received campaign X / Not received)<br/>• Source (Organic, Ad, Comment, Referral) |

#### FR-5.3: Segment Logic

| ID | Requirement |
|----|-------------|
| FR-5.3.1 | System shall support AND logic (all conditions must match) |
| FR-5.3.2 | System shall support OR logic (any condition matches) |
| FR-5.3.3 | System shall support nested conditions (groups) |
| FR-5.3.4 | System shall support NOT logic (exclude matching) |

#### FR-5.4: Segment Management

| ID | Requirement |
|----|-------------|
| FR-5.4.1 | System shall display real-time segment size |
| FR-5.4.2 | System shall update dynamic segments automatically |
| FR-5.4.3 | Admin shall preview segment contacts before saving |
| FR-5.4.4 | Admin shall duplicate existing segments |
| FR-5.4.5 | Admin shall delete segments (with confirmation) |

### 3.6 Bulk Messaging Engine (CORE FEATURE)

#### FR-6.1: Message Composer

| ID | Requirement |
|----|-------------|
| FR-6.1.1 | System shall provide rich message composer |
| FR-6.1.2 | System shall support plain text messages |
| FR-6.1.3 | System shall support message formatting (bold, italic - where FB allows) |
| FR-6.1.4 | System shall support emoji insertion |
| FR-6.1.5 | System shall display character count (Facebook limit: 2000 chars) |

#### FR-6.2: Personalization

| ID | Requirement |
|----|-------------|
| FR-6.2.1 | System shall support personalization tokens:<br/>• {{first_name}}<br/>• {{last_name}}<br/>• {{full_name}}<br/>• {{page_name}}<br/>• {{custom_field_name}} |
| FR-6.2.2 | System shall provide token picker/inserter UI |
| FR-6.2.3 | System shall set fallback values for empty fields |
| FR-6.2.4 | System shall preview personalized message before sending |

#### FR-6.3: Attachments

| ID | Requirement |
|----|-------------|
| FR-6.3.1 | System shall support image attachments (JPG, PNG, GIF) |
| FR-6.3.2 | Image size limit: 8MB |
| FR-6.3.3 | System shall support video attachments (MP4) |
| FR-6.3.4 | Video size limit: 25MB |
| FR-6.3.5 | System shall support file attachments (PDF, DOC) |
| FR-6.3.6 | File size limit: 25MB |
| FR-6.3.7 | System shall upload attachments to Facebook before sending |
| FR-6.3.8 | System shall cache attachment IDs for reuse |

#### FR-6.4: Message Templates

| ID | Requirement |
|----|-------------|
| FR-6.4.1 | System shall support button templates |
| FR-6.4.2 | Button types: URL, Postback, Call |
| FR-6.4.3 | Maximum 3 buttons per template |
| FR-6.4.4 | System shall support quick reply buttons |
| FR-6.4.5 | Maximum 13 quick replies |
| FR-6.4.6 | System shall support generic templates (cards with image, title, subtitle) |

#### FR-6.5: Saved Templates

| ID | Requirement |
|----|-------------|
| FR-6.5.1 | Admin shall save message templates for reuse |
| FR-6.5.2 | Templates shall be organized by category |
| FR-6.5.3 | Templates shall be workspace-specific |
| FR-6.5.4 | Admin shall edit and delete templates |

#### FR-6.6: Recipient Selection

| ID | Requirement |
|----|-------------|
| FR-6.6.1 | Admin shall select recipients by:<br/>• All contacts in workspace<br/>• Specific page(s) contacts<br/>• Saved segment<br/>• Manual selection (checkbox)<br/>• CSV upload |
| FR-6.6.2 | System shall display total recipient count |
| FR-6.6.3 | System shall exclude unsubscribed contacts automatically |
| FR-6.6.4 | System shall show breakdown by 24-hour window status |

#### FR-6.7: Send Options

| ID | Requirement |
|----|-------------|
| FR-6.7.1 | System shall support immediate sending |
| FR-6.7.2 | System shall support scheduled sending |
| FR-6.7.3 | System shall display estimated completion time |
| FR-6.7.4 | System shall require bypass method selection for expired contacts |

#### FR-6.8: Bulk Send Processing

| ID | Requirement |
|----|-------------|
| FR-6.8.1 | System shall queue messages for async processing |
| FR-6.8.2 | System shall process via background job workers |
| FR-6.8.3 | System shall respect Facebook rate limits (200/hour/page) |
| FR-6.8.4 | System shall implement intelligent rate distribution across pages |
| FR-6.8.5 | System shall retry failed messages (max 3 attempts) |
| FR-6.8.6 | System shall use exponential backoff on rate limit errors |
| FR-6.8.7 | System shall log all send attempts with status |

#### FR-6.9: Send Progress & Status

| ID | Requirement |
|----|-------------|
| FR-6.9.1 | System shall display real-time send progress |
| FR-6.9.2 | System shall show: Queued, Sending, Sent, Delivered, Failed |
| FR-6.9.3 | System shall allow cancellation of queued messages |
| FR-6.9.4 | System shall send notification on bulk send completion |

### 3.7 ⚠️ CRITICAL FEATURE: 24-Hour Bypass System

This is the most critical and non-negotiable feature. All bypass methods must be implemented thoroughly.

#### FR-7.1: 24-Hour Window Tracking

| ID | Requirement |
|----|-------------|
| FR-7.1.1 | System shall track last interaction timestamp per contact per page |
| FR-7.1.2 | System shall calculate 24-hour window expiration |
| FR-7.1.3 | System shall display window status on contact profile |
| FR-7.1.4 | System shall display window status in recipient selection |
| FR-7.1.5 | System shall categorize contacts: Within Window, Expired |

#### FR-7.2: Message Tags Implementation

| ID | Requirement |
|----|-------------|
| FR-7.2.1 | System shall implement all Facebook-approved Message Tags:<br/><br/>| Tag | Use Case | Validity |<br/>|---|---|---|<br/>| CONFIRMED_EVENT_UPDATE | Reminders, changes for confirmed events | Unlimited after window |<br/>| POST_PURCHASE_UPDATE | Order status, shipping, receipts | Unlimited after window |<br/>| ACCOUNT_UPDATE | Account changes, payment issues, alerts | Unlimited after window |<br/>| HUMAN_AGENT | Live agent support responses | 7 days after last message | |
| FR-7.2.2 | System shall allow Admin to select message tag when sending |
| FR-7.2.3 | System shall display compliance warning for each tag |
| FR-7.2.4 | System shall track tag usage per contact for compliance monitoring |
| FR-7.2.5 | System shall auto-suggest appropriate tag based on message content (optional AI) |

#### FR-7.3: One-Time Notification (OTN) System

| ID | Requirement |
|----|-------------|
| FR-7.3.1 | System shall generate OTN opt-in request messages |
| FR-7.3.2 | OTN request shall include: title, image (optional), payload |
| FR-7.3.3 | System shall send OTN requests to contacts |
| FR-7.3.4 | System shall receive OTN opt-in via webhook |
| FR-7.3.5 | System shall store OTN token with expiration (per Facebook policy) |
| FR-7.3.6 | System shall mark OTN token as used after sending (single-use) |
| FR-7.3.7 | System shall display OTN status on contact profile |
| FR-7.3.8 | Admin shall send message using available OTN token |
| FR-7.3.9 | System shall track OTN opt-in rate analytics |

#### FR-7.4: Recurring Notifications System

| ID | Requirement |
|----|-------------|
| FR-7.4.1 | System shall implement Facebook Recurring Notifications API |
| FR-7.4.2 | System shall support frequency options: DAILY, WEEKLY, MONTHLY |
| FR-7.4.3 | System shall generate recurring notification opt-in requests |
| FR-7.4.4 | System shall receive opt-in confirmation via webhook |
| FR-7.4.5 | System shall store recurring notification token with frequency |
| FR-7.4.6 | System shall track token expiration (per Facebook policy) |
| FR-7.4.7 | System shall send messages using recurring notification token |
| FR-7.4.8 | System shall respect frequency limits (daily = 1/day, weekly = 1/week, etc.) |
| FR-7.4.9 | System shall handle opt-out requests immediately |
| FR-7.4.10 | System shall re-request opt-in before token expiration |

#### FR-7.5: Sponsored Messages (Paid Option)

| ID | Requirement |
|----|-------------|
| FR-7.5.1 | System shall integrate with Facebook Marketing API |
| FR-7.5.2 | System shall allow creating sponsored message campaigns |
| FR-7.5.3 | System shall require connected Facebook Ad Account |
| FR-7.5.4 | System shall track sponsored message delivery and cost |
| FR-7.5.5 | System shall display sponsored message analytics |

#### FR-7.6: Bypass Method Auto-Selection

| ID | Requirement |
|----|-------------|
| FR-7.6.1 | System shall automatically determine best bypass method |
| FR-7.6.2 | Priority order:<br/>1. Within 24-hour window (no bypass needed)<br/>2. Valid OTN token available<br/>3. Active recurring notification subscription<br/>4. Applicable message tag<br/>5. Sponsored message (if enabled)<br/>6. Cannot send (blocked) |
| FR-7.6.3 | System shall display bypass method per recipient in send preview |
| FR-7.6.4 | Admin shall override auto-selected bypass method |

#### FR-7.7: Compliance & Monitoring

| ID | Requirement |
|----|-------------|
| FR-7.7.1 | System shall display compliance warnings before sending |
| FR-7.7.2 | System shall log all bypass method usage |
| FR-7.7.3 | System shall track message tag usage frequency per contact |
| FR-7.7.4 | System shall alert on potential policy violation patterns |
| FR-7.7.5 | System shall implement cool-down periods between messages |
| FR-7.7.6 | System shall provide compliance audit report |

### 3.8 Campaign Management

#### FR-8.1: Campaign Types

| ID | Requirement |
|----|-------------|
| FR-8.1.1 | System shall support campaign types:<br/><br/>| Type | Description |<br/>|---|---|<br/>| One-Time | Single send to selected audience |<br/>| Scheduled | One-time send at specified date/time |<br/>| Recurring | Repeated send at intervals (daily, weekly, monthly) |<br/>| Drip | Automated sequence with delays between messages |<br/>| Trigger-Based | Send when contact meets certain criteria | |

#### FR-8.2: Campaign Creation Wizard

| ID | Requirement |
|----|-------------|
| FR-8.2.1 | System shall provide step-by-step campaign wizard |
| FR-8.2.2 | Steps: Name → Audience → Message → Bypass Method → Schedule → Review |
| FR-8.2.3 | System shall validate each step before proceeding |
| FR-8.2.4 | System shall allow saving as draft at any step |
| FR-8.2.5 | System shall display campaign summary before launch |

#### FR-8.3: Drip Campaign Builder

| ID | Requirement |
|----|-------------|
| FR-8.3.1 | System shall provide visual drip sequence builder |
| FR-8.3.2 | Admin shall add multiple messages to sequence |
| FR-8.3.3 | Admin shall set delay between messages (minutes, hours, days) |
| FR-8.3.4 | Admin shall set conditions for next message (e.g., if replied, if clicked) |
| FR-8.3.5 | System shall track contact progress through drip sequence |
| FR-8.3.6 | Admin shall remove contacts from drip mid-sequence |

#### FR-8.4: Campaign Scheduling

| ID | Requirement |
|----|-------------|
| FR-8.4.1 | System shall support date/time picker for scheduling |
| FR-8.4.2 | System shall support timezone selection |
| FR-8.4.3 | System shall support "Send at optimal time" (based on contact engagement) |
| FR-8.4.4 | System shall display scheduled campaigns in calendar view |
| FR-8.4.5 | System shall send reminder before scheduled campaign launches |

#### FR-8.5: Campaign Management

| ID | Requirement |
|----|-------------|
| FR-8.5.1 | System shall list all campaigns with status |
| FR-8.5.2 | Campaign statuses: Draft, Scheduled, Running, Paused, Completed, Cancelled |
| FR-8.5.3 | Admin shall pause running campaigns |
| FR-8.5.4 | Admin shall resume paused campaigns |
| FR-8.5.5 | Admin shall cancel scheduled/running campaigns |
| FR-8.5.6 | Admin shall duplicate campaigns |
| FR-8.5.7 | Admin shall archive old campaigns |

#### FR-8.6: A/B Testing

| ID | Requirement |
|----|-------------|
| FR-8.6.1 | System shall support A/B testing for campaigns |
| FR-8.6.2 | Admin shall create 2-4 message variants |
| FR-8.6.3 | System shall split audience randomly or by percentage |
| FR-8.6.4 | System shall track performance per variant |
| FR-8.6.5 | System shall determine winner based on: delivery rate, response rate, click rate |
| FR-8.6.6 | System shall optionally auto-send winning variant to remaining audience |

### 3.9 Unified Inbox

#### FR-9.1: Inbox Overview

| ID | Requirement |
|----|-------------|
| FR-9.1.1 | System shall provide unified inbox per workspace |
| FR-9.1.2 | Inbox shall display all conversations from all pages in workspace |
| FR-9.1.3 | System shall receive messages in real-time via webhooks |
| FR-9.1.4 | System shall display unread message count |
| FR-9.1.5 | System shall support inbox tabs: All, Unread, Assigned to Me |

#### FR-9.2: Conversation List

| ID | Requirement |
|----|-------------|
| FR-9.2.1 | System shall display conversation list with: contact name, last message preview, timestamp |
| FR-9.2.2 | System shall indicate which page the conversation is from |
| FR-9.2.3 | System shall display conversation status icon (Open, Pending, Resolved) |
| FR-9.2.4 | System shall display assignment indicator |
| FR-9.2.5 | System shall sort by: Most Recent, Oldest, Unread First |
| FR-9.2.6 | System shall support search within inbox |

#### FR-9.3: Conversation View

| ID | Requirement |
|----|-------------|
| FR-9.3.1 | System shall display full conversation thread |
| FR-9.3.2 | System shall show message timestamps |
| FR-9.3.3 | System shall display message status (Sent, Delivered, Read) |
| FR-9.3.4 | System shall display 24-hour window countdown |
| FR-9.3.5 | System shall show contact profile in sidebar |
| FR-9.3.6 | System shall display available bypass options for expired window |

#### FR-9.4: Reply Functionality

| ID | Requirement |
|----|-------------|
| FR-9.4.1 | System shall provide reply composer in conversation view |
| FR-9.4.2 | System shall support text replies |
| FR-9.4.3 | System shall support attachment replies |
| FR-9.4.4 | System shall support quick replies / canned responses |
| FR-9.4.5 | System shall warn if 24-hour window expired |
| FR-9.4.6 | System shall suggest bypass method if window expired |
| FR-9.4.7 | System shall allow selecting bypass method for reply |

#### FR-9.5: Conversation Management

| ID | Requirement |
|----|-------------|
| FR-9.5.1 | Admin shall assign conversations to team members |
| FR-9.5.2 | Admin/Team member shall change conversation status |
| FR-9.5.3 | System shall support conversation labels/tags |
| FR-9.5.4 | Admin shall add internal notes (not visible to contact) |
| FR-9.5.5 | System shall log all conversation actions |

#### FR-9.6: Canned Responses

| ID | Requirement |
|----|-------------|
| FR-9.6.1 | Admin shall create canned responses per workspace |
| FR-9.6.2 | Canned responses shall support personalization tokens |
| FR-9.6.3 | System shall provide quick access to canned responses in composer |
| FR-9.6.4 | System shall support keyboard shortcuts for canned responses |

### 3.10 Analytics & Reporting

#### FR-10.1: Dashboard Analytics

| ID | Requirement |
|----|-------------|
| FR-10.1.1 | System shall provide analytics dashboard per workspace |
| FR-10.1.2 | Dashboard shall display key metrics:<br/><br/>| Metric | Description |<br/>|---|---|<br/>| Total Contacts | Count of all contacts in workspace |<br/>| New Contacts | Contacts added in selected period |<br/>| Messages Sent | Total outbound messages |<br/>| Messages Received | Total inbound messages |<br/>| Delivery Rate | % messages successfully delivered |<br/>| Response Rate | % contacts who replied |<br/>| Active Conversations | Conversations with recent activity | |
| FR-10.1.3 | System shall support date range filtering |
| FR-10.1.4 | System shall display comparison with previous period |
| FR-10.1.5 | System shall show trend charts (line/bar graphs) |

#### FR-10.2: Campaign Analytics

| ID | Requirement |
|----|-------------|
| FR-10.2.1 | System shall track per campaign:<br/><br/>| Metric | Description |<br/>|---|---|<br/>| Total Recipients | Contacts targeted |<br/>| Sent | Messages successfully sent |<br/>| Delivered | Messages confirmed delivered |<br/>| Failed | Messages that failed |<br/>| Opened | Messages opened (if trackable) |<br/>| Clicked | Link/button clicks |<br/>| Replied | Contacts who replied |<br/>| Unsubscribed | Contacts who opted out |<br/>| Conversion Rate | Custom goal completions | |
| FR-10.2.2 | System shall provide campaign comparison view |
| FR-10.2.3 | System shall display A/B test results |

#### FR-10.3: Contact Analytics

| ID | Requirement |
|----|-------------|
| FR-10.3.1 | System shall track contact growth over time |
| FR-10.3.2 | System shall show contacts by source |
| FR-10.3.3 | System shall display engagement distribution |
| FR-10.3.4 | System shall show 24-hour window status breakdown |
| FR-10.3.5 | System shall track OTN/Recurring notification opt-in rates |

#### FR-10.4: Page Analytics

| ID | Requirement |
|----|-------------|
| FR-10.4.1 | System shall display analytics per page |
| FR-10.4.2 | System shall show page comparison within workspace |
| FR-10.4.3 | System shall track response time metrics |

#### FR-10.5: Reports

| ID | Requirement |
|----|-------------|
| FR-10.5.1 | Admin shall generate reports |
| FR-10.5.2 | Report types: Campaign Summary, Contact Growth, Engagement, Compliance |
| FR-10.5.3 | System shall export reports as PDF, CSV, Excel |
| FR-10.5.4 | Admin shall schedule automated report delivery via email |

### 3.11 Team Management

#### FR-11.1: Team Member Management

| ID | Requirement |
|----|-------------|
| FR-11.1.1 | Admin shall invite team members via email |
| FR-11.1.2 | System shall send invitation email with setup link |
| FR-11.1.3 | Team member shall set password on first login |
| FR-11.1.4 | Admin shall view all team members |
| FR-11.1.5 | Admin shall edit team member details |
| FR-11.1.6 | Admin shall deactivate/reactivate team members |
| FR-11.1.7 | Admin shall delete team members |

#### FR-11.2: Workspace Assignment

| ID | Requirement |
|----|-------------|
| FR-11.2.1 | Admin shall assign team members to specific workspaces |
| FR-11.2.2 | Team member can be assigned to multiple workspaces |
| FR-11.2.3 | Team member shall only see assigned workspaces |
| FR-11.2.4 | Admin shall set permission level per workspace:<br/><br/>| Permission | Description |<br/>|---|---|<br/>| View Only | Can view contacts, campaigns, inbox (no actions) |<br/>| Operator | Can send messages, reply in inbox, create campaigns |<br/>| Manager | All operator permissions + manage contacts, segments | |

#### FR-11.3: Activity Monitoring

| ID | Requirement |
|----|-------------|
| FR-11.3.1 | System shall log all team member actions |
| FR-11.3.2 | Admin shall view activity log |
| FR-11.3.3 | Log shall include: user, action, timestamp, details |
| FR-11.3.4 | Admin shall filter activity by user, action type, date |

### 3.12 System Settings

#### FR-12.1: General Settings

| ID | Requirement |
|----|-------------|
| FR-12.1.1 | Admin shall configure application name |
| FR-12.1.2 | Admin shall upload application logo |
| FR-12.1.3 | Admin shall set default timezone |
| FR-12.1.4 | Admin shall configure date/time format |

#### FR-12.2: Facebook App Settings

| ID | Requirement |
|----|-------------|
| FR-12.2.1 | Developer shall configure Facebook App ID |
| FR-12.2.2 | Developer shall configure Facebook App Secret |
| FR-12.2.3 | Developer shall configure Webhook Verify Token |
| FR-12.2.4 | System shall display Facebook App connection status |

#### FR-12.3: Email Settings

| ID | Requirement |
|----|-------------|
| FR-12.3.1 | Admin shall configure SMTP settings for email |
| FR-12.3.2 | System shall support email providers: SMTP, SendGrid, AWS SES |
| FR-12.3.3 | Admin shall test email configuration |

#### FR-12.4: Notification Settings

| ID | Requirement |
|----|-------------|
| FR-12.4.1 | Admin shall configure notification preferences |
| FR-12.4.2 | Notification types: New message, Campaign complete, Error alerts |
| FR-12.4.3 | Notification channels: In-app, Email |

#### FR-12.5: Backup & Maintenance

| ID | Requirement |
|----|-------------|
| FR-12.5.1 | Admin shall trigger manual database backup |
| FR-12.5.2 | System shall support automated scheduled backups |
| FR-12.5.3 | Admin shall download backup files |
| FR-12.5.4 | Admin shall view system health status |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | Page load time | < 2 seconds |
| NFR-1.2 | API response time | < 500ms (95th percentile) |
| NFR-1.3 | Bulk message processing | 5,000 messages/hour (respecting FB limits) |
| NFR-1.4 | Concurrent users | 50+ simultaneous users |
| NFR-1.5 | Database query time | < 100ms |
| NFR-1.6 | Real-time message delivery | < 2 seconds from FB webhook |

### 4.2 Scalability

| ID | Requirement |
|----|-------------|
| NFR-2.1 | System shall handle 100,000+ contacts per workspace |
| NFR-2.2 | System shall handle 500,000+ total contacts |
| NFR-2.3 | System shall handle 1,000,000+ stored messages |
| NFR-2.4 | System shall support horizontal scaling (add workers) |

### 4.3 Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-3.1 | System uptime | 99.5% |
| NFR-3.2 | Planned maintenance window | < 2 hours/month |
| NFR-3.3 | Recovery Time Objective (RTO) | < 4 hours |
| NFR-3.4 | Recovery Point Objective (RPO) | < 1 hour |

### 4.4 Reliability

| ID | Requirement |
|----|-------------|
| NFR-4.1 | Message delivery guarantee (at-least-once) |
| NFR-4.2 | Automatic retry on transient failures |
| NFR-4.3 | Graceful degradation on Facebook API issues |
| NFR-4.4 | Data backup every 6 hours |

### 4.5 Usability

| ID | Requirement |
|----|-------------|
| NFR-5.1 | Responsive design (desktop, tablet, mobile) |
| NFR-5.2 | Intuitive UI requiring minimal training |
| NFR-5.3 | Consistent design patterns throughout |
| NFR-5.4 | Loading indicators for async operations |
| NFR-5.5 | Clear error messages with actionable guidance |

### 4.6 Security

| ID | Requirement |
|----|-------------|
| NFR-6.1 | All data encrypted in transit (HTTPS/TLS 1.2+) |
| NFR-6.2 | Sensitive data encrypted at rest (AES-256) |
| NFR-6.3 | Password hashing using bcrypt |
| NFR-6.4 | Protection against OWASP Top 10 vulnerabilities |
| NFR-6.5 | Session timeout after inactivity |
| NFR-6.6 | Rate limiting on all endpoints |

---

## 5. External Interface Requirements

### 5.1 Facebook API Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FACEBOOK API INTEGRATION MAP                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         GRAPH API v18.0+                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  OAUTH & AUTHENTICATION                                             │   │
│  │  ├── /oauth/access_token     → Get user access token                │   │
│  │  ├── /me/accounts            → List user's pages                    │   │
│  │  └── /{page-id}              → Get page access token                │   │
│  │                                                                     │   │
│  │  PAGE DATA                                                          │   │
│  │  ├── /{page-id}              → Page details (name, picture)         │   │
│  │  ├── /{page-id}/picture      → Page profile picture                 │   │
│  │  └── /{page-id}/insights     → Page analytics                       │   │
│  │                                                                     │   │
│  │  CONTACT DATA                                                       │   │
│  │  └── /{psid}                 → User profile (name, picture)         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MESSENGER PLATFORM API                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  SEND API                                                           │   │
│  │  ├── /me/messages            → Send messages                        │   │
│  │  │   ├── messaging_type: RESPONSE (within 24h)                      │   │
│  │  │   ├── messaging_type: UPDATE (within 24h)                        │   │
│  │  │   ├── messaging_type: MESSAGE_TAG (outside 24h)                  │   │
│  │  │   └── tag: CONFIRMED_EVENT_UPDATE | POST_PURCHASE_UPDATE |       │   │
│  │  │         ACCOUNT_UPDATE | HUMAN_AGENT                             │   │
│  │  │                                                                  │   │
│  │  ├── /me/message_attachments → Upload attachments                   │   │
│  │  └── /{attachment-id}        → Reuse uploaded attachments           │   │
│  │                                                                     │   │
│  │  ONE-TIME NOTIFICATION (OTN)                                        │   │
│  │  ├── Send OTN Request        → Template with notify_me button       │   │
│  │  └── Send with OTN Token     → one_time_notif_token in payload      │   │
│  │                                                                     │   │
│  │  RECURRING NOTIFICATIONS                                            │   │
│  │  ├── Send Opt-In Request     → Template with notification_messages  │   │
│  │  └── Send with Token         → notification_messages_token          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         WEBHOOKS                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  SUBSCRIBED EVENTS                                                  │   │
│  │  ├── messages                → Incoming messages                    │   │
│  │  ├── messaging_postbacks     → Button clicks                        │   │
│  │  ├── messaging_optins        → OTN & Recurring opt-ins              │   │
│  │  ├── messaging_optouts       → User opt-outs                        │   │
│  │  ├── message_deliveries      → Delivery confirmations               │   │
│  │  ├── message_reads           → Read receipts                        │   │
│  │  └── messaging_referrals     → Referral tracking                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MARKETING API (Optional)                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  SPONSORED MESSAGES                                                 │   │
│  │  ├── /act_{ad-account-id}/sponsored_message_ads                     │   │
│  │  └── Requires connected Facebook Ad Account                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Required Facebook Permissions

| Permission | Purpose | App Review Required |
|-----------|---------|-------------------|
| pages_messaging | Send and receive messages | Yes |
| pages_manage_metadata | Manage page settings, webhooks | Yes |
| pages_read_engagement | Read page interactions | Yes |
| pages_show_list | List user's pages | No |
| pages_read_user_content | Read user posts/comments | Yes |
| public_profile | Basic user info | No |
| email | User email (for FB login) | No |

### 5.3 Webhook Configuration

```json
{
  "object": "page",
  "callback_url": "https://yourdomain.com/api/webhooks/facebook",
  "verify_token": "YOUR_SECURE_VERIFY_TOKEN",
  "fields": [
    "messages",
    "messaging_postbacks", 
    "messaging_optins",
    "messaging_optouts",
    "message_deliveries",
    "message_reads",
    "messaging_referrals"
  ]
}
```

### 5.4 Third-Party Services

| Service | Purpose | Required/Optional |
|---------|---------|------------------|
| SMTP Provider | Transactional emails (invites, alerts) | Required |
| SendGrid | Alternative email provider | Optional |
| AWS S3 | File storage for attachments/backups | Optional (can use local) |
| Redis | Caching, sessions, job queue | Required |

### 5.5 User Interface Requirements

| Screen | Description |
|--------|-------------|
| Login | Simple username/password form |
| Dashboard | Overview with workspace selector |
| Workspace Dashboard | Per-workspace metrics and quick actions |
| Pages | List and manage connected pages |
| Contacts | Searchable contact database |
| Contact Profile | Detailed contact view with history |
| Segments | Segment builder and list |
| Campaigns | Campaign list and management |
| Campaign Builder | Step-by-step campaign creation |
| Bulk Message | Quick send interface |
| Inbox | Unified conversation view |
| Analytics | Charts and metrics |
| Team | Team member management |
| Settings | System configuration |

---

## 6. Database Design

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌──────────────┐                               │
│                              │    Admin     │                               │
│                              │   (Single)   │                               │
│                              └───────┬──────┘                               │
│                                      │                                      │
│                         ┌────────────┼────────────┐                         │
│                         │            │            │                         │
│                         ▼            │            ▼                         │
│                  ┌──────────────┐    │     ┌──────────────┐                 │
│                  │    Users     │    │     │   Settings   │                 │
│                  │(Team Members)│    │     │              │                 │
│                  └───────┬──────┘    │     └──────────────┘                 │
│                          │           │                                      │
│                          │           ▼                                      │
│                          │    ┌──────────────┐                              │
│                          │    │  Workspaces  │                              │
│                          │    │    (1-5)     │                              │
│                          │    └───────┬──────┘                              │
│                          │            │                                     │
│                          ▼            │                                     │
│                  ┌──────────────┐     │                                     │
│                  │UserWorkspace │     │                                     │
│                  │ (Junction)   │─────┤                                     │
│                  └──────────────┘     │                                     │
│                                       │                                     │
│            ┌──────────────────────────┼──────────────────────────┐          │
│            │                          │                          │          │
│            ▼                          ▼                          ▼          │
│     ┌──────────────┐          ┌──────────────┐          ┌──────────────┐   │
│     │  FB Account  │          │    Pages     │          │   Segments   │   │
│     │              │──────────│              │          │              │   │
│     └──────────────┘          └───────┬──────┘          └──────────────┘   │
│                                       │                                     │
│                    ┌──────────────────┼──────────────────┐                  │
│                    │                  │                  │                  │
│                    ▼                  ▼                  ▼                  │
│             ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│             │   Contacts   │  │  Campaigns   │  │Conversations │           │
│             │              │  │              │  │              │           │
│             └───────┬──────┘  └───────┬──────┘  └───────┬──────┘           │
│                     │                 │                 │                   │
│       ┌─────────────┼─────────────┐   │                 │                   │
│       │             │             │   │                 │                   │
│       ▼             ▼             ▼   ▼                 ▼                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────────┐      ┌──────────────┐          │
│ │   Tags   │ │OTN Tokens│ │CampaignLogs  │      │   Messages   │          │
│ └──────────┘ └──────────┘ └──────────────┘      └──────────────┘          │
│                     │                                                       │
│                     ▼                                                       │
│              ┌──────────────┐                                               │
│              │  Recurring   │                                               │
│              │Subscriptions │                                               │
│              └──────────────┘                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Complete Database Schema

```sql
-- ============================================================================
-- DATABASE SCHEMA FOR FACEBOOK MESSAGING PLATFORM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS & AUTHENTICATION
-- ----------------------------------------------------------------------------

-- Admin User (Single owner)
CREATE TABLE admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Members
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'inactive'
    invitation_token VARCHAR(255),
    invitation_expires_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- NULL for admin
    is_admin BOOLEAN DEFAULT FALSE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login Attempts (for rate limiting)
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- username or IP
    attempt_type VARCHAR(20) NOT NULL, -- 'username', 'ip'
    success BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- WORKSPACES
-- ----------------------------------------------------------------------------

-- Business Workspaces (Max 5, expandable by developer)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    color_theme VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Workspace Assignment (Team member access)
CREATE TABLE user_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'operator', -- 'view_only', 'operator', 'manager'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workspace_id)
);

-- ----------------------------------------------------------------------------
-- FACEBOOK ACCOUNTS & PAGES
-- ----------------------------------------------------------------------------

-- Facebook Account (One per workspace)
CREATE TABLE facebook_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    fb_user_id VARCHAR(50) NOT NULL,
    fb_user_name VARCHAR(255),
    access_token TEXT NOT NULL, -- Encrypted
    token_expires_at TIMESTAMP,
    token_type VARCHAR(50) DEFAULT 'long_lived',
    is_connected BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP,
    connection_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Facebook Pages
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    facebook_account_id UUID REFERENCES facebook_accounts(id) ON DELETE CASCADE,
    fb_page_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted
    token_expires_at TIMESTAMP,
    profile_picture_url TEXT,
    cover_photo_url TEXT,
    category VARCHAR(255),
    followers_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    webhook_subscribed BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMP,
    token_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, fb_page_id)
);

-- ----------------------------------------------------------------------------
-- CONTACTS
-- ----------------------------------------------------------------------------

-- Contacts (Leads)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    psid VARCHAR(50) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    profile_picture_url TEXT,
    locale VARCHAR(10),
    timezone INTEGER,
    gender VARCHAR(20),
    source VARCHAR(50) DEFAULT 'organic', -- 'organic', 'ad', 'comment', 'referral'
    source_details JSONB,
    custom_fields JSONB DEFAULT '{}',
    engagement_score INTEGER DEFAULT 0,
    engagement_level VARCHAR(20) DEFAULT 'new', -- 'hot', 'warm', 'cold', 'inactive', 'new'
    first_interaction_at TIMESTAMP,
    last_interaction_at TIMESTAMP,
    last_message_from_contact_at TIMESTAMP,
    last_message_to_contact_at TIMESTAMP,
    is_subscribed BOOLEAN DEFAULT TRUE,
    unsubscribed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, psid)
);

-- Contact Tags
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, name)
);

-- Contact-Tag Junction
CREATE TABLE contact_tags (
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id, tag_id)
);

-- Custom Field Definitions
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_key VARCHAR(100) NOT NULL, -- For use in personalization
    field_type VARCHAR(20) NOT NULL, -- 'text', 'number', 'date', 'dropdown', 'checkbox'
    options JSONB, -- For dropdown options
    is_required BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, field_key)
);

-- ----------------------------------------------------------------------------
-- 24-HOUR BYPASS TOKENS
-- ----------------------------------------------------------------------------

-- OTN (One-Time Notification) Tokens
CREATE TABLE otn_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    title VARCHAR(255), -- OTN request title
    payload VARCHAR(255), -- Custom payload
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opted_in_at TIMESTAMP,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring Notification Subscriptions
CREATE TABLE recurring_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY'
    topic VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    last_sent_at TIMESTAMP,
    messages_sent_count INTEGER DEFAULT 0,
    opted_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opted_out_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Tag Usage Tracking (for compliance)
CREATE TABLE message_tag_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    message_id UUID,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- SEGMENTS
-- ----------------------------------------------------------------------------

-- Audience Segments
CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_type VARCHAR(20) DEFAULT 'dynamic', -- 'dynamic', 'static'
    filters JSONB NOT NULL, -- Segment filter rules
    contact_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Static Segment Members (for static segments)
CREATE TABLE segment_members (
    segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (segment_id, contact_id)
);

-- ----------------------------------------------------------------------------
-- CAMPAIGNS
-- ----------------------------------------------------------------------------

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_admin BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(20) NOT NULL, -- 'one_time', 'scheduled', 'recurring', 'drip', 'trigger'
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'
    
    -- Audience
    audience_type VARCHAR(20), -- 'all', 'segment', 'pages', 'manual', 'csv'
    audience_segment_id UUID REFERENCES segments(id),
    audience_page_ids UUID[],
    audience_contact_ids UUID[],
    
    -- Message Content
    message_content JSONB NOT NULL,
    
    -- Bypass Configuration
    bypass_method VARCHAR(20), -- 'auto', 'message_tag', 'otn', 'recurring', 'sponsored'
    message_tag VARCHAR(50),
    
    -- Scheduling
    scheduled_at TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    recurring_pattern JSONB, -- For recurring campaigns
    
    -- Drip Configuration
    drip_sequence JSONB, -- For drip campaigns
    
    -- A/B Testing
    is_ab_test BOOLEAN DEFAULT FALSE,
    ab_variants JSONB,
    ab_winner_criteria VARCHAR(20), -- 'delivery', 'response', 'click'
    
    -- Stats
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Send Logs
CREATE TABLE campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'clicked', 'replied'
    bypass_method VARCHAR(20),
    message_tag VARCHAR(50),
    fb_message_id VARCHAR(255),
    ab_variant VARCHAR(10),
    error_code VARCHAR(50),
    error_message TEXT,
    queued_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drip Campaign Progress
CREATE TABLE drip_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'stopped', 'waiting'
    next_message_at TIMESTAMP,
    completed_at TIMESTAMP,
    stopped_at TIMESTAMP,
    stopped_reason VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, contact_id)
);

-- ----------------------------------------------------------------------------
-- MESSAGES & INBOX
-- ----------------------------------------------------------------------------

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'pending', 'resolved'
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_to_admin BOOLEAN DEFAULT FALSE,
    labels TEXT[],
    last_message_at TIMESTAMP,
    last_message_preview TEXT,
    last_message_direction VARCHAR(10), -- 'inbound', 'outbound'
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, contact_id)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'video', 'file', 'template'
    content JSONB NOT NULL,
    fb_message_id VARCHAR(255),
    fb_timestamp BIGINT,
    
    -- For outbound messages
    bypass_method VARCHAR(20),
    message_tag VARCHAR(50),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'received', -- 'pending', 'sent', 'delivered', 'read', 'failed', 'received'
    error_code VARCHAR(50),
    error_message TEXT,
    
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Notes (Internal)
CREATE TABLE conversation_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    created_by_admin BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- TEMPLATES
-- ----------------------------------------------------------------------------

-- Message Templates
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    content JSONB NOT NULL,
    is_canned_response BOOLEAN DEFAULT FALSE, -- For quick replies in inbox
    shortcut VARCHAR(50), -- Keyboard shortcut
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- ATTACHMENTS
-- ----------------------------------------------------------------------------

-- Uploaded Attachments (cached FB attachment IDs)
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id),
    original_filename VARCHAR(255),
    file_type VARCHAR(20), -- 'image', 'video', 'file'
    mime_type VARCHAR(100),
    file_size INTEGER,
    local_path TEXT, -- Local storage path
    fb_attachment_id VARCHAR(255), -- Cached FB ID for reuse
    fb_attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- ACTIVITY LOGS
-- ----------------------------------------------------------------------------

-- Activity Log
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    actor_type VARCHAR(10) NOT NULL, -- 'admin', 'user', 'system'
    actor_user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'contact', 'campaign', 'page', 'user', etc.
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- SETTINGS
-- ----------------------------------------------------------------------------

-- System Settings
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- JOB QUEUE (for background processing)
-- ----------------------------------------------------------------------------

CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------

-- Users & Auth
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier, attempted_at);

-- Workspaces
CREATE INDEX idx_user_workspaces_user ON user_workspaces(user_id);
CREATE INDEX idx_user_workspaces_workspace ON user_workspaces(workspace_id);

-- Facebook
CREATE INDEX idx_facebook_accounts_workspace ON facebook_accounts(workspace_id);
CREATE INDEX idx_pages_workspace ON pages(workspace_id);
CREATE INDEX idx_pages_fb_page_id ON pages(fb_page_id);

-- Contacts
CREATE INDEX idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX idx_contacts_page ON contacts(page_id);
CREATE INDEX idx_contacts_psid ON contacts(psid);
CREATE INDEX idx_contacts_engagement ON contacts(engagement_level);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction_at);
CREATE INDEX idx_contacts_subscribed ON contacts(is_subscribed);
CREATE INDEX idx_contact_tags_contact ON contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag ON contact_tags(tag_id);

-- Bypass Tokens
CREATE INDEX idx_otn_tokens_contact ON otn_tokens(contact_id);
CREATE INDEX idx_otn_tokens_used ON otn_tokens(is_used);
CREATE INDEX idx_recurring_subs_contact ON recurring_subscriptions(contact_id);
CREATE INDEX idx_recurring_subs_active ON recurring_subscriptions(is_active);

-- Campaigns
CREATE INDEX idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at);
CREATE INDEX idx_campaign_logs_campaign ON campaign_logs(campaign_id);
CREATE INDEX idx_campaign_logs_contact ON campaign_logs(contact_id);
CREATE INDEX idx_campaign_logs_status ON campaign_logs(status);

-- Messages & Inbox
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_page ON conversations(page_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to_user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_fb_id ON messages(fb_message_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- Activity
CREATE INDEX idx_activity_logs_workspace ON activity_logs(workspace_id);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- Jobs
CREATE INDEX idx_job_queue_status ON job_queue(status, scheduled_at);
CREATE INDEX idx_job_queue_type ON job_queue(job_type);
```

---

## 7. Critical Feature: Bypassing 24-Hour Window

### 7.1 Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               24-HOUR BYPASS SYSTEM ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────────┐                             │
│                         │   SEND MESSAGE      │                             │
│                         │     REQUEST         │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌─────────────────────┐                             │
│                         │  BYPASS DECISION    │                             │
│                         │      ENGINE         │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
│              ┌─────────────────────┼─────────────────────┐                  │
│              │                     │                     │                  │
│              ▼                     ▼                     ▼                  │
│    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │
│    │ CHECK 24H WINDOW│   │  CHECK BYPASS   │   │ SELECT BYPASS   │        │
│    │                 │   │    OPTIONS      │   │    METHOD       │        │
│    │ last_interaction│   │                 │   │                 │        │
│    │ + 24 hours      │   │ • OTN Token?    │   │ Priority:       │        │
│    │                 │   │ • Recurring Sub?│   │ 1. Within 24h   │        │
│    │ ┌─────────────┐ │   │ • Tag Eligible? │   │ 2. OTN Token    │        │
│    │ │WITHIN │ OUT │ │   │ • Sponsored?    │   │ 3. Recurring    │        │
│    │ └───┬────┬────┘ │   │                 │   │ 4. Message Tag  │        │
│    │     │    │      │   │                 │   │ 5. Sponsored    │        │
│    └─────┼────┼──────┘   └─────────────────┘   │ 6. BLOCKED      │        │
│          │    │                                 └────────┬────────┘        │
│          │    │                                          │                  │
│          │    └──────────────────────────────────────────┤                  │
│          │                                               │                  │
│          ▼                                               ▼                  │
│    ┌─────────────────┐                         ┌─────────────────┐         │
│    │  SEND NORMAL    │                         │  SEND WITH      │         │
│    │  (No bypass)    │                         │  BYPASS METHOD  │         │
│    │                 │                         │                 │         │
│    │ messaging_type: │                         │ • message_tag   │         │
│    │ RESPONSE/UPDATE │                         │ • otn_token     │         │
│    │                 │                         │ • recurring_tok │         │
│    └────────┬────────┘                         │ • sponsored_msg │         │
│             │                                  └────────┬────────┘         │
│             │                                           │                   │
│             └───────────────────┬───────────────────────┘                   │
│                                 │                                           │
│                                 ▼                                           │
│                       ┌─────────────────────┐                               │
│                       │   FACEBOOK SEND     │                               │
│                       │       API           │                               │
│                       └──────────┬──────────┘                               │
│                                  │                                          │
│                                  ▼                                          │
│                       ┌─────────────────────┐                               │
│                       │   LOG & TRACK       │                               │
│                       │   BYPASS USAGE      │                               │
│                       └─────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Bypass Method Specifications

**Message Tags:**

```typescript
// Message Tag Implementation
interface MessageTagConfig {
  tag: MessageTagType;
  allowedContent: string[];
  prohibitedContent: string[];
  complianceWarning: string;
}

enum MessageTagType {
  CONFIRMED_EVENT_UPDATE = 'CONFIRMED_EVENT_UPDATE',
  POST_PURCHASE_UPDATE = 'POST_PURCHASE_UPDATE',
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  HUMAN_AGENT = 'HUMAN_AGENT'
}

const MESSAGE_TAG_CONFIGS: Record<MessageTagType, MessageTagConfig> = {
  CONFIRMED_EVENT_UPDATE: {
    tag: MessageTagType.CONFIRMED_EVENT_UPDATE,
    allowedContent: [
      'Event reminders',
      'Schedule changes',
      'Location changes',
      'Cancellation notices',
      'Ticket information updates'
    ],
    prohibitedContent: [
      'Promotional content',
      'New event announcements',
      'Unrelated marketing'
    ],
    complianceWarning: 'Only use for updates about events the user has registered for or confirmed attendance.'
  },
  
  POST_PURCHASE_UPDATE: {
    tag: MessageTagType.POST_PURCHASE_UPDATE,
    allowedContent: [
      'Order confirmation',
      'Shipping updates',
      'Delivery status',
      'Receipt/invoice',
      'Refund confirmation'
    ],
    prohibitedContent: [
      'Cross-sell/upsell',
      'New product promotions',
      'Unrelated marketing'
    ],
    complianceWarning: 'Only use for updates about purchases the user has already made.'
  },
  
  ACCOUNT_UPDATE: {
    tag: MessageTagType.ACCOUNT_UPDATE,
    allowedContent: [
      'Payment issues',
      'Account status changes',
      'Security alerts',
      'Password reset confirmations',
      'Subscription changes'
    ],
    prohibitedContent: [
      'Promotional content',
      'New features marketing',
      'Unrelated notifications'
    ],
    complianceWarning: 'Only use for non-promotional updates about the user\'s account or application.'
  },
  
  HUMAN_AGENT: {
    tag: MessageTagType.HUMAN_AGENT,
    allowedContent: [
      'Customer support responses',
      'Issue resolution',
      'Follow-up questions',
      'Case updates'
    ],
    prohibitedContent: [
      'Automated messages',
      'Marketing content',
      'Bulk messages'
    ],
    complianceWarning: 'Only use for human agent responses within 7 days of user\'s last message. Not for automated or bulk messaging.'
  }
};
```

### 7.3 OTN & Recurring Notifications Flow

OTN (One-Time Notification) Flow:
```
STEP 1: Request OTN Permission
Admin → System → Facebook → Contact (sees prompt)

STEP 2: User Opts In
Contact selects "Notify Me"

STEP 3: Receive & Store Token
Facebook → Webhook → System stores token

STEP 4: Use Token (Single Use)
Admin → System sends message with token → Facebook → Delivered

⚠️ Token is SINGLE-USE - After sending, token is invalidated
```

Recurring Notifications Flow:
```
SUBSCRIPTION PHASE:
Admin requests subscription → System sends opt-in → Contact selects frequency
User selects (Daily/Weekly/Monthly) → Opt-in data → Webhook → System stores

MESSAGING PHASE (Repeatable within frequency):
System sends message with token → Facebook delivers → Contact receives

✅ Can send repeatedly based on frequency (Daily/Weekly/Monthly)
⚠️ Token expires - must re-request before expiration
```

### 7.4 Compliance Monitoring

The system shall:
- Track all bypass method usage
- Alert on potential abuse patterns
- Enforce cool-down periods between messages
- Provide compliance audit reports
- Monitor tag usage frequency per contact
- Alert on high unsubscribe rates

---

## 8. Recommended Tech Stack

### 8.1 Complete Tech Stack

**Frontend:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript 5.x
- Styling: Tailwind CSS 3.x
- UI Components: shadcn/ui + Radix UI
- State Management: Zustand or Redux Toolkit
- Server State: TanStack Query v5
- Forms: React Hook Form + Zod validation
- Charts: Recharts or Chart.js
- Tables: TanStack Table
- Real-time: Socket.io Client
- Date Handling: date-fns
- Icons: Lucide React

**Backend:**
- Runtime: Node.js 20.x LTS
- Framework: NestJS 10.x (Recommended) or Express.js
- Language: TypeScript 5.x
- ORM: Prisma 5.x
- Validation: class-validator + class-transformer
- Authentication: Passport.js + JWT
- Job Queue: BullMQ (Redis-based)
- Real-time: Socket.io Server
- File Upload: Multer
- Logging: Winston + Morgan
- API Docs: Swagger (OpenAPI)

**Database:**
- Primary DB: PostgreSQL 15.x
- Cache/Queue: Redis 7.x
- File Storage: Local filesystem (with optional S3)

**Infrastructure:**
- Server: VPS (Ubuntu 22.04 LTS)
- Web Server: Nginx (reverse proxy + SSL)
- Process Manager: PM2
- Containerization: Docker + Docker Compose
- SSL: Let's Encrypt (Certbot)

**Development Tools:**
- Version Control: Git + GitHub/GitLab
- Package Manager: pnpm (recommended) or npm
- Linting: ESLint + Prettier
- Testing: Jest + Supertest (API) + Playwright (E2E)
- API Testing: Postman / Insomnia

**Monitoring:**
- Error Tracking: Sentry (free tier available)
- Uptime: UptimeRobot or Better Uptime (free)
- Logs: PM2 logs + optional Loki/Grafana

---

## 9. System Architecture

### 9.1 High-Level Architecture

```
                              INTERNET
                                 │
                                 ▼
                        ┌───────────────┐
                        │    Nginx      │
                        │ (SSL + Proxy) │
                        └───────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
       ┌───────────┐     ┌───────────┐     ┌───────────┐
       │  Next.js  │     │  NestJS   │     │  Webhook  │
       │  Frontend │     │  API      │     │  Handler  │
       │  :3000    │     │  :4000    │     │  :4001    │
       └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
             │                 │                 │
             │                 │                 │
             └────────────┬────┴─────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │      Redis            │
              │  (Cache + Sessions    │
              │   + Job Queue)        │
              └───────────┬───────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │  BullMQ     │  │  BullMQ     │  │  BullMQ     │
  │  Worker 1   │  │  Worker 2   │  │  Worker N   │
  │ (Messages)  │  │ (Campaigns) │  │ (Sync)      │
  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │     PostgreSQL        │
              │     Database          │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   File Storage        │
              │   (Local / S3)        │
              └───────────────────────┘

EXTERNAL SERVICES:
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Facebook   │   │   SMTP      │   │   Sentry    │
│  Graph API  │   │   Server    │   │  (Errors)   │
│  Messenger  │   │  (Email)    │   │             │
└─────────────┘   └─────────────┘   └─────────────┘
```

### 9.2 Directory Structure (Abbreviated)

Frontend (Next.js):
```
frontend/
├── app/
│   ├── (auth)/ → Login pages
│   ├── (dashboard)/ → Main application
│   │   ├── workspace/[id]/ → Workspace pages
│   │   │   ├── contacts/
│   │   │   ├── campaigns/
│   │   │   ├── inbox/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   └── team/
│   └── api/ → API routes
├── components/ → React components
├── lib/ → Utilities & API client
├── hooks/ → Custom React hooks
├── stores/ → State management
└── types/ → TypeScript types
```

Backend (NestJS):
```
backend/src/
├── main.ts
├── app.module.ts
├── common/ → Guards, decorators, interceptors
├── modules/
│   ├── auth/
│   ├── workspaces/
│   ├── facebook/
│   ├── pages/
│   ├── contacts/
│   ├── segments/
│   ├── campaigns/
│   ├── messages/ → Bulk messaging + bypass logic
│   ├── inbox/
│   ├── webhooks/
│   ├── analytics/
│   ├── team/
│   ├── templates/
│   └── settings/
├── jobs/ → Background job processors
└── prisma/ → Database ORM
```

---

## 10. Security Requirements

### 10.1 Authentication Security

| Requirement | Implementation |
|-----------|-----------------|
| Password Storage | bcrypt with cost factor 12 |
| Password Requirements | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| Session Tokens | JWT (RS256 or HS256) |
| Access Token Expiry | 1 hour |
| Refresh Token Expiry | 7 days (30 days with Remember Me) |
| Failed Login Lockout | 5 attempts = 15 minute lockout |
| Session Invalidation | On password change, manual logout |

### 10.2 Data Security

| Requirement | Implementation |
|-----------|-----------------|
| HTTPS | TLS 1.2+ required |
| Facebook Tokens | AES-256 encryption at rest |
| OTN/Recurring Tokens | AES-256 encryption at rest |
| Database Connection | SSL required |
| Sensitive Logs | No tokens/passwords in logs |
| Backup Encryption | Encrypted backups |

### 10.3 API Security

The system shall implement:
- Rate limiting (100 requests/minute, 10 login attempts/15 minutes)
- Helmet.js for HTTP headers security
- CORS protection
- HTTPS/TLS 1.2+
- Input validation using class-validator
- Protection against OWASP Top 10

### 10.4 Webhook Security

Facebook Webhook Signature Verification using HMAC-SHA256:
```typescript
function verifyFacebookSignature(
  signature: string,
  payload: string,
  appSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}
```

---

## 11. Deployment Guide

### 11.1 VPS Requirements

| Specification | Minimum | Recommended |
|-----------|---------|------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Bandwidth | 2 TB/month | 5 TB/month |

### 11.2 Docker Compose Setup

The project includes Docker Compose configuration with:
- PostgreSQL 15 (database)
- Redis 7 (cache + queue)
- NestJS Backend (API)
- Background Workers (BullMQ processors)
- Next.js Frontend
- Nginx (reverse proxy with SSL)

### 11.3 Deployment Checklist

**Server Setup:**
- ✅ VPS provisioned with required specs
- ✅ Ubuntu 22.04 LTS installed
- ✅ Node.js 20.x installed
- ✅ PostgreSQL 15 installed
- ✅ Redis installed
- ✅ Nginx configured

**Domain & SSL:**
- ✅ Domain purchased and DNS configured
- ✅ SSL certificates from Let's Encrypt
- ✅ Nginx configured with SSL

**Facebook App:**
- ✅ Facebook Developer App created
- ✅ App ID and Secret obtained
- ✅ Webhook URL configured
- ✅ All required permissions requested

**Application:**
- ✅ Environment variables configured
- ✅ Database migrated
- ✅ Admin user seeded
- ✅ 5 workspaces created
- ✅ PM2 configured and running
- ✅ All features tested

**Monitoring:**
- ✅ Error tracking configured (Sentry)
- ✅ Uptime monitoring configured
- ✅ Log rotation configured
- ✅ Backup script scheduled

---

## 12. Appendices

### Appendix A: API Endpoints Summary

Core endpoints organized by module:

**Authentication:**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

**Workspaces:**
- `GET /api/workspaces`
- `GET /api/workspaces/:id/dashboard`

**Facebook:**
- `GET /api/workspaces/:id/facebook/auth-url`
- `POST /api/workspaces/:id/facebook/callback`
- `GET /api/workspaces/:id/pages`

**Contacts:**
- `GET /api/workspaces/:id/contacts`
- `GET /api/workspaces/:id/contacts/:contactId`
- `GET /api/workspaces/:id/contacts/:contactId/bypass-status`

**Campaigns:**
- `GET /api/workspaces/:id/campaigns`
- `POST /api/workspaces/:id/campaigns`
- `POST /api/workspaces/:id/campaigns/:campaignId/send`

**Messaging:**
- `POST /api/workspaces/:id/messages/send`
- `POST /api/workspaces/:id/messages/send-bulk`

**Bypass System:**
- `POST /api/workspaces/:id/bypass/otn/request`
- `GET /api/workspaces/:id/bypass/recurring/subscriptions`

**Inbox:**
- `GET /api/workspaces/:id/inbox/conversations`
- `POST /api/workspaces/:id/inbox/conversations/:id/reply`

**Analytics:**
- `GET /api/workspaces/:id/analytics/dashboard`
- `GET /api/workspaces/:id/analytics/campaigns`

**Webhooks:**
- `GET /api/webhooks/facebook` (verification)
- `POST /api/webhooks/facebook` (events)

### Appendix B: Project Timeline

**Phase 1: Foundation (Weeks 1-3)**
- Project setup, database design, authentication system

**Phase 2: Facebook Integration (Weeks 4-6)**
- OAuth, page connection, webhooks, contact capture

**Phase 3: Messaging Engine (Weeks 7-9) ⚠️ CRITICAL**
- Message sending, 24-hour bypass methods, bulk messaging

**Phase 4: Campaigns & Segmentation (Weeks 10-12)**
- Segment builder, campaign creation, scheduling, A/B testing

**Phase 5: Inbox & Analytics (Weeks 13-14)**
- Unified inbox, real-time updates, analytics dashboard

**Phase 6: Team & Settings (Week 15)**
- Team management, system settings, activity logging

**Phase 7: Testing & Polish (Weeks 16-17)**
- Integration testing, security audit, documentation

**Phase 8: Deployment (Week 18)**
- VPS setup, production deployment, client handover

---

## Document Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Client (Owner) | | | |
| Developer | | | |
| Project Manager | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Development Team | Initial SRS (SaaS version) |
| 2.0 | 2026-02-02 | Development Team | Revised for single-owner, multi-workspace web app |

---

## END OF DOCUMENT

**Summary**

This comprehensive SRS document provides everything needed to build your Facebook Page Messaging Platform with complete specifications for:

✅ Single-Owner Architecture with 5 Isolated Workspaces  
✅ Complete 24-Hour Bypass System (Message Tags, OTN, Recurring Notifications)  
✅ Bulk Messaging Engine with Rate Limiting  
✅ Campaign Management with A/B Testing  
✅ Unified Inbox with Real-time Updates  
✅ Advanced Analytics & Reporting  
✅ Team Management & Permissions  
✅ Full Security Implementation  
✅ VPS Deployment Guide  
✅ Modern Tech Stack (Next.js + NestJS + PostgreSQL + Redis)

**Critical Success Factors:**
- Facebook App Approval (apply early)
- 24-Hour Bypass Compliance (follow Facebook policies strictly)
- Token Security (AES-256 encryption)
- Rate Limiting (respect Facebook API limits)
- Real-time Updates (good UX)
