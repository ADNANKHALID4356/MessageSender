# 🖥️ VPS Deployment Guide — MessageSender

> **Complete step-by-step guide** for deploying MessageSender on a Virtual Private Server (VPS)
> using Docker Compose, Nginx as a reverse proxy, and Let's Encrypt SSL certificates.

---

## Table of Contents

1. [VPS Requirements & Provider Selection](#1-vps-requirements--provider-selection)
2. [Initial VPS Setup (Ubuntu 22.04)](#2-initial-vps-setup-ubuntu-2204)
3. [Security Hardening](#3-security-hardening)
4. [Install Docker & Docker Compose](#4-install-docker--docker-compose)
5. [Install Nginx & Certbot](#5-install-nginx--certbot)
6. [DNS Configuration](#6-dns-configuration)
7. [Deploy the Application](#7-deploy-the-application)
8. [Configure Nginx & SSL](#8-configure-nginx--ssl)
9. [Configure Firewall (UFW)](#9-configure-firewall-ufw)
10. [First-Time App Setup](#10-first-time-app-setup)
11. [Configure Facebook Webhooks](#11-configure-facebook-webhooks)
12. [Monitoring & Logging](#12-monitoring--logging)
13. [Automated Database Backups](#13-automated-database-backups)
14. [Keeping the App Updated](#14-keeping-the-app-updated)
15. [Troubleshooting](#15-troubleshooting)
16. [Quick Reference Cheatsheet](#16-quick-reference-cheatsheet)

---

## 1. VPS Requirements & Provider Selection

### Minimum vs Recommended Specs

| Spec | Minimum | Recommended | High Volume |
|------|---------|-------------|-------------|
| **CPU** | 2 vCPU | 4 vCPU | 8 vCPU |
| **RAM** | 2 GB | 4 GB | 8 GB |
| **Disk** | 30 GB SSD | 80 GB SSD | 200 GB SSD |
| **Bandwidth** | 1 TB/mo | 3 TB/mo | Unlimited |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

> ⚠️ **Important:** The frontend build process requires at least 1 GB of free RAM. If your VPS has only 2 GB total, add a swap file (see [Step 2.5](#25-optional-add-swap-space)).

### Recommended VPS Providers

| Provider | Recommended Plan | Monthly Cost |
|----------|-----------------|-------------|
| **Hetzner Cloud** | CX22 (2 vCPU, 4 GB RAM, 40 GB SSD) | ~€4–6 |
| **DigitalOcean** | 2 vCPU / 4 GB Droplet | ~$24 |
| **Vultr** | 2 vCPU / 4 GB Cloud Compute | ~$24 |
| **Linode (Akamai)** | Linode 4GB | ~$24 |
| **AWS EC2** | t3.medium (2 vCPU, 4 GB) | ~$30 |

---

## 2. Initial VPS Setup (Ubuntu 22.04)

### 2.1 Connect as Root

```bash
ssh root@YOUR_SERVER_IP
```

### 2.2 Update the System

```bash
apt update && apt upgrade -y
apt install -y curl wget git vim ufw fail2ban unzip
```

### 2.3 Create a Non-Root Sudo User

> Running as root is dangerous. Create a dedicated deploy user.

```bash
# Create user (replace "deploy" with your preferred username)
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Add to docker group (so docker commands work without sudo)
# Note: docker group is created after Docker is installed — we'll add it later
```

### 2.4 Set Up SSH Key Authentication

On your **local machine**, generate an SSH key (skip if you already have one):

```bash
# On your local machine
ssh-keygen -t ed25519 -C "your@email.com"
```

Copy the public key to the VPS:

```bash
# On your local machine
ssh-copy-id deploy@YOUR_SERVER_IP

# Or manually: copy ~/.ssh/id_ed25519.pub contents
# Then on the VPS, as root:
mkdir -p /home/deploy/.ssh
echo "YOUR_PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### 2.5 Disable Root SSH Login

```bash
vim /etc/ssh/sshd_config
```

Change or add these lines:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
systemctl restart sshd
```

Test the new user before closing your root session:
```bash
# In a new terminal window
ssh deploy@YOUR_SERVER_IP
```

### 2.6 (Optional) Add Swap Space

Recommended if your VPS has 2 GB RAM or less:

```bash
# Create a 2 GB swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Optimize swap usage (use swap only when 90% RAM is full)
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

---

## 3. Security Hardening

### 3.1 Configure fail2ban

fail2ban blocks IPs with repeated failed login attempts:

```bash
# Copy default config to local override
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

vim /etc/fail2ban/jail.local
```

Add/modify these settings:
```ini
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
```

Start and enable fail2ban:
```bash
systemctl enable fail2ban
systemctl start fail2ban
```

### 3.2 Set Timezone

```bash
timedatectl set-timezone UTC
```

### 3.3 Enable Automatic Security Updates

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
# Select "Yes" when prompted
```

---

## 4. Install Docker & Docker Compose

### 4.1 Install Docker

```bash
# Switch to deploy user
su - deploy

# Install dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 4.2 Add Deploy User to Docker Group

```bash
sudo usermod -aG docker deploy

# Apply group change (log out and back in, or use newgrp)
newgrp docker
```

### 4.3 Verify Docker Installation

```bash
docker --version
docker compose version
docker run hello-world
```

### 4.4 Enable Docker on Boot

```bash
sudo systemctl enable docker
sudo systemctl enable containerd
```

---

## 5. Install Nginx & Certbot

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Install Certbot (Let's Encrypt SSL)
sudo apt install -y certbot python3-certbot-nginx

# Verify Nginx is running
curl http://localhost
```

---

## 6. DNS Configuration

Before deploying, point your domain names to the VPS IP.

### Required DNS Records

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| A | `app.yourdomain.com` | `YOUR_VPS_IP` | 300 |
| A | `api.yourdomain.com` | `YOUR_VPS_IP` | 300 |

> **Note:** DNS propagation can take 5–60 minutes. Verify with:
> ```bash
> dig +short app.yourdomain.com
> dig +short api.yourdomain.com
> # Both should return YOUR_VPS_IP
> ```

---

## 7. Deploy the Application

### 7.1 Clone the Repository

```bash
# On your VPS, as the deploy user
cd ~
git clone https://github.com/ADNANKHALID4356/MessageSender.git
cd MessageSender
```

### 7.2 Install pnpm

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Verify
pnpm --version
```

### 7.3 Generate Production Secrets

Run these commands and save the output — you'll need them for your `.env.prod` file:

```bash
echo "=== Copy these values into .env.prod ==="
echo ""
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo ""
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)"
echo ""
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""
echo "FACEBOOK_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 16)"
```

> ⚠️ **CRITICAL:** Store these values securely (e.g., a password manager).  
> The `ENCRYPTION_KEY` **must never change** after first deployment — it's used to decrypt stored Facebook tokens.

### 7.4 Create the Production Environment File

```bash
cp .env.prod.example .env.prod
vim .env.prod
```

Fill in all values:

```bash
# ─── Database ─────────────────────────────────────────────
POSTGRES_PASSWORD=<paste from step 7.3>

# ─── Redis ────────────────────────────────────────────────
REDIS_PASSWORD=<paste from step 7.3>

# ─── JWT ──────────────────────────────────────────────────
JWT_SECRET=<paste from step 7.3>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<paste from step 7.3 — must be DIFFERENT from JWT_SECRET>
JWT_REFRESH_EXPIRES_IN=7d

# ─── Encryption ───────────────────────────────────────────
ENCRYPTION_KEY=<paste from step 7.3 — exactly 64 hex chars>

# ─── Production URLs ──────────────────────────────────────
FRONTEND_URL=https://app.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com

# ─── Facebook ─────────────────────────────────────────────
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=<paste from step 7.3>
FACEBOOK_API_VERSION=v18.0
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
NEXT_PUBLIC_FACEBOOK_AUTH_APP_ID=

# ─── Email (SMTP) ─────────────────────────────────────────
SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@yourdomain.com

# ─── Rate Limiting ────────────────────────────────────────
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# ─── Monitoring (optional but recommended) ────────────────
# SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
```

Secure the file:
```bash
chmod 600 .env.prod
```

### 7.5 Build Production Docker Images

```bash
# This may take 5–15 minutes on first build
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod build
```

### 7.6 Start the Application

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 7.7 Verify All Containers Are Running

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod ps
```

Expected output:
```
NAME                       STATUS          PORTS
messagesender_postgres     Up (healthy)    
messagesender_redis        Up (healthy)    
messagesender_backend      Up (healthy)    0.0.0.0:4000->4000/tcp
messagesender_frontend     Up (healthy)    0.0.0.0:3000->3000/tcp
```

Check the backend health endpoint:
```bash
curl http://localhost:4000/api/v1/health
# Expected: {"status":"ok", ...}
```

Check the frontend:
```bash
curl -I http://localhost:3000
# Expected: HTTP/1.1 200 OK
```

---

## 8. Configure Nginx & SSL

### 8.1 Create Nginx Configuration

```bash
sudo vim /etc/nginx/sites-available/messagesender
```

Paste the following configuration (replace `yourdomain.com` with your actual domain):

```nginx
# ═══════════════════════════════════════════════════════════
# MessageSender Nginx Configuration
# ═══════════════════════════════════════════════════════════

# Upstream backends
upstream messagesender_api {
    server localhost:4000;
    keepalive 32;
}

upstream messagesender_frontend {
    server localhost:3000;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

# ─── API Backend: api.yourdomain.com ──────────────────────

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    access_log /var/log/nginx/messagesender_api_access.log;
    error_log /var/log/nginx/messagesender_api_error.log;

    client_max_body_size 25M;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://messagesender_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check — no rate limit, no logging
    location /api/v1/health {
        proxy_pass http://messagesender_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Stricter rate limit on auth endpoints
    location ~ ^/api/v1/auth/(login|signup|admin) {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://messagesender_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Facebook webhook — no rate limiting
    location /api/v1/webhooks/facebook {
        proxy_pass http://messagesender_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ─── Frontend: app.yourdomain.com ─────────────────────────

server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    access_log /var/log/nginx/messagesender_frontend_access.log;
    error_log /var/log/nginx/messagesender_frontend_error.log;

    client_max_body_size 5M;
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

    location / {
        proxy_pass http://messagesender_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Long-term cache for Next.js static assets
    location /_next/static {
        proxy_pass http://messagesender_frontend;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
}

# Hide Nginx version
server_tokens off;
```

### 8.2 Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/messagesender /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration syntax
sudo nginx -t
```

### 8.3 Obtain SSL Certificates (Let's Encrypt)

> ✅ Make sure DNS is pointing to your VPS before running these commands.

```bash
# Get SSL certificate for the API subdomain
sudo certbot --nginx -d api.yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com

# Get SSL certificate for the frontend subdomain
sudo certbot --nginx -d app.yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com
```

### 8.4 Reload Nginx

```bash
sudo systemctl reload nginx
```

### 8.5 Set Up Automatic SSL Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-creates a systemd timer for renewal
# Verify it's active:
sudo systemctl status certbot.timer
```

---

## 9. Configure Firewall (UFW)

```bash
# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (CRITICAL — do this before enabling!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable the firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

> 🔒 Ports 3000, 4000, 5432, 6379 are **not exposed publicly** — they're accessed only via Nginx proxy (80/443) and internally between containers.

---

## 10. First-Time App Setup

### 10.1 Create the Admin Account

Open a browser and navigate to:
```
https://app.yourdomain.com/admin/signup
```

> This page is only available **once** — before any admin account exists.  
> After creation it is permanently blocked.

Fill in:
- Name
- Email
- Password (min 12 characters recommended)

### 10.2 Log In as Admin

```
https://app.yourdomain.com/login
```

Use the credentials you just created. You'll be redirected to the admin dashboard.

### 10.3 Create Your First Workspace

1. Navigate to **Workspaces**
2. Click **Create Workspace**
3. Give it a name (e.g., "My Business")

### 10.4 Connect Your Facebook Page

1. Navigate to **Pages**
2. Click **Connect Facebook Account**
3. Follow the OAuth flow
4. Select the Facebook Pages to connect
5. Subscribe to webhooks (see [Step 11](#11-configure-facebook-webhooks))

### 10.5 Invite Team Members

1. Navigate to **Team**
2. Invite users by email
3. New users sign up at `/signup` — they'll be in **PENDING** status
4. Approve them from **Team → Pending Users** and grant workspace access with a role

---

## 11. Configure Facebook Webhooks

### 11.1 Open Facebook Developer Console

Go to [https://developers.facebook.com/apps](https://developers.facebook.com/apps) and select your app.

### 11.2 Configure Messenger Webhooks

1. Navigate to **Messenger → Settings → Webhooks**
2. Click **Add Callback URL**
3. Set the **Callback URL**:
   ```
   https://api.yourdomain.com/api/v1/webhooks/facebook
   ```
4. Set the **Verify Token** — this must match `FACEBOOK_WEBHOOK_VERIFY_TOKEN` in your `.env.prod`
5. Click **Verify and Save**

### 11.3 Subscribe to Webhook Events

Subscribe to the following fields:
- ✅ `messages`
- ✅ `messaging_postbacks`
- ✅ `messaging_optins`
- ✅ `message_deliveries`
- ✅ `message_reads`

### 11.4 Verify Webhook Is Working

Send a test message to your Facebook Page and check the backend logs:

```bash
docker logs messagesender_backend -f --tail 50
```

You should see webhook delivery logs appear in real time.

---

## 12. Monitoring & Logging

### 12.1 View Application Logs

```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod logs -f

# Backend only
docker logs messagesender_backend -f

# Frontend only
docker logs messagesender_frontend -f

# PostgreSQL
docker logs messagesender_postgres -f
```

### 12.2 Health Check Endpoints

```bash
# Backend health (liveness)
curl https://api.yourdomain.com/api/v1/health

# Expected response:
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}},...}
```

### 12.3 Monitor Container Resource Usage

```bash
docker stats
```

### 12.4 Set Up Uptime Monitoring (Free)

Register at [UptimeRobot](https://uptimerobot.com) (free tier) and add monitors for:
- `https://api.yourdomain.com/api/v1/health` (HTTP keyword monitor: `"status":"ok"`)
- `https://app.yourdomain.com` (HTTP monitor: status 200)

Set alerts to notify you by email when either goes down.

### 12.5 Enable Sentry Error Tracking (Recommended)

1. Create a free account at [sentry.io](https://sentry.io)
2. Create a new NestJS project
3. Copy the DSN (looks like `https://xxx@yyy.ingest.sentry.io/zzz`)
4. Add to `.env.prod`:
   ```bash
   SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   ```
5. Restart the backend:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart backend
   ```

---

## 13. Automated Database Backups

### 13.1 Create a Backup Script

```bash
sudo vim /home/deploy/backup-db.sh
```

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/deploy/backups"
DB_CONTAINER="messagesender_postgres"
DB_USER="messagesender"
DB_NAME="messagesender_db"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run backup
echo "[$(date)] Starting database backup..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup successful: $BACKUP_FILE"
    # Remove backups older than RETENTION_DAYS
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
    echo "[$(date)] Old backups cleaned up (kept last $RETENTION_DAYS days)"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi
```

```bash
# Make executable
chmod +x /home/deploy/backup-db.sh

# Test it
/home/deploy/backup-db.sh
```

### 13.2 Schedule with Cron

```bash
crontab -e
```

Add this line (runs daily at 2:30 AM):
```cron
30 2 * * * /home/deploy/backup-db.sh >> /home/deploy/backup.log 2>&1
```

### 13.3 Restore from Backup

```bash
# List available backups
ls -lh ~/backups/

# Restore (replace filename with actual backup)
gunzip -c ~/backups/backup_20260315_023000.sql.gz | docker exec -i messagesender_postgres psql -U messagesender messagesender_db
```

---

## 14. Keeping the App Updated

### 14.1 Pull Latest Code

```bash
cd ~/MessageSender
git pull origin main
```

### 14.2 Rebuild and Redeploy

```bash
# Rebuild images with new code
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod build

# Restart services with zero-downtime (rolling restart)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```

The backend automatically runs `prisma migrate deploy` on startup, applying any new database migrations.

### 14.3 Quick Restart (No Code Change)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart
```

### 14.4 Rollback to Previous Version

```bash
# List git commits
git log --oneline -10

# Roll back to a specific commit
git checkout abc1234

# Rebuild with old code
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```

> ⚠️ **Database migrations are not automatically reversed.** For schema rollbacks, restore from a backup created before the migration.

---

## 15. Troubleshooting

### Problem: Container keeps restarting

```bash
# Check logs for the failing service
docker logs messagesender_backend --tail 100

# Common causes:
# 1. Missing or incorrect .env.prod values
# 2. Database not ready (postgres health check failed)
# 3. Redis not ready
# 4. Port already in use on host
```

### Problem: Database connection failed

```bash
# Verify postgres container is healthy
docker inspect messagesender_postgres | grep Health

# Test connection from backend container
docker exec messagesender_backend wget -qO- http://localhost:4000/api/v1/health

# Check DATABASE_URL in .env.prod
# Should be: postgresql://messagesender:${POSTGRES_PASSWORD}@postgres:5432/messagesender_db
```

### Problem: Frontend can't reach API

```bash
# Check that NEXT_PUBLIC_API_URL is correctly set in .env.prod
# It must be the public HTTPS URL: https://api.yourdomain.com/api/v1
# (not localhost — it's baked into the frontend build)

# If you changed the URL, you must rebuild the frontend:
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod build frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d frontend
```

### Problem: Facebook webhook not verified

```bash
# Check FACEBOOK_WEBHOOK_VERIFY_TOKEN in .env.prod matches what's in Facebook Console

# Test the webhook verification manually:
curl "https://api.yourdomain.com/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Should return: test123
```

### Problem: Nginx 502 Bad Gateway

```bash
# Check if backend/frontend containers are running
docker ps

# Check nginx config
sudo nginx -t

# Check nginx error log
sudo tail -50 /var/log/nginx/messagesender_api_error.log

# Restart nginx
sudo systemctl restart nginx
```

### Problem: SSL certificate error

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Reload nginx
sudo systemctl reload nginx
```

### Problem: Out of disk space

```bash
# Check disk usage
df -h

# Clean up unused Docker resources
docker system prune -a --volumes

# Check large log files
du -sh /var/log/nginx/*
sudo truncate -s 0 /var/log/nginx/messagesender_api_access.log
```

### Problem: High memory usage

```bash
# Check container memory usage
docker stats --no-stream

# Check if swap is being used
free -h

# Restart a specific service to clear memory leaks
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart backend
```

---

## 16. Quick Reference Cheatsheet

### File Locations on VPS

| Path | Contents |
|------|---------|
| `~/MessageSender/` | Application source code |
| `~/MessageSender/.env.prod` | Production secrets (**keep private!**) |
| `~/backups/` | Database backups |
| `~/backup-db.sh` | Backup script |
| `/etc/nginx/sites-available/messagesender` | Nginx configuration |
| `/var/log/nginx/` | Nginx access & error logs |
| `/etc/letsencrypt/live/` | SSL certificates |

### Most Used Commands

```bash
# ─── Application ──────────────────────────────────────────
# Start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d

# Stop all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod down

# Restart all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart

# View status
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod ps

# View all logs (live)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod logs -f

# ─── Individual Services ──────────────────────────────────
docker logs messagesender_backend -f
docker logs messagesender_frontend -f

# ─── Build & Deploy ───────────────────────────────────────
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d

# ─── Database ─────────────────────────────────────────────
# Backup
docker exec messagesender_postgres pg_dump -U messagesender messagesender_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Health check
curl https://api.yourdomain.com/api/v1/health

# ─── Nginx ────────────────────────────────────────────────
sudo nginx -t                    # Test config
sudo systemctl reload nginx      # Reload config
sudo systemctl restart nginx     # Full restart

# ─── SSL ──────────────────────────────────────────────────
sudo certbot renew --dry-run     # Test renewal
sudo certbot certificates        # Check cert status

# ─── System ───────────────────────────────────────────────
df -h                            # Disk space
free -h                          # Memory
docker stats                     # Container resources
docker system prune -a           # Clean up Docker
```

### Create a Convenient Alias (Optional)

Add to `~/.bashrc`:

```bash
alias dc-ms='docker compose -f ~/MessageSender/docker-compose.yml -f ~/MessageSender/docker-compose.prod.yml --env-file ~/MessageSender/.env.prod'
```

Then you can use:
```bash
dc-ms up -d
dc-ms logs -f
dc-ms restart backend
dc-ms ps
```

---

## ✅ Deployment Verification Checklist

After completing this guide, verify the following:

- [ ] VPS accessible via SSH with key-based auth (password auth disabled)
- [ ] UFW firewall active — only ports 22, 80, 443 open
- [ ] fail2ban running
- [ ] Docker + Docker Compose installed
- [ ] All 4 containers running and healthy (`docker ps`)
- [ ] Backend health check returns `{"status":"ok"}` at `https://api.yourdomain.com/api/v1/health`
- [ ] Frontend loads at `https://app.yourdomain.com`
- [ ] SSL certificates valid for both domains
- [ ] HTTP redirects to HTTPS
- [ ] Admin account created at `/admin/signup`
- [ ] First workspace created
- [ ] Facebook page connected
- [ ] Facebook webhook verified and receiving events
- [ ] Database backup script running on cron
- [ ] Uptime monitoring configured

---

**Related Documentation:**
- [APP_ANALYSIS.md](./APP_ANALYSIS.md) — Deep application analysis
- [DEPLOYMENT.md](./DEPLOYMENT.md) — General deployment guide
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) — Pre-deployment checklist
- [nginx.conf](./nginx.conf) — Nginx configuration template
- [SECURITY.md](../SECURITY.md) — Security best practices
