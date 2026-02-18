# MessageSender — Comprehensive Manual Testing Guide

> **Prerequisites**: Backend running at `http://localhost:4000`, Frontend at `http://localhost:3000`
> PostgreSQL + Redis via Docker (`docker compose up -d postgres redis`)

---

## Test Credentials

| Role  | Username / Email          | Password    | Login URL |
|-------|--------------------------|-------------|-----------|
| Admin | `admin`                  | `Admin@123` | `/login?admin=true` |
| User  | `user@messagesender.com` | `User@123`  | `/login` |

---

## 1. Authentication & Account Management

### 1.1 Admin Signup (First-Run Only)
1. Navigate to `http://localhost:3000/admin/signup`
2. If admin already exists → should redirect or show error
3. If fresh DB → fill form (username, email, first/last name, password)
4. Submit → should redirect to login
5. **Verify**: API `GET /api/v1/auth/admin/exists` returns `{ exists: true }`

### 1.2 Admin Login
1. Go to `http://localhost:3000/login?admin=true`
2. Enter `admin` / `Admin@123`
3. Click **Login** → should redirect to `/dashboard`
4. **Verify**: JWT token stored in localStorage, user avatar/name in header

### 1.3 User Signup
1. Go to `http://localhost:3000/signup`
2. Fill email, name, password → Submit
3. Should show "Pending approval" message
4. **Verify**: User appears in admin's Team page as "PENDING"

### 1.4 User Approval Flow
1. Login as admin → go to `/team`
2. Find pending user → click **Approve**
3. Assign workspace + permission level
4. **Verify**: User status changes to ACTIVE
5. Login as the user → should see assigned workspace

### 1.5 User Login
1. Go to `http://localhost:3000/login`
2. Enter `user@messagesender.com` / `User@123`
3. **Verify**: Redirects to `/dashboard`, correct workspace loaded

### 1.6 Password Change
1. Go to `/settings` → **Security** tab
2. Enter current password, new password, confirm
3. Submit → should succeed
4. Logout → login with new password

### 1.7 Logout
1. Click logout in header → should clear tokens and redirect to `/login`
2. **Verify**: Protected routes redirect to login after logout

---

## 2. Workspace Management

### 2.1 Create Workspace
1. Go to `/workspaces`
2. Click **Create Workspace** → fill name, description
3. Submit → new workspace appears in list
4. **Verify**: Badge shows active/inactive status

### 2.2 Switch Workspace
1. From workspace list or sidebar selector → click different workspace
2. **Verify**: All data (contacts, conversations, pages) changes to new workspace context
3. **Verify**: `X-Workspace-Id` header is sent with API requests (check Network tab)

### 2.3 Delete Workspace
1. Click delete on a workspace → confirm dialog
2. **Verify**: Workspace removed from list (soft-delete)

---

## 3. Facebook Page Connection

### 3.1 OAuth Flow  
1. Go to `/pages` → click **Connect Facebook**
2. Should redirect to Facebook OAuth consent screen
3. After granting permissions → callback redirects back to app
4. **Verify**: Connected account shown on pages list

### 3.2 Page Selection & Connection
1. After OAuth → available pages listed
2. Select page → click **Connect**
3. **Verify**: Page appears in list with "Active" status
4. **Verify**: Webhook auto-configured for the page

### 3.3 Page Management
1. **Sync**: Click sync icon → refreshes page data from Facebook
2. **Deactivate**: Click deactivate → page stops receiving messages
3. **Reactivate**: Reactivate a deactivated page
4. **Disconnect**: Remove page entirely
5. **Fix Webhook**: Use if webhook is misconfigured

> **Note**: Without a real Facebook App Review (Messenger use case approved), OAuth and messaging won't work with real Facebook. Use mock mode for testing.

### 3.4 Mock Connection (Dev Mode)
1. If `FACEBOOK_MOCK_MODE=false`, you can test the API directly:
   ```
   POST /api/v1/facebook/mock/connect
   ```
2. This creates a mock page without real Facebook interaction

---

## 4. Contacts

### 4.1 View Contact List
1. Go to `/contacts`
2. **Verify**: Contacts listed with name, email, source, engagement level
3. Use search → type name/email → results filter in real-time
4. Use engagement filter dropdown → filter by HOT/WARM/COLD/UNRESPONSIVE
5. Use pagination → navigate between pages

### 4.2 Create Contact
1. Click **Add Contact** → fill name, email, phone
2. Submit → contact appears in list
3. **Verify**: Contact count increments

### 4.3 Edit Contact
1. Click a contact → opens `/contacts/[id]`
2. Edit fields → Save
3. **Verify**: Changes reflected in list

### 4.4 Delete Contact
1. From contact detail or list → click delete
2. Confirm → contact removed
3. **Verify**: Count decrements

### 4.5 Tag Management
1. Go to `/tags` → create tags with names and colors
2. Go to contact detail → add tags
3. **Verify**: Tags appear on contact card
4. Remove a tag → verify removed
5. **Verify**: Tag counts update on `/tags` page

### 4.6 Bulk Operations
1. Select multiple contacts via checkboxes
2. Click **Bulk Actions** → add tag / remove tag
3. **Verify**: All selected contacts updated

---

## 5. Conversations & Inbox

### 5.1 Inbox Layout
1. Go to `/inbox`
2. **Verify**: Split-pane layout — conversation list on left, thread on right
3. Click a conversation → messages load in right pane

### 5.2 Conversation Filters
1. Filter by: All / Unread / Open / Closed
2. **Verify**: List updates correctly
3. Search by contact name

### 5.3 Send Message
1. Select a conversation → type in composer
2. Click Send → message appears in thread
3. **Verify**: Message shows as "Sent" (or "Failed" if no Facebook connection)

### 5.4 Bypass Method Selection
1. In message composer → click bypass method selector
2. Options: Standard (24h window), Message Tag, OTN
3. Select a method → **Verify**: Correct method sent with message API call

### 5.5 Conversation Actions
1. **Mark as Read**: Click read icon → unread indicator disappears
2. **Assign**: Assign conversation to a team member
3. **Archive/Close**: Change conversation status

---

## 6. Campaigns

### 6.1 Campaign List
1. Go to `/campaigns`
2. **Verify**: Campaigns listed with status, type, audience, dates
3. Filter by status (DRAFT/RUNNING/PAUSED/COMPLETED/CANCELLED)
4. Filter by type (ONE_TIME/SCHEDULED/RECURRING/DRIP)
5. Search by name

### 6.2 Create Campaign (6-Step Wizard)
1. Click **New Campaign** → opens `/campaigns/create`
2. **Step 1 — Details**: Name, type (one-time), description
3. **Step 2 — Audience**: Select "All Contacts" or a specific segment
4. **Step 3 — Message**: Enter text message content, add attachment URL
5. **Step 4 — Bypass Method**: Select Standard/Message Tag/OTN
6. **Step 5 — Schedule**: Send immediately or pick date/time
7. **Step 6 — Review**: Verify all details → click **Create**
8. **Verify**: Campaign appears in list as DRAFT

### 6.3 Campaign Lifecycle
1. **Launch**: Click launch on a DRAFT campaign → status changes to RUNNING
2. **Pause**: Pause a RUNNING campaign → status PAUSED
3. **Resume**: Resume a PAUSED campaign → status RUNNING
4. **Cancel**: Cancel campaign → status CANCELLED
5. **Duplicate**: Duplicate a campaign → creates new DRAFT copy

### 6.4 Campaign Stats
1. Click a campaign → view detail page
2. **Verify**: Stats shown — sent, delivered, read, failed counts
3. **Verify**: Progress bar shows completion percentage

---

## 7. Segments

### 7.1 Create Dynamic Segment
1. Go to `/segments` → click **New Segment**
2. Name: "Active Users", Type: DYNAMIC
3. Add filter rules:
   - Engagement Level = HOT
   - Has Tag = "subscriber"
   - Add OR group → Last Contacted within 7 days
4. Click **Preview** → shows matching contact count + sample
5. Save → segment appears in list

### 7.2 Create Static Segment
1. Create segment with Type: STATIC
2. Manually add contacts via the contacts tab
3. **Verify**: Contact count matches added contacts

### 7.3 Recalculate
1. Click **Recalculate** on a dynamic segment
2. **Verify**: Contact count updates based on current data
3. Click **Recalculate All** → all dynamic segments update

### 7.4 Use Segment as Campaign Audience
1. Create campaign → Step 2 (Audience) → select "Segment" → pick created segment
2. **Verify**: Audience count shows segment's contact count

---

## 8. Analytics

### 8.1 Analytics Dashboard
1. Go to `/analytics`
2. **Verify**: Overview cards show:
   - Total messages sent / received
   - Open conversations
   - Average response time
3. Toggle date range: 7 / 30 / 90 days
4. **Verify**: Charts update with selected range

### 8.2 Stats Verification
1. Send a few test messages → refresh analytics
2. **Verify**: Sent count increments
3. Create contacts → refresh → **Verify**: Contact growth chart updates

---

## 9. Settings

### 9.1 Profile Tab
1. Edit first name, last name, email
2. Save → **Verify**: Header reflects changes

### 9.2 Integrations Tab
1. Shows Facebook connection status
2. Links to `/pages` for management

### 9.3 Appearance
1. Toggle dark/light theme
2. **Verify**: Theme switches immediately

### 9.4 Security
1. Change password (covered in §1.6)
2. Logout all sessions → redirects to login

---

## 10. Team Management (Admin Only)

### 10.1 View Team
1. Login as admin → go to `/team`
2. **Verify**: Lists all users with status, role, workspace

### 10.2 Manage Users
1. **Approve pending**: Approve button → assign workspace + role
2. **Deactivate**: Deactivate a user → they can no longer login
3. **Reactivate**: Reactivate deactivated user
4. **Verify**: Status badges update correctly

---

## 11. Cross-Feature Integration Tests

### 11.1 Full Message Flow
1. Connect a Facebook page (or use mock)
2. Create a contact
3. Start conversation → send message → verify in inbox
4. Check analytics → message count should update

### 11.2 Campaign-to-Contact Flow
1. Create contacts with tags
2. Create segment filtering by tag
3. Create campaign targeting that segment
4. Launch campaign → verify progress
5. Check campaign stats

### 11.3 Multi-Workspace Isolation
1. Create 2 workspaces (as admin)
2. Add contacts to workspace A
3. Switch to workspace B → **Verify**: No contacts visible
4. Data should be completely isolated

### 11.4 Auth Guard Testing
1. Try accessing `/dashboard` without login → should redirect to `/login`
2. Try API calls without JWT → should return 401
3. Try API calls with expired JWT → should auto-refresh or redirect
4. Try accessing admin routes as regular user → should return 403

---

## 12. API Testing with Swagger

1. Open `http://localhost:4000/docs`
2. Use the **Authorize** button with a JWT token
3. Test individual endpoints directly
4. **Verify**: Response schemas match documented types

---

## 13. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|------------------|
| Login with wrong password (5 times) | Should show error each time |
| Create contact with duplicate email | Should show validation error |
| Send message to disconnected page | Should return error gracefully |
| Access non-existent resource (404 ID) | Should show "Not Found" |
| Submit form with empty required fields | Client-side validation blocks |
| Very long text in message (>2000 chars) | Should truncate or show limit |
| Large file upload (if applicable) | Should enforce size limits |
| Concurrent tab sessions | Both should work independently |
| Refresh page on any route | Should maintain auth state |
| Network disconnect while using app | Should show error toast |

---

## 14. Browser Compatibility

Test all above flows in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)  
- [ ] Edge (latest)
- [ ] Safari (if on Mac)
- [ ] Mobile viewport (responsive layout check)

---

## Quick Smoke Test Checklist

- [ ] Admin login works
- [ ] Dashboard loads with stats
- [ ] Can create/edit/delete a contact
- [ ] Can view inbox (even if empty)
- [ ] Can create a campaign through wizard
- [ ] Can create a segment with filters
- [ ] Analytics page loads without errors
- [ ] Settings page all tabs render
- [ ] Team page shows users (admin only)
- [ ] Workspace switching works  
- [ ] Logout clears state properly
- [ ] Dark/light theme toggle works
