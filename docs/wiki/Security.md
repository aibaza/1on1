# Security & Multi-tenancy

## Authentication

### Methods (via Auth.js v5)

| Method | Description | Phase |
|--------|-------------|-------|
| Email + Password | Default for registration and invited users | MVP |
| Magic Link | Passwordless login via email (invitations) | MVP |
| OAuth — Google | Google Workspace integration | MVP |
| OAuth — Microsoft | Azure AD / Entra ID | MVP |
| SAML 2.0 | Enterprise SSO (Okta, Azure AD, OneLogin) | v2 |
| OIDC | Custom identity providers | v2 |

### Session Management
- HTTP-only, Secure, SameSite=Strict cookies
- JWT tokens: 15 min access + refresh token
- Configurable session expiry (default 24h, max 30 days)
- Admin force-logout capability

### Password Policy
- Minimum 8 characters, must contain uppercase + lowercase + number
- Bcrypt hashing (cost factor 12)
- Reset via time-limited magic link (1 hour expiry)

## Authorization (RBAC)

| Permission | Member | Manager | Admin |
|-----------|--------|---------|-------|
| View/edit own profile | Yes | Yes | Yes |
| View own sessions + action items | Yes | Yes | Yes |
| Participate in sessions | Yes | Yes | Yes |
| Start/conduct sessions | No | Own reports | Yes |
| View report's history | No | Own reports | Yes |
| Create action items for reports | No | Own reports | Yes |
| View own team analytics | No | Yes | Yes |
| Create/edit templates | No | Yes | Yes |
| Invite users | No | No | Yes |
| Manage teams | No | No | Yes |
| Deactivate users | No | No | Yes |
| Company settings | No | No | Yes |
| Company-wide analytics | No | No | Yes |
| Billing/subscription | No | No | Yes |

### Resource-Level Authorization
Beyond role checks, every data access verifies resource ownership: tenant isolation check + relationship check (manager of the series, report in the series, or admin).

## Multi-tenancy

### Strategy
Shared database, shared schema, `tenant_id` isolation.

**Rationale**: simplest to operate, easy to add tenants, cost-effective. Can migrate to schema-per-tenant later.

### Row-Level Security (RLS)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

Application sets `app.current_tenant_id` via `SET LOCAL` on every request.

### Isolation Guarantees
1. **Application layer**: every query includes `WHERE tenant_id = ?`
2. **Database layer**: RLS policies even if application code has bugs
3. **API layer**: tenant ID from authenticated session, never from request params
4. **Index layer**: all indexes include `tenant_id` as first column

## Data Encryption

### At Rest

| Data | Method |
|------|--------|
| Database (all tables) | PostgreSQL TDE or managed service encryption |
| Private notes | Application-level AES-256-GCM (additional layer) |
| File uploads (S3/R2) | Server-side encryption |
| Backups | Same as primary storage |

### Private Notes Encryption
Per-tenant encryption keys stored in secrets manager. Keys derived from master key using HKDF with tenant_id as context. Key rotation supported via re-encrypt on read.

### In Transit
- HTTPS (TLS 1.3), HSTS (1-year max-age)
- Certificate managed by Vercel / Cloudflare

## GDPR Compliance

### Data Subject Rights

| Right | Implementation |
|-------|---------------|
| Access | Admin exports all user data as JSON/CSV |
| Erasure | Anonymizes answers, deletes notes, removes PII |
| Portability | Standard JSON export |
| Rectification | Users edit own profile, managers correct session data |

### Data Retention (configurable per tenant)

| Data | Default | Min |
|------|---------|-----|
| Session answers/notes | Indefinite | 1 year |
| Action items | Indefinite | — |
| Analytics snapshots | Indefinite | Always kept |
| Notification logs | 90 days | — |
| Audit logs | 2 years | Regulatory |
| Deactivated user data | 90 days | — |

### Deletion Process
1. PII → "Deleted User #[hash]"
2. answer_text cleared, numeric/json retained (anonymized)
3. Private notes permanently deleted
4. Shared notes retained, author anonymized
5. Action items retained, assignee anonymized
6. Analytics snapshots retained (already aggregated)

### Cookies
Only essential (session-token, csrf-token) and functional (theme, locale). No third-party, tracking, or analytics cookies.

## API Security

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (login/register) | 10 | 15 min |
| Auth (password reset) | 3 | 1 hour |
| API (general) | 100 | 1 min |
| API (analytics/export) | 10 | 1 min |
| File upload | 20 | 1 hour |

### Input Validation
- Zod schemas shared client/server
- SQL injection prevented by Drizzle parameterized queries
- XSS prevented by React escaping + CSP headers
- CSRF tokens on all state-changing requests

### Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; ...
```

## Audit Logging

Logged events: login/logout, failed login, user invited/deactivated, session started/completed, template created/edited, data exported, settings changed.

Schema: tenant_id, actor_id, action, resource_type, resource_id, metadata (JSONB), ip_address, user_agent, created_at.

Audit logs are immutable (no UPDATE/DELETE). Retention: 2 years minimum.
