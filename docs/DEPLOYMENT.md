# Deployment Guide — MessageSender

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 20.x LTS |
| pnpm | 8.x |
| Docker | 24.x |
| Docker Compose | v2.x |

---

## 1. Environment Setup

### 1a. Backend (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set **all** required values:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 chars — `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars — different from JWT_SECRET |
| `ENCRYPTION_KEY` | ✅ prod | 64 hex chars (32 bytes) — `openssl rand -hex 32` |
| `FACEBOOK_APP_ID` | ✅ prod | From Facebook Developer Console |
| `FACEBOOK_APP_SECRET` | ✅ prod | From Facebook Developer Console |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | ✅ prod | A random token you choose and enter in FB Console |
| `REDIS_HOST` / `REDIS_URL` | ✅ | See Redis config below |

### 1b. Frontend (`frontend/.env.local`)

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_FACEBOOK_APP_ID=your_messenger_app_id
```

---

## 2. Development (local)

```bash
# 1. Start infrastructure (PostgreSQL + Redis)
pnpm docker:up

# 2. Install dependencies
pnpm install

# 3. Generate Prisma client & run migrations
pnpm db:generate
pnpm db:migrate

# 4. Seed the database
pnpm db:seed

# 5. Start frontend + backend in watch mode
pnpm dev
```

> Frontend: http://localhost:3000  
> Backend API: http://localhost:4000/api/v1  
> Swagger Docs: http://localhost:4000/docs  
> pgAdmin: http://localhost:5050 (admin@messagesender.com / admin_password)  
> Redis Commander: http://localhost:8081  

---

## 3. Production — Docker Compose

### 3a. Prepare secrets

```bash
cp .env.prod.example .env.prod
# Edit .env.prod with real production values
```

### 3b. Build & start

```bash
pnpm docker:prod:build
pnpm docker:prod:up
```

This uses `docker-compose.yml` + `docker-compose.prod.yml` which:
- Builds backend and frontend Docker images
- Runs `prisma migrate deploy` on backend startup
- Secures PostgreSQL/Redis (no public port exposure)
- Disables pgAdmin / Redis Commander
- Sets memory limits on all services

### 3c. Verify startup

```bash
# Follow logs
pnpm docker:prod:logs

# Health checks
curl http://localhost:4000/api/v1/health
curl http://localhost:3000
```

### 3d. Stop

```bash
pnpm docker:prod:down
```

---

## 4. Production — Manual (without Docker)

### Backend

```bash
cd backend
cp .env.example .env  # fill in production values

# Install production deps only
pnpm install --prod

# Generate Prisma client
pnpm prisma:generate

# Run DB migrations (non-destructive)
pnpm prisma:migrate:prod

# Build
pnpm build

# Start
NODE_ENV=production pnpm start:prod
```

### Frontend

```bash
cd frontend
cp .env.example .env.local  # fill in production values

# Enable standalone output
NEXT_BUILD_STANDALONE=true pnpm build

# Start
NODE_ENV=production PORT=3000 node .next/standalone/frontend/server.js
```

---

## 5. Facebook Webhook Configuration

1. In the [Facebook App Dashboard](https://developers.facebook.com/apps), navigate to **Messenger → Webhooks**.
2. Set the **Callback URL** to: `https://your-api-domain.com/api/v1/webhooks/facebook`
3. Set the **Verify Token** to the value of `FACEBOOK_WEBHOOK_VERIFY_TOKEN` in your backend `.env`.
4. Subscribe to: `messages`, `messaging_postbacks`, `messaging_optins`, `message_deliveries`, `message_reads`.

---

## 6. First-Time Admin Setup

After starting the app:

1. Navigate to `http://your-frontend/admin/signup` (or click the hidden admin link on the login page).
2. Create the first admin account (works only once — blocked after an admin exists).
3. Log in at `http://your-frontend/login?admin=true`.
4. Create workspaces and invite users from the admin panel.

---

## 7. Database Backup & Restore

```bash
# Backup
docker exec messagesender_postgres pg_dump -U messagesender messagesender_db > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i messagesender_postgres psql -U messagesender messagesender_db < backup_YYYYMMDD.sql
```

---

## 8. Environment Variable Quick Reference

### Critical production secrets checklist

- [ ] `JWT_SECRET` — unique, 64+ hex chars
- [ ] `JWT_REFRESH_SECRET` — unique, different from JWT_SECRET
- [ ] `ENCRYPTION_KEY` — exactly 64 hex chars (`openssl rand -hex 32`)
- [ ] `POSTGRES_PASSWORD` — strong random password
- [ ] `REDIS_PASSWORD` — strong random password
- [ ] `FACEBOOK_APP_SECRET` — from Facebook Developer Console
- [ ] `FACEBOOK_WEBHOOK_VERIFY_TOKEN` — custom random token
- [ ] `FRONTEND_URL` — your production frontend URL (CORS origin)
- [ ] `NEXT_PUBLIC_API_URL` — your production API URL

---

## 9. Reverse Proxy (Nginx example)

```nginx
# API (backend)
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 443 ssl;
    server_name app.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 10. Health Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/health` | None | Liveness probe (DB + Redis + memory) |
| `GET /api/v1/health/ready` | None | Readiness probe with detail |
