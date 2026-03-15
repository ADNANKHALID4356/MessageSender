# 🚀 Deploy MessageSender to VPS — No IDE Required

> **Complete terminal-only deployment guide.**
> Every step uses only two tools:
> - A **terminal / SSH client** (Windows: PuTTY or Windows Terminal; Mac/Linux: built-in Terminal)
> - A **web browser** (for GitHub.com and your VPS provider)
>
> No VS Code, no local code editor, no local clone needed.

---

## What You Will Have at the End

```
Internet
   │
   ├─ https://app.yourdomain.com  →  Frontend (Next.js, port 3000)
   └─ https://api.yourdomain.com  →  Backend API + WebSockets (NestJS, port 4000)
                                         │
                                    ┌────┴──────────┐
                                    │  Docker Compose │
                                    │  on Ubuntu VPS  │
                                    │                 │
                                    │  PostgreSQL 15  │
                                    │  Redis 7        │
                                    └─────────────────┘
```

Automatic re-deployment every time you push to `main` on GitHub.

---

## Tools You Need on Your Local Machine

| Tool | Windows | macOS / Linux |
|---|---|---|
| SSH client | Windows Terminal (built-in Win 10/11) or [PuTTY](https://putty.org) | Built-in `ssh` command |
| Web browser | Any | Any |

That's it. No Node.js, no Docker, no VS Code required on your local machine.

---

## Time Required

| Phase | Estimated time |
|---|---|
| VPS provider signup + server creation | 5–15 min |
| DNS configuration | 5 min + up to 30 min propagation |
| Phase 1–3 (VPS bootstrap + secrets) | 15–20 min |
| Phase 4 (first Docker build & deploy) | 10–25 min (depends on VPS speed) |
| Phase 5 (Nginx + SSL) | 10 min |
| Total | ~1–1.5 hours |

---

## Table of Contents

1. [Phase 0 — What to Gather First](#phase-0--what-to-gather-first)
2. [Phase 1 — Create & Access Your VPS](#phase-1--create--access-your-vps)
3. [Phase 2 — Bootstrap the VPS (one command)](#phase-2--bootstrap-the-vps-one-command)
4. [Phase 3 — Generate Secrets & Configure the App](#phase-3--generate-secrets--configure-the-app)
5. [Phase 4 — First Deployment](#phase-4--first-deployment)
6. [Phase 5 — Nginx Reverse Proxy + SSL Certificate](#phase-5--nginx-reverse-proxy--ssl-certificate)
7. [Phase 6 — First-Time App Setup in the Browser](#phase-6--first-time-app-setup-in-the-browser)
8. [Phase 7 — Enable Auto-Deploy via GitHub Actions](#phase-7--enable-auto-deploy-via-github-actions)
9. [Phase 8 — Configure Facebook Webhooks](#phase-8--configure-facebook-webhooks)
10. [Everyday Operations (cheat sheet)](#everyday-operations-cheat-sheet)
11. [Troubleshooting](#troubleshooting)

---

## Phase 0 — What to Gather First

Before touching the VPS, collect everything in this table:

| Item | Where to get it | Used in |
|---|---|---|
| **VPS with Ubuntu 22.04** | Hetzner, DigitalOcean, Vultr, etc. (see [Phase 1](#phase-1--create--access-your-vps)) | All phases |
| **Domain name** | Namecheap, Cloudflare Registrar, GoDaddy, etc. | Phase 5 |
| **Facebook App ID** | [developers.facebook.com](https://developers.facebook.com/apps) → Your App → App ID | Phase 3 |
| **Facebook App Secret** | Facebook Developer Console → Your App → Settings → Basic → App Secret (click Show) | Phase 3 |
| **SMTP credentials** (optional) | Your email provider (Gmail App Password, SendGrid API key, etc.) | Phase 3 |

> 💡 **Don't have a Facebook App yet?** See [`docs/Facebook_App_Setup_Guide.md`](./Facebook_App_Setup_Guide.md).

---

## Phase 1 — Create & Access Your VPS

### 1.1 Create a VPS

Sign up for any of these and create a server:

| Provider | Recommended plan | Monthly cost | Notes |
|---|---|---|---|
| **Hetzner Cloud** | CX22 (2 vCPU, 4 GB RAM) | ~€4–6 | Best value |
| **DigitalOcean** | 2 vCPU / 4 GB Droplet | ~$24 | Great UI |
| **Vultr** | 2 vCPU / 4 GB | ~$24 | Fast setup |
| **Linode (Akamai)** | 4 GB Linode | ~$24 | Reliable |

Settings when creating the server:
- **OS:** Ubuntu 22.04 LTS
- **Auth:** Add your SSH public key (or use password for now — you can add a key later)
- **Hostname:** `messagesender` (or any name you like)

Once created, your VPS provider dashboard shows the **public IP address** (e.g. `203.0.113.42`).
Save this — you need it in every phase.

### 1.2 Connect via SSH

**On Windows (Windows Terminal or PowerShell):**

```powershell
ssh root@YOUR_VPS_IP
```

**On macOS / Linux:**

```bash
ssh root@YOUR_VPS_IP
```

You'll see a prompt like `root@messagesender:~#`. You are now inside your VPS.

> ⚠️ **First-time connection:** You'll be asked "Are you sure you want to continue connecting?" — type `yes` and press Enter.

---

## Phase 2 — Bootstrap the VPS (one command)

This single command installs everything the app needs:
Docker, Nginx, Certbot, UFW firewall, fail2ban, and creates a secure deploy user.

**Still connected as root on your VPS, run:**

```bash
curl -fsSL https://raw.githubusercontent.com/ADNANKHALID4356/MessageSender/main/scripts/vps-setup-ubuntu.sh | sudo bash
```

This takes about **5–10 minutes**. Watch the output — it shows a progress counter like `[1/10]`, `[2/10]`, etc.

When it finishes you'll see:

```
═══════════════════════════════════════════════════════
   Bootstrap complete!
═══════════════════════════════════════════════════════

  1. Add your SSH public key:
     ssh-copy-id deploy@YOUR_VPS_IP
  ...
```

### 2.1 Add Your SSH Public Key for the Deploy User

The bootstrap created a non-root user called `deploy`. You need to allow SSH login for that user.

**Option A — If you used root's authorized key:**

```bash
# Still as root on VPS:
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
```

**Option B — From your local machine:**

```bash
# On your LOCAL machine (not the VPS):
ssh-copy-id deploy@YOUR_VPS_IP
```

### 2.2 Test the Deploy User Login

Open a **new terminal window** on your local machine and test:

```bash
ssh deploy@YOUR_VPS_IP
```

You should log in without a password. If it works, you can close the root session.

> 🔒 The bootstrap script disabled root SSH login and password authentication for security.
> From now on, always connect as `deploy`.

---

## Phase 3 — Generate Secrets & Configure the App

**Log in as deploy on your VPS:**

```bash
ssh deploy@YOUR_VPS_IP
```

### 3.1 Clone the Repository

```bash
git clone https://github.com/ADNANKHALID4356/MessageSender.git /opt/messagesender
cd /opt/messagesender
```

### 3.2 Generate All Cryptographic Secrets

This command auto-generates all the passwords, JWT secrets, and encryption keys:

```bash
bash scripts/generate-secrets.sh --write
```

Output example:
```
Generated secrets:
  POSTGRES_PASSWORD             = xK8mP2...
  REDIS_PASSWORD                = 9nLq7...
  JWT_SECRET                    = a3f1b9...
  JWT_REFRESH_SECRET            = 2c8d4e...
  ENCRYPTION_KEY                = 71fa3b...
  FACEBOOK_WEBHOOK_VERIFY_TOKEN = d4e5f6...

✅ .env.prod created at: /opt/messagesender/.env.prod

Next: edit .env.prod and fill in the remaining values:
   FRONTEND_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
   FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
   SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM
```

> 🚨 **CRITICAL — ENCRYPTION_KEY:** Write it down in a password manager RIGHT NOW.
> It encrypts all Facebook tokens in your database. If lost, you cannot recover them.

### 3.3 Edit the Remaining Configuration

Open `.env.prod` in the nano editor (no VS Code needed):

```bash
nano /opt/messagesender/.env.prod
```

Find and fill in these lines (use the arrow keys to navigate, Ctrl+W to search):

```bash
# ── URLs (replace with your actual domain) ────────────────
FRONTEND_URL=https://app.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com

# ── Facebook (from developers.facebook.com) ───────────────
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890
NEXT_PUBLIC_FACEBOOK_APP_ID=123456789012345

# ── SMTP Email (optional — delete these lines to disable) ─
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_app_password_here
SMTP_FROM=noreply@yourdomain.com
```

**Save and exit nano:** Press `Ctrl+X`, then `Y`, then `Enter`.

### 3.4 Verify No Placeholders Remain

```bash
grep -c "CHANGE_ME\|your_.*_id\|your_.*_secret" /opt/messagesender/.env.prod || true
```

This should print `0`. If it prints anything higher, run `nano /opt/messagesender/.env.prod` again and fix the remaining placeholders.

---

## Phase 4 — First Deployment

Still on your VPS as `deploy`:

```bash
bash /opt/messagesender/scripts/vps-deploy.sh \
  https://github.com/ADNANKHALID4356/MessageSender.git
```

This will:
1. Pull the latest code
2. Build Docker images (takes **10–25 minutes** on first run — be patient!)
3. Start all containers (PostgreSQL, Redis, backend, frontend)
4. Wait for health checks to pass
5. Print a summary

Successful output looks like:

```
═══════════════════════════════════════════════════════
   Deployment complete!
═══════════════════════════════════════════════════════

✅ Commit  : a3f1b9c
✅ Backend : http://127.0.0.1:4000/api/v1/health
✅ Frontend: http://127.0.0.1:3000
```

### 4.1 Verify Containers Are Running

```bash
docker ps
```

You should see 4 containers running: `postgres`, `redis`, `backend`, `frontend`.

### 4.2 Quick Health Check

```bash
curl http://127.0.0.1:4000/api/v1/health
```

Expected response: `{"status":"ok","..."}` — if you see this, the backend is alive.

---

## Phase 5 — Nginx Reverse Proxy + SSL Certificate

Now we expose the app to the internet with proper HTTPS.

### 5.1 Point Your Domain to the VPS

In your **domain registrar's DNS settings**, add two A records:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `app` | `YOUR_VPS_IP` | Auto or 300 |
| A | `api` | `YOUR_VPS_IP` | Auto or 300 |

This creates `app.yourdomain.com` and `api.yourdomain.com`.

> ⏳ DNS takes 5–30 minutes to propagate. While you wait, do the Nginx config below.

### 5.2 Install the Nginx Configuration

Copy the provided Nginx configuration and replace the placeholder domain:

```bash
# Copy the template
sudo cp /opt/messagesender/docs/nginx.conf /etc/nginx/sites-available/messagesender

# Replace the placeholder domain with your real domain
sudo sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN.com/g' /etc/nginx/sites-available/messagesender

# Enable the site
sudo ln -sf /etc/nginx/sites-available/messagesender /etc/nginx/sites-enabled/messagesender

# Disable the default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config for syntax errors
sudo nginx -t
```

You should see: `nginx: configuration file /etc/nginx/nginx.conf test is successful`.

### 5.3 Temporarily Enable HTTP (for Certificate Issuance)

Before getting an SSL certificate, temporarily configure Nginx to serve HTTP only
(Certbot needs to verify your domain over HTTP):

```bash
# Start Nginx (HTTP only for now — SSL lines in the config will be fixed by Certbot)
sudo systemctl start nginx
sudo systemctl enable nginx
```

If Nginx fails to start because SSL certificates don't exist yet, edit the config:

```bash
sudo nano /etc/nginx/sites-available/messagesender
```

Comment out (add `#` at the start) all lines containing `ssl_certificate` and `listen 443`, then:

```bash
sudo nginx -t && sudo systemctl restart nginx
```

### 5.4 Get SSL Certificates (Let's Encrypt)

```bash
sudo certbot --nginx \
  -d app.yourdomain.com \
  -d api.yourdomain.com \
  --non-interactive \
  --agree-tos \
  -m your@email.com \
  --redirect
```

Certbot will:
- Verify you own the domains (by serving a challenge file via HTTP)
- Download free SSL certificates
- Automatically update your Nginx config to use HTTPS
- Set up auto-renewal

Successful output ends with:

```
Congratulations! You have successfully enabled HTTPS on https://app.yourdomain.com
and https://api.yourdomain.com
```

### 5.5 Reload Nginx

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 5.6 Test HTTPS

```bash
curl https://api.yourdomain.com/api/v1/health
```

You should see the health response. If you do, the full stack is working end-to-end.

---

## Phase 6 — First-Time App Setup in the Browser

Open your browser and go to: **`https://app.yourdomain.com`**

### 6.1 Create the Admin Account

Navigate to `https://app.yourdomain.com/admin/signup` and create the first admin account.

> ⚠️ Do this immediately after deployment — the admin signup endpoint is only available before the first admin exists.

### 6.2 Create Your First Workspace

After logging in:
1. Click **Create Workspace**
2. Give it a name (e.g. your business name)
3. Click **Create**

### 6.3 Connect a Facebook Page

1. In your workspace, click **Connect Facebook Page**
2. Log in with Facebook and authorize the app
3. Select the page(s) you want to manage
4. Click **Connect**

---

## Phase 7 — Enable Auto-Deploy via GitHub Actions

After this phase, every `git push` to `main` will automatically update your VPS — no SSH needed.

### 7.1 Create a Dedicated Deploy SSH Key

On your **local machine:**

```bash
# Generate a key dedicated to GitHub Actions (not your personal key)
ssh-keygen -t ed25519 -C "messagesender-github-actions" -f ~/.ssh/messagesender_deploy -N ""

# This creates:
#   ~/.ssh/messagesender_deploy      ← private key (goes into GitHub)
#   ~/.ssh/messagesender_deploy.pub  ← public key  (goes onto VPS)
```

**On Windows (PowerShell):**

```powershell
ssh-keygen -t ed25519 -C "messagesender-github-actions" -f "$env:USERPROFILE\.ssh\messagesender_deploy" -N '""'
```

### 7.2 Add the Public Key to Your VPS

```bash
# On your LOCAL machine:
ssh-copy-id -i ~/.ssh/messagesender_deploy.pub deploy@YOUR_VPS_IP
```

Or manually — print the public key and paste it:

```bash
# On your LOCAL machine — print the public key:
cat ~/.ssh/messagesender_deploy.pub
```

Then on your VPS:

```bash
# On VPS as deploy user:
echo "PASTE_THE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

### 7.3 Add GitHub Repository Secrets

Open your browser and go to:

**`https://github.com/ADNANKHALID4356/MessageSender/settings/secrets/actions`**

Click **"New repository secret"** for each of these:

---

**Secret 1: `VPS_HOST`**
- Name: `VPS_HOST`
- Value: Your VPS IP address (e.g. `203.0.113.42`)

---

**Secret 2: `VPS_USER`**
- Name: `VPS_USER`
- Value: `deploy`

---

**Secret 3: `VPS_SSH_KEY`**
- Name: `VPS_SSH_KEY`
- Value: The **entire content** of your private key file

Print the private key on your local machine:

```bash
# macOS / Linux:
cat ~/.ssh/messagesender_deploy

# Windows PowerShell:
Get-Content "$env:USERPROFILE\.ssh\messagesender_deploy"
```

Copy **everything** including the header and footer lines:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAA...
...more lines...
-----END OPENSSH PRIVATE KEY-----
```

Paste all of it as the value for `VPS_SSH_KEY`.

---

**Secret 4: `FRONTEND_URL`** (optional — used as the deployment URL in GitHub Actions)
- Name: `FRONTEND_URL`
- Value: `https://app.yourdomain.com`

---

### 7.4 Test the Auto-Deploy

Make any small change on GitHub directly in the browser:

1. Go to your repository on GitHub
2. Click any file (e.g. `README.md`)
3. Click the **pencil icon** (✏️) to edit
4. Make a tiny change (e.g. add a space)
5. Click **"Commit changes"** → commit directly to `main`

Then go to: **`https://github.com/ADNANKHALID4356/MessageSender/actions`**

You'll see a new workflow run called **"Deploy to VPS"** starting. Click it to watch the live log.
After ~15–20 minutes it will show a green ✅ if everything worked.

### 7.5 Trigger a Manual Deployment Any Time

Go to: **`https://github.com/ADNANKHALID4356/MessageSender/actions/workflows/deploy.yml`**

Click **"Run workflow"** → **"Run workflow"** (green button).

---

## Phase 8 — Configure Facebook Webhooks

### 8.1 Set the Webhook URL

In [Facebook Developer Console](https://developers.facebook.com/apps):

1. Open your app
2. Go to **Webhooks** (in the left sidebar)
3. Click **Add Callback URL**
4. **Callback URL:** `https://api.yourdomain.com/api/v1/webhooks/facebook`
5. **Verify Token:** Get it from your VPS:

```bash
grep FACEBOOK_WEBHOOK_VERIFY_TOKEN /opt/messagesender/.env.prod
```

Paste that value as the **Verify Token** in Facebook.

6. Click **Verify and Save**

### 8.2 Subscribe to Events

Still in Facebook Developer Console → Webhooks:

Click **Subscribe** next to your Facebook Page, then enable:
- `messages`
- `messaging_postbacks`
- `messaging_optins`
- `message_deliveries`
- `message_reads`

### 8.3 Test the Webhook

Send a message to your Facebook Page. Within seconds it should appear in the MessageSender inbox at `https://app.yourdomain.com`.

---

## Everyday Operations (Cheat Sheet)

All commands are run on your VPS as the `deploy` user (`ssh deploy@YOUR_VPS_IP`).

```bash
# ── App status ─────────────────────────────────────────────────
docker ps                                           # list all containers
curl http://127.0.0.1:4000/api/v1/health            # backend health

# ── Logs ───────────────────────────────────────────────────────
docker logs messagesender_backend  --tail 50 -f     # backend logs (live)
docker logs messagesender_frontend --tail 50 -f     # frontend logs (live)
docker logs messagesender_postgres --tail 50        # DB logs
docker logs messagesender_redis    --tail 50        # Redis logs

# ── Manual redeploy (pull latest & restart) ────────────────────
cd /opt/messagesender
git pull origin main
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  build --pull
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --remove-orphans

# ── Restart a single service ───────────────────────────────────
cd /opt/messagesender
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart frontend

# ── Stop everything ────────────────────────────────────────────
cd /opt/messagesender
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod down

# ── Database backup ────────────────────────────────────────────
bash /opt/messagesender/scripts/backup-db.sh

# ── Disk usage ─────────────────────────────────────────────────
df -h                      # disk space
docker system df           # Docker space usage
docker image prune -f      # remove unused images

# ── Nginx ──────────────────────────────────────────────────────
sudo nginx -t              # test config
sudo systemctl reload nginx
sudo systemctl status nginx
sudo tail -50 /var/log/nginx/messagesender_api_error.log

# ── SSL certificate renewal (auto, but can be tested manually) ─
sudo certbot renew --dry-run
```

---

## Troubleshooting

### "Permission denied (publickey)" when SSHing

```bash
# Check the deploy user's authorized_keys on the VPS (as root):
cat /home/deploy/.ssh/authorized_keys

# Make sure the public key you're using matches what's in there
cat ~/.ssh/messagesender_deploy.pub     # on your local machine
```

---

### Docker build fails with "out of memory"

The frontend Next.js build requires ~1 GB RAM. Add swap:

```bash
# On VPS as root:
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

### Backend container keeps restarting

```bash
docker logs messagesender_backend --tail 100
```

Common causes:
- `.env.prod` missing a required variable → check output for `ConfigValidation` errors
- Database connection failed → check `POSTGRES_PASSWORD` matches in `.env.prod`
- Port 4000 already in use → `sudo lsof -i :4000`

---

### "Placeholder values found in .env.prod"

The deploy script detected unfilled `CHANGE_ME` values:

```bash
grep -n "CHANGE_ME\|your_.*_id\|your_.*_secret" /opt/messagesender/.env.prod
nano /opt/messagesender/.env.prod
```

Fill in the highlighted lines, save, then re-run the deploy script.

---

### Certbot fails: "DNS problem: NXDOMAIN"

DNS hasn't propagated yet. Check if it has:

```bash
nslookup app.yourdomain.com 8.8.8.8
```

If it returns your VPS IP, retry Certbot. If not, wait 10–30 more minutes.

---

### GitHub Actions deploy fails: "Host key verification failed"

The VPS host key isn't trusted. Fix: the `appleboy/ssh-action` doesn't check host keys by default, so this shouldn't happen. If it does, check that `VPS_HOST` is the correct IP or hostname.

---

### GitHub Actions deploy fails: "Load key: invalid format"

The `VPS_SSH_KEY` secret doesn't contain a valid private key. Make sure you:
1. Copied the **private** key (not the `.pub` public key)
2. Included the full `-----BEGIN/END-----` header and footer
3. Didn't add extra blank lines at the start or end

---

### App is running but Facebook webhook not receiving messages

1. Check webhook URL in Facebook Developer Console is exactly: `https://api.yourdomain.com/api/v1/webhooks/facebook`
2. Verify the token matches: `grep FACEBOOK_WEBHOOK_VERIFY_TOKEN /opt/messagesender/.env.prod`
3. Check backend logs for webhook errors: `docker logs messagesender_backend --tail 50`
4. Ensure page subscriptions are active in Facebook Developer Console → Webhooks

---

## Security Checklist (Post-Deployment)

Run these commands to verify the server is properly locked down:

```bash
# Firewall status — should show: active, only SSH/80/443 open
sudo ufw status

# fail2ban — should show SSH jail is active
sudo fail2ban-client status sshd

# Check no passwords in SSH
sudo grep "PasswordAuthentication" /etc/ssh/sshd_config
# Expected: PasswordAuthentication no

# Verify .env.prod is not readable by others
ls -la /opt/messagesender/.env.prod
# Expected: -rw------- (600 permissions)

# SSL certificate expiry
sudo certbot certificates
# Expected: VALID, days until expiry shown
```

---

## Related Documents

| Document | Contents |
|---|---|
| [`CREDENTIALS_REQUIRED.md`](./CREDENTIALS_REQUIRED.md) | Full credentials reference with how to obtain each one |
| [`VPS_DEPLOYMENT.md`](./VPS_DEPLOYMENT.md) | Detailed VPS deployment walkthrough with all options |
| [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) | Pre-launch verification checklist |
| [`Facebook_App_Setup_Guide.md`](./Facebook_App_Setup_Guide.md) | Setting up the Facebook App in Developer Console |
| [`QUICK_RECOVERY_CHECKLIST.md`](./QUICK_RECOVERY_CHECKLIST.md) | What to do when things go wrong |
