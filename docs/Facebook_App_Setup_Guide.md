# 🚀 Facebook App Setup Guide - MessageSender

## Overview
This guide walks through creating and configuring a Facebook App for the MessageSender platform.

---

## 📋 Prerequisites

- ✅ Access to Facebook account
- ✅ Access to Facebook Developer Console (https://developers.facebook.com)
- ✅ Facebook Page created (for testing)
- ✅ Business email address
- ✅ SSL certificate (for production webhooks)

---

## STEP 1: Create Facebook App (10 minutes)

### 1.1 Access Developer Console
```
1. Go to: https://developers.facebook.com/apps/
2. Click: [Create App] button (top right)
```

### 1.2 Choose App Type
```
Select: Business
(Other options: Consumer, Gaming, None)

Reason: Business apps get access to Messenger Platform

Click: [Continue]
```

### 1.3 Enter App Details
```
Display Name: MessageSender Marketing Platform
App Contact Email: your.business.email@example.com
Business Account: [Select your Business Manager] (or create new)

Click: [Create App]
```

### 1.4 Security Check
```
Complete security verification (reCAPTCHA)
Wait for app creation (10-20 seconds)
```

✅ **You now have a Facebook App!**

---

## STEP 2: Add Messenger Platform Product (5 minutes)

### 2.1 Add Product
```
In App Dashboard, scroll to "Add Products to Your App"

Find: Messenger

Click: [Set Up]
```

### 2.2 Configure Messenger Settings
```
You'll see Messenger Settings page with:
  • Access Tokens
  • Webhooks
  • Message Tags
  • Built-In NLP
  • Messenger Profile

Leave this page open - we'll configure it next
```

---

## STEP 3: Get App Credentials (2 minutes)

### 3.1 Get App ID and Secret
```
Left menu → Settings → Basic

You'll see:
  App ID: 123456789012345
  App Secret: [Click "Show"] → abc123def456...

⚠️ CRITICAL: Copy these immediately!
```

### 3.2 Save Credentials
```
Store in password manager or secure note:

FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123def456ghi789jkl012mno345pq
```

---

## STEP 4: Configure App Domain & URLs (5 minutes)

### 4.1 App Domains
```
Settings → Basic → App Domains

Add your domains (one per line):
  localhost            (for development)
  yourdomain.com       (for production)
  www.yourdomain.com   (if using www)

Click: [Save Changes]
```

### 4.2 Website URL
```
Settings → Basic → Website

Site URL: https://yourdomain.com

For development: http://localhost:3000

Click: [Save Changes]
```

### 4.3 Privacy Policy URL (REQUIRED for App Review)
```
Settings → Basic → Privacy Policy URL

URL: https://yourdomain.com/privacy

⚠️ Create this page BEFORE app review!

Should include:
  • What data you collect
  • How you use data
  • Data sharing policies
  • User rights
  • Contact information

Click: [Save Changes]
```

### 4.4 Terms of Service URL
```
Settings → Basic → Terms of Service URL

URL: https://yourdomain.com/terms

Click: [Save Changes]
```

---

## STEP 5: Configure OAuth Redirect URIs (3 minutes)

### 5.1 Facebook Login Product
```
Left menu → Products → + Add Product

Find: Facebook Login

Click: [Set Up]
```

### 5.2 Valid OAuth Redirect URIs
```
Facebook Login → Settings

Valid OAuth Redirect URIs:
  http://localhost:4000/api/v1/facebook/callback
  https://yourdomain.com/api/v1/facebook/callback

(Add one per line)

Click: [Save Changes]
```

---

## STEP 6: Setup Webhooks for Messenger (10 minutes)

### 6.1 Create Verify Token
```
Create a secure random string (will be used to verify webhooks)

Example: messagesender_webhook_verify_XYZ123
Or generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Save this:
FACEBOOK_WEBHOOK_VERIFY_TOKEN=messagesender_webhook_verify_XYZ123
```

### 6.2 Deploy Your Backend with HTTPS
```
⚠️ Facebook REQUIRES https:// for webhook URLs (except localhost)

Options:
  A. Use ngrok for testing: ngrok http 4000
  B. Deploy to VPS with SSL certificate
  C. Use Heroku/Railway/DigitalOcean

Your webhook URL will be:
  https://your-actual-domain.com/api/webhooks/facebook
```

### 6.3 Configure Webhook in Facebook
```
Messenger → Settings → Webhooks

Click: [Add Callback URL]

Callback URL: https://yourdomain.com/api/webhooks/facebook
Verify Token: messagesender_webhook_verify_XYZ123

Click: [Verify and Save]

✅ If successful: "Webhook verified successfully"
❌ If failed: Check your backend is running and token matches
```

### 6.4 Subscribe to Webhook Fields
```
After verification, select webhook fields:

Under "Webhooks" section:

☑ messages              (User sends message)
☑ messaging_postbacks   (Button clicks)
☑ messaging_optins      (OTN & recurring notification opt-ins)
☐ message_deliveries    (Delivery confirmations - optional)
☐ message_reads         (Read receipts - optional)
☐ messaging_referrals   (Ad referrals - optional)

Click: [Save]
```

---

## STEP 7: Get Page Access Token (5 minutes)

### 7.1 Connect Facebook Page
```
Messenger → Settings → Access Tokens

Click: [Add or Remove Pages]

Select your Facebook page(s)
Click: [Next]
Grant all permissions
Click: [Done]
```

### 7.2 Generate Page Access Token
```
In "Access Tokens" section:

Your page will appear in dropdown

Select your page

Click: [Generate Token]

✅ Copy the Page Access Token (starts with "EAA...")

⚠️ This is a temporary token! Your app will get long-lived tokens via OAuth
```

### 7.3 Subscribe Page to Webhooks
```
Still in Access Tokens section:

Find your page
Click: [Subscribe to Events]

✅ Page is now subscribed to receive webhook events
```

---

## STEP 8: Update Your Application Configuration (5 minutes)

### 8.1 Update Backend .env
```
Edit: MessageSender/backend/.env

# Facebook Configuration
NODE_ENV=production
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123def456ghi789jkl012mno345pq
FACEBOOK_WEBHOOK_VERIFY_TOKEN=messagesender_webhook_verify_XYZ123
FACEBOOK_API_VERSION=v18.0
FACEBOOK_MOCK_MODE=false  # ⚠️ CRITICAL - Set to false!

# Your domain
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 8.2 Update Frontend .env
```
Edit: MessageSender/frontend/.env

NEXT_PUBLIC_FACEBOOK_APP_ID=123456789012345
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### 8.3 Restart Application
```
# Stop current instances
Ctrl+C (in both frontend and backend terminals)

# Restart backend
cd backend
pnpm run start:prod  # or start:dev for development

# Restart frontend
cd frontend
pnpm run start
```

---

## STEP 9: Test Facebook Integration (10 minutes)

### 9.1 Test OAuth Connection
```
1. Open your app: https://yourdomain.com (or localhost:3000)
2. Login as admin (username: admin, password: Admin@123)
3. Navigate to: Pages or Settings
4. Click: [Connect Facebook Account]
5. Facebook OAuth popup appears
6. Select your page(s)
7. Grant permissions
8. ✅ Should redirect back with "Connected" status
```

### 9.2 Test Sending Message
```
1. In your app, go to Contacts
2. Add a test contact (your own Facebook PSID)
   
   How to get your PSID:
   • Send message to your page from Facebook
   • Check webhook logs or database
   • OR use: https://findmyfbid.com/

3. Click: [Send Message]
4. Type test message
5. Click: [Send]
6. ✅ Check your Facebook Messenger - message should arrive!
```

### 9.3 Test Receiving Message
```
1. Open Facebook Messenger
2. Send message to your connected page: "Hello test"
3. Check your app inbox
4. ✅ Message should appear in real-time!
```

### 9.4 Test Webhooks
```
Check backend logs for webhook events:

✅ Should see:
  "Webhook verified with Facebook"
  "Received message from {PSID}"
  "Message stored in database"
  "Real-time event emitted"
```

---

## STEP 10: Submit for App Review (Complete After Testing)

### 10.1 Complete App Details
```
Settings → Basic

Ensure filled out:
  ✅ App Icon (1024x1024px)
  ✅ Privacy Policy URL
  ✅ Terms of Service URL
  ✅ Category: Business Tools
  ✅ Contact Email
```

### 10.2 Request Permissions
```
Left menu → App Review → Permissions and Features

Click: [Request Advanced Access]

Select required permissions:
  ☑ pages_messaging
  ☑ pages_manage_metadata
  ☑ pages_read_engagement

For each permission:
  1. Click: [Get Advanced Access]
  2. Enter use case details
  3. Upload demo video (required)
  4. Submit
```

### 10.3 Prepare Demo Video
```
Record 3-5 minute video showing:
  1. User logs into your app
  2. User connects Facebook page
  3. User sends Broadcast message
  4. Message delivered to Facebook Messenger
  5. User views message in inbox
  6. Show compliance features (24H bypass, message tags)

Upload to: YouTube (unlisted) or Google Drive (public)

Paste link in app review form
```

### 10.4 Submit for Review
```
App Review → Permissions and Features

For each permission:

Business Verification (may be required):
  • Submit business documents
  • Tax registration
  • Business license

Use Case Description (example):

---
Permission: pages_messaging

Title: Facebook Messenger Marketing Platform

Detailed Use Case:
MessageSender is a comprehensive marketing automation platform that enables 
businesses to send bulk messages to their Facebook Page subscribers while 
maintaining full compliance with Facebook's messaging policies.

Key Features:
• Bulk messaging with rate limiting (200 messages/hour/page)
• 24-hour messaging window tracking
• One-Time Notification (OTN) requests and usage
• Recurring Notification subscriptions (DAILY/WEEKLY/MONTHLY)
• Message Tag implementation (CONFIRMED_EVENT_UPDATE, POST_PURCHASE_UPDATE, 
  ACCOUNT_UPDATE, HUMAN_AGENT)
• Drip campaign sequences
• A/B testing capabilities
• Campaign analytics and reporting

Compliance Features:
• Automatic 24-hour window validation
• Bypass method warnings and restrictions
• Tag usage compliance monitoring
• Opt-out handling
• Compliance audit reports

Target Users:
• E-commerce businesses sending order updates
• Event organizers sending event reminders
• Customer support teams
• Digital marketing agencies

Data Usage:
• We only access message content to send/receive messages
• We store message logs for analytics and compliance
• We never share message content with third parties
• Users have full control over their data

Our platform helps businesses maintain compliance while providing powerful 
marketing automation features within Facebook's platform policies.
---

Click: [Submit for Review]
```

### 10.5 Wait for Review Results
```
Review Timeline:
  • Standard Review: 3-7 business days
  • With Business Verification: 7-14 business days
  • If Additional Info Requested: +2-5 days

Check status: App Review → Requests

Email notifications sent to app contact email

Possible Outcomes:
  ✅ Approved: Permissions granted, app goes live
  ⏸️ More Info Needed: Respond to Facebook's questions
  ❌ Rejected: Read reason, fix issues, resubmit
```

---

## TROUBLESHOOTING COMMON ISSUES

### Issue 1: Webhook Verification Failed
```
Error: "Webhook verification failed: 404 Not Found"

Solutions:
  1. Ensure backend is running and accessible
  2. Check URL is correct: /api/webhooks/facebook
  3. Verify token matches in .env and Facebook
  4. Test webhook locally: POST to your URL with:
     {
       "hub.mode": "subscribe",
       "hub.verify_token": "your_token",
       "hub.challenge": "challenge_string"
     }
  5. Check backend logs for errors
```

### Issue 2: OAuth Redirect Error
```
Error: "Redirect URI not whitelisted"

Solutions:
  1. Go to Facebook Login → Settings
  2. Add exact URL: http://localhost:4000/api/v1/facebook/callback
  3. Check for typos (case-sensitive)
  4. Ensure no trailing slashes
  5. Clear browser cache and try again
```

### Issue 3: Message Sending Fails
```
Error: "Invalid OAuth 2.0 Access Token"

Solutions:
  1. Token expired → Reconnect Facebook page
  2. Token invalid → Generate new token
  3. Page subscribed to webhooks? Check Messenger Settings
  4. Test with your own PSID first
  5. Check backend logs for detailed error
```

### Issue 4: Webhooks Not Receiving Events
```
Messages sent but not appearing in inbox

Solutions:
  1. Check page is subscribed: Messenger → Settings → Webhooks
  2. Verify webhook URL is correct and accessible
  3. Check webhook fields are subscribed (messages, messaging_postbacks)
  4. Test by sending message to page from Facebook
  5. Check backend logs: should see "Received webhook event"
  6. Verify HTTPS certificate is valid (if production)
```

### Issue 5: App Review Rejected
```
Common rejection reasons:

1. "Insufficient use case details"
   → Add more detail, provide examples, show screenshots

2. "Demo video unclear"
   → Record new video with voice narration
   → Show each feature clearly
   → Demonstrate compliance features

3. "Business verification required"
   → Submit business documents
   → Verify business email domain

4. "Privacy policy inadequate"
   → Include all required sections
   → Be specific about data usage
   → Add contact information

Fix issues and resubmit → Usually approved on second try
```

---

## SECURITY BEST PRACTICES

### 1. Protect Credentials
```
✅ DO:
  • Store in environment variables
  • Use .env files (not committed to git)
  • Rotate App Secret every 90 days
  • Use different credentials for dev/prod

❌ DON'T:
  • Hardcode in source code
  • Commit to version control
  • Share in slack/email
  • Reuse across projects
```

### 2. Token Management
```
✅ DO:
  • Encrypt tokens in database (AES-256)
  • Refresh tokens before expiry
  • Validate tokens before each API call
  • Log token usage for auditing

❌ DON'T:
  • Store tokens in plaintext
  • Share user tokens between users
  • Ignore token expiration errors
```

### 3. Webhook Security
```
✅ DO:
  • Verify webhook signatures (implemented)
  • Use HTTPS in production
  • Rate limit webhook endpoint
  • Log all webhook events
  • Validate payload structure

❌ DON'T:
  • Skip signature verification
  • Use HTTP in production
  • Trust webhook data blindly
```

---

## PRODUCTION DEPLOYMENT CHECKLIST

Before going live:

### Technical
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Webhooks verified and subscribed
- [ ] OAuth redirect URIs configured
- [ ] Environment variables set correctly
- [ ] FACEBOOK_MOCK_MODE=false
- [ ] Database migrations run
- [ ] Redis connected and working
- [ ] Rate limiting tested
- [ ] Error logging configured (Sentry)

### Facebook App
- [ ] App Review submitted
- [ ] All required permissions approved
- [ ] Privacy policy URL accessible
- [ ] Terms of service URL accessible
- [ ] App icon uploaded
- [ ] Contact email verified
- [ ] Business verification complete (if required)

### Testing
- [ ] OAuth flow tested
- [ ] Message sending tested
- [ ] Message receiving tested
- [ ] Webhook events verified
- [ ] 24-hour window logic tested
- [ ] OTN flow tested
- [ ] Recurring notifications tested
- [ ] Message tags tested
- [ ] Bulk sending tested (rate limits)

### Compliance
- [ ] Privacy policy compliant with GDPR/CCPA
- [ ] User data handling documented
- [ ] Opt-out mechanism implemented
- [ ] Message tag usage monitored
- [ ] Compliance audit reports available

### Documentation
- [ ] API documentation complete
- [ ] User guide created
- [ ] Admin guide created
- [ ] Troubleshooting guide
- [ ] Support contact information

---

## SUPPORT RESOURCES

**Facebook Developer Documentation:**
- Messenger Platform: https://developers.facebook.com/docs/messenger-platform/
- Webhooks: https://developers.facebook.com/docs/messenger-platform/webhooks/
- Send API: https://developers.facebook.com/docs/messenger-platform/send-messages/
- App Review: https://developers.facebook.com/docs/app-review/

**Developer Support:**
- Support Dashboard: https://developers.facebook.com/support/
- Community Forum: https://developers.facebook.com/community/
- Bug Reports: https://developers.facebook.com/bugs/

**Business Support:**
- Business Help Center: https://www.facebook.com/business/help
- Business Support: https://business.facebook.com/help/support

---

## NEXT STEPS AFTER SETUP

Once your Facebook App is configured:

1. **Test Thoroughly** (1-2 days)
   - Test all messaging features
   - Test all bypass methods
   - Test webhook reliability
   - Load test with multiple pages

2. **Prepare for App Review** (2-3 days)
   - Record demo video
   - Write detailed use cases
   - Prepare business documents
   - Create privacy policy & terms

3. **Submit for Review** (1 day)
   - Submit all permissions
   - Provide all documentation
   - Wait for approval

4. **Go Live!** (After approval)
   - Switch to production mode
   - Onboard first users
   - Monitor for issues
   - Provide user support

---

## CONGRATULATIONS! 🎉

You now have a fully configured Facebook App integrated with your MessageSender platform!

Your app can now:
✅ Send real Facebook messages
✅ Receive messages via webhooks
✅ Use 24-hour bypass methods
✅ Manage multiple Facebook pages
✅ Run marketing campaigns
✅ Track analytics and compliance

**Ready for production deployment!**
