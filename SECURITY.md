# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@yourdomain.com**

Include the following information:
- Type of issue (e.g., SQL injection, XSS, authentication bypass, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

We will acknowledge your email within **48 hours** and send a more detailed response within **7 days** indicating the next steps in handling your report.

---

## Security Best Practices

### For Deployment

1. **Never commit secrets to git**
   - Use `.env` files (gitignored)
   - Use secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)
   
2. **Use strong secrets**
   ```bash
   # JWT secrets (min 32 chars)
   openssl rand -hex 64
   
   # Encryption key (exactly 64 hex chars)
   openssl rand -hex 32
   
   # Database/Redis passwords
   openssl rand -base64 32
   ```

3. **Enable HTTPS only**
   - Obtain SSL certificates (Let's Encrypt, Cloudflare, etc.)
   - Redirect all HTTP traffic to HTTPS
   - Enable HSTS headers (already configured in `next.config.js`)

4. **Secure database access**
   - Use strong passwords
   - Whitelist IPs if possible
   - Enable SSL/TLS for database connections
   - Regular backups with encryption

5. **Limit resource exposure**
   - Don't expose PostgreSQL/Redis ports publicly
   - Use internal Docker networks
   - Use firewall rules

---

## Security Features

### Authentication & Authorization
- ✅ JWT tokens with refresh token rotation
- ✅ bcrypt password hashing (cost factor 12)
- ✅ Login rate limiting (5 attempts per 15 min)
- ✅ Session management with expiration
- ✅ Role-based access control (RBAC)

### Data Protection
- ✅ AES-256-GCM encryption for sensitive data (Facebook tokens)
- ✅ HMAC-SHA256 webhook signature verification
- ✅ Input validation on all endpoints (class-validator)
- ✅ SQL injection prevention (Prisma ORM parameterized queries)
- ✅ XSS prevention (React auto-escaping, CSP headers)

### Network Security
- ✅ Helmet.js security headers
- ✅ CORS with whitelist origins
- ✅ Rate limiting (global + endpoint-specific)
- ✅ Request size limits
- ✅ Compression enabled

### Operational Security
- ✅ Error messages sanitized (no stack traces in production)
- ✅ Health check endpoints (public, non-authenticated)
- ✅ Graceful shutdown handlers
- ✅ Logging with PII redaction
- ✅ Non-root Docker containers

---

## Known Security Considerations

### Environment Variables
- Production secrets must be set in `.env.prod` (not committed to git)
- `ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes)
- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be different

### Facebook Integration
- Webhook signature verification is **mandatory** — never disable
- Facebook tokens are encrypted at rest
- Page access tokens expire — refresh logic implemented

### Database
- Prisma migrations are **non-destructive** in production (`migrate deploy`)
- Soft deletes recommended for compliance (implemented for critical entities)

---

## Dependencies

We regularly update dependencies to patch security vulnerabilities:

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update --latest
```

Automated dependency updates via Dependabot (see `.github/dependabot.yml` if configured).

---

## Incident Response

In the event of a security incident:

1. **Contain** — Immediately revoke compromised credentials
2. **Assess** — Determine scope and impact
3. **Notify** — Inform affected users if data breach occurred
4. **Remediate** — Patch vulnerabilities, rotate secrets
5. **Document** — Post-mortem analysis

---

## Compliance

- **GDPR** — Right to erasure, data portability, consent management
- **Facebook Platform Policy** — Strict adherence to Facebook's terms
- **OWASP Top 10** — Mitigation strategies implemented

---

## Security Audits

Last audit: _[Date not set]_  
Next scheduled audit: _[Date not set]_

For enterprise deployments, we recommend:
- Annual penetration testing
- Quarterly dependency audits
- Regular security training for developers

---

## Contact

Security Team: **security@yourdomain.com**  
PGP Key: _[Not configured]_

---

_Last updated: February 18, 2026_
