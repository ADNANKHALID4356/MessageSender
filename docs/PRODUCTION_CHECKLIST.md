# Production Deployment Checklist

Use this checklist before deploying **MessageSender** to production.

---

## 🔐 Security

- [ ] **Strong secrets generated**
  - [ ] `JWT_SECRET` — 64+ hex chars (`openssl rand -hex 64`)
  - [ ] `JWT_REFRESH_SECRET` — 64+ hex chars (different from JWT_SECRET)
  - [ ] `ENCRYPTION_KEY` — exactly 64 hex chars (`openssl rand -hex 32`)
  - [ ] `POSTGRES_PASSWORD` — strong random password
  - [ ] `REDIS_PASSWORD` — strong random password
  - [ ] `FACEBOOK_WEBHOOK_VERIFY_TOKEN` — random token
  
- [ ] **Environment files secured**
  - [ ] `.env.prod` created from `.env.prod.example`
  - [ ] `.env.prod` added to `.gitignore` (already done)
  - [ ] No `.env` files committed to git
  - [ ] Secret manager configured (AWS Secrets Manager / HashiCorp Vault / etc.)

- [ ] **HTTPS/TLS enabled**
  - [ ] SSL certificates installed
  - [ ] Redirect HTTP → HTTPS
  - [ ] HSTS headers enabled (already in `next.config.js`)
  
- [ ] **CORS properly configured**
  - [ ] `FRONTEND_URL` in backend `.env` set to production domain
  - [ ] No wildcard origins (`*`) in production

- [ ] **Rate limiting verified**
  - [ ] `THROTTLE_TTL` and `THROTTLE_LIMIT` tuned for production load
  - [ ] Login rate limiting active (5 attempts per 15 minutes)

---

## 🗄️ Database

- [ ] **PostgreSQL configured**
  - [ ] Production database created
  - [ ] Strong password set
  - [ ] Connection pooling enabled (via `DATABASE_URL` connection string params)
  - [ ] Regular backups scheduled
  - [ ] Migrations applied: `pnpm db:migrate:prod` or `prisma migrate deploy`
  
- [ ] **Redis configured**
  - [ ] Production Redis instance ready
  - [ ] Password authentication enabled
  - [ ] Persistence (AOF/RDB) enabled
  - [ ] Memory limit configured (`maxmemory` + eviction policy)

---

## 📱 Facebook Integration

- [ ] **Facebook App configured**
  - [ ] Production app created/configured in [Facebook Developer Console](https://developers.facebook.com/apps)
  - [ ] App reviewed & approved for public use (if needed)
  - [ ] Webhook callback URL set: `https://api.yourdomain.com/api/v1/webhooks/facebook`
  - [ ] Verify token matches `FACEBOOK_WEBHOOK_VERIFY_TOKEN`
  - [ ] Required permissions added: `pages_manage_metadata`, `pages_messaging`, `pages_read_engagement`
  - [ ] Webhook subscriptions active: `messages`, `messaging_postbacks`, `messaging_optins`, `message_deliveries`, `message_reads`
  - [ ] Business verification completed (if required)

---

## 🌐 Infrastructure

- [ ] **Domains & DNS**
  - [ ] Production domain registered
  - [ ] DNS A/CNAME records configured:
    - `app.yourdomain.com` → frontend
    - `api.yourdomain.com` → backend
  - [ ] SSL certificates obtained (Let's Encrypt, Cloudflare, etc.)

- [ ] **Reverse proxy configured** (Nginx / Caddy / Traefik / AWS ALB)
  - [ ] Frontend proxied to port 3000
  - [ ] Backend proxied to port 4000
  - [ ] WebSocket upgrade headers set for Socket.io
  - [ ] Request size limits configured (file uploads)
  - [ ] Rate limiting at proxy level (optional, additional layer)

- [ ] **Docker / Container orchestration**
  - [ ] Docker images built: `pnpm docker:prod:build`
  - [ ] Images pushed to registry (Docker Hub / AWS ECR / GCP GCR)
  - [ ] `docker-compose.prod.yml` configured with production values
  - [ ] Containers started: `pnpm docker:prod:up`
  - [ ] Health checks passing

- [ ] **Resource limits set**
  - [ ] Memory limits configured in Docker Compose
  - [ ] CPU limits configured (if needed)
  - [ ] Disk space monitored

---

## 📊 Monitoring & Logging

- [ ] **Application monitoring**
  - [ ] Sentry configured (`SENTRY_DSN` set in backend `.env`)
  - [ ] Error tracking verified
  - [ ] Performance monitoring enabled
  
- [ ] **Health checks**
  - [ ] `GET /api/v1/health` — returns 200 OK
  - [ ] `GET /api/v1/health/ready` — returns uptime + metrics
  - [ ] Uptime monitoring tool configured (UptimeRobot, Pingdom, etc.)

- [ ] **Logs centralized**
  - [ ] Docker logs forwarded to logging service (Datadog, Loggly, CloudWatch, etc.)
  - [ ] Log rotation configured
  - [ ] Sensitive data redacted from logs

---

## 🧪 Testing

- [ ] **Pre-deployment tests**
  - [ ] `pnpm test` — all unit tests pass
  - [ ] `pnpm test:e2e` — all E2E tests pass
  - [ ] `pnpm lint` — no linting errors
  - [ ] Manual smoke tests performed
  
- [ ] **Production smoke tests**
  - [ ] Admin signup works
  - [ ] Login works (admin & user)
  - [ ] Workspace creation works
  - [ ] Facebook page connection works
  - [ ] Webhook receiving works (send test message)
  - [ ] Sending messages works
  - [ ] Real-time updates work (Socket.io)

---

## 📧 Email (SMTP)

- [ ] **SMTP configured** (if using email features)
  - [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` set
  - [ ] Test email sent successfully
  - [ ] SPF/DKIM records configured (to avoid spam filters)

---

## 🚀 Deployment

- [ ] **First deployment**
  - [ ] Environment variables set in production
  - [ ] Database migrations applied
  - [ ] Seed data applied (optional, for initial admin)
  - [ ] Containers started & healthy
  - [ ] Frontend accessible via browser
  - [ ] Backend API responding

- [ ] **Post-deployment**
  - [ ] Create first admin account at `/admin/signup`
  - [ ] Create first workspace
  - [ ] Connect first Facebook page
  - [ ] Send test message
  - [ ] Verify webhook events received

---

## 📝 Documentation

- [ ] **Internal docs updated**
  - [ ] [DEPLOYMENT.md](./DEPLOYMENT.md) reviewed
  - [ ] Team trained on deployment process
  - [ ] Runbooks created for common issues

- [ ] **External docs** (if public/client-facing)
  - [ ] User guide written
  - [ ] API documentation published (Swagger at `/docs` disabled in production)

---

## 🔄 Backup & Recovery

- [ ] **Backup strategy**
  - [ ] Database backups automated (daily)
  - [ ] Backup restoration tested
  - [ ] Disaster recovery plan documented

- [ ] **Rollback plan**
  - [ ] Previous Docker images tagged & retained
  - [ ] Database migration rollback procedure documented
  - [ ] Zero-downtime deployment strategy (blue-green / rolling)

---

## ✅ Final Checks

- [ ] **Performance**
  - [ ] Page load times acceptable (<2s)
  - [ ] API response times acceptable (<200ms avg)
  - [ ] No memory leaks observed
  
- [ ] **Legal & Compliance**
  - [ ] Privacy policy published
  - [ ] Terms of service published
  - [ ] GDPR compliance reviewed (if EU users)
  - [ ] Facebook Platform Policy compliance verified

- [ ] **Team access**
  - [ ] Production server access restricted
  - [ ] SSH keys rotated
  - [ ] On-call rotation established

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Sign-off:** ___________
