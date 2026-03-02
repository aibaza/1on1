# Security & Multi-tenancy

## Authentication

### Auth Methods

The application supports multiple authentication methods via Auth.js v5:

1. **Email + Password** — Default for company registration and invited users
2. **Magic Link** — Passwordless login via email (used for invitations)
3. **OAuth — Google** — "Sign in with Google" (Google Workspace integration)
4. **OAuth — Microsoft** — "Sign in with Microsoft" (Azure AD / Entra ID)
5. **SAML 2.0** (v2) — Enterprise SSO via Okta, Azure AD, OneLogin
6. **OIDC** (v2) — OpenID Connect for custom identity providers

### Session Management

- Sessions use HTTP-only, Secure, SameSite=Strict cookies
- JWT tokens for API authentication (short-lived: 15 min access token + refresh token)
- Session expiry: configurable per tenant (default: 24 hours, max: 30 days)
- Force logout capability for admins (invalidate all sessions for a user)

### Password Policy

- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- Bcrypt hashing with cost factor 12
- Password reset via time-limited magic link (expires in 1 hour)

---

## Authorization

### Role-Based Access Control (RBAC)

Three roles per tenant:

| Permission | Member | Manager | Admin |
|-----------|--------|---------|-------|
| View own profile | Yes | Yes | Yes |
| Edit own profile | Yes | Yes | Yes |
| View own sessions | Yes | Yes | Yes |
| Participate in sessions | Yes | Yes | Yes |
| View own action items | Yes | Yes | Yes |
| Start/conduct sessions | No | Yes (own reports) | Yes |
| View report's session history | No | Yes (own reports) | Yes |
| Create action items for reports | No | Yes (own reports) | Yes |
| View own team analytics | No | Yes | Yes |
| Create/edit questionnaire templates | No | Yes | Yes |
| Invite users | No | No | Yes |
| Manage teams | No | No | Yes |
| Deactivate users | No | No | Yes |
| Company settings | No | No | Yes |
| View company-wide analytics | No | No | Yes |
| Manage billing/subscription | No | No | Yes |

### Resource-Level Authorization

Beyond role checks, every data access verifies resource ownership:

```typescript
// Example: loading a session
async function getSession(sessionId: string, currentUser: User) {
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, sessionId),
      eq(sessions.tenantId, currentUser.tenantId) // tenant isolation
    ),
    with: { series: true }
  });

  if (!session) throw new NotFoundError();

  // Manager can view if they own the series
  // Member can view if they are the report
  const isManager = session.series.managerId === currentUser.id;
  const isReport = session.series.reportId === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  if (!isManager && !isReport && !isAdmin) {
    throw new ForbiddenError();
  }

  return session;
}
```

---

## Multi-tenancy

### Strategy: Shared Database, Shared Schema, tenant_id Isolation

All tenants share the same PostgreSQL database and tables. Every table with tenant-scoped data includes a `tenant_id` column.

**Why this approach:**
- Simplest to operate (one database, one connection pool)
- Easy to add new tenants (just insert a row)
- Cost-effective for early stage
- Can migrate to schema-per-tenant or database-per-tenant later if needed

### Row-Level Security (RLS)

PostgreSQL RLS provides a database-level safety net beyond application code:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answer ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables with tenant_id

-- Policy: users can only see rows from their own tenant
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON sessions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Set tenant context on every request
-- In the application middleware:
SET LOCAL app.current_tenant_id = '<tenant-uuid>';
SET LOCAL app.current_user_id = '<user-uuid>';
```

**Implementation in Drizzle ORM:**

```typescript
// Middleware that sets tenant context on every DB operation
export async function withTenantContext<T>(
  tenantId: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SET LOCAL app.current_tenant_id = ${tenantId}`
    );
    await tx.execute(
      sql`SET LOCAL app.current_user_id = ${userId}`
    );
    return operation();
  });
}
```

### Tenant Data Isolation Guarantees

1. **Application layer**: Every query includes `WHERE tenant_id = ?`
2. **Database layer**: RLS policies enforce tenant isolation even if application code has bugs
3. **API layer**: Tenant ID is derived from the authenticated session, never from request parameters
4. **Index layer**: All indexes include `tenant_id` as the first column for performance

---

## Data Encryption

### At Rest

| Data | Encryption | Method |
|------|-----------|--------|
| Database (all tables) | Yes | PostgreSQL TDE or managed service encryption (Neon/Supabase) |
| Private notes | Yes (additional) | Application-level AES-256-GCM encryption |
| File uploads (S3/R2) | Yes | Server-side encryption (SSE-S3 or SSE-KMS) |
| Backups | Yes | Same as primary storage |

### Private Notes Encryption

Private notes receive an extra layer of application-level encryption because they contain sensitive manager observations:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptNote(plaintext: string, tenantKey: string): EncryptedPayload {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(tenantKey, 'hex'), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

export function decryptNote(payload: EncryptedPayload, tenantKey: string): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(tenantKey, 'hex'),
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

  let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Key management:**
- Each tenant has a unique encryption key stored in a secrets manager (not in the database)
- Keys are derived from a master key using HKDF with tenant_id as context
- Key rotation is supported: re-encrypt on read if key version doesn't match

### In Transit

- All traffic over HTTPS (TLS 1.3)
- HSTS headers with 1-year max-age
- Certificate managed by Vercel / Cloudflare

---

## GDPR Compliance

### Data Subject Rights

| Right | Implementation |
|-------|---------------|
| **Right to Access** | Admin can export all data for a user as JSON/CSV via Settings → Privacy |
| **Right to Erasure** | Admin can trigger data deletion for a user. Anonymizes session answers, deletes notes, removes PII |
| **Right to Portability** | Data export in standard JSON format |
| **Right to Rectification** | Users can edit their own profile. Managers can correct session data |

### Data Retention

Configurable per tenant:

| Data Type | Default Retention | Configurable |
|-----------|-------------------|--------------|
| Session answers | Indefinite | Yes (min 1 year) |
| Session notes (shared) | Indefinite | Yes (min 1 year) |
| Private notes | Indefinite | Yes (min 1 year) |
| Action items | Indefinite | Yes |
| Analytics snapshots | Indefinite | No (always kept) |
| Notification logs | 90 days | Yes |
| Audit logs | 2 years | No (regulatory) |
| Deactivated user data | 90 days after deactivation | Yes |

### Data Deletion Process

When a user is deleted (not just deactivated):

1. **PII removal**: Name, email, avatar replaced with "Deleted User #[hash]"
2. **Session answers**: `answer_text` cleared, `answer_numeric` and `answer_json` retained (anonymized) for analytics continuity
3. **Private notes**: Permanently deleted (no recovery)
4. **Shared notes**: Retained but author attribution anonymized
5. **Action items**: Retained with anonymized assignee
6. **Analytics snapshots**: Retained (already aggregated, no PII)

### Cookie Policy

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| `session-token` | Authentication | 24h (configurable) | Essential |
| `csrf-token` | CSRF protection | Session | Essential |
| `theme` | UI theme preference | 1 year | Functional |
| `locale` | Language preference | 1 year | Functional |

No third-party cookies. No tracking cookies. No analytics cookies (use server-side analytics only).

---

## API Security

### Rate Limiting

| Endpoint Group | Rate Limit | Window |
|---------------|-----------|--------|
| Auth (login, register) | 10 requests | 15 minutes |
| Auth (password reset) | 3 requests | 1 hour |
| API (general) | 100 requests | 1 minute |
| API (analytics/export) | 10 requests | 1 minute |
| File upload | 20 requests | 1 hour |

### Input Validation

- All inputs validated with Zod schemas (shared between client and server)
- SQL injection: prevented by Drizzle ORM parameterized queries
- XSS: prevented by React's default escaping + Content-Security-Policy headers
- CSRF: protected by CSRF tokens on all state-changing requests

### Security Headers

```typescript
// next.config.ts headers
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0', // rely on CSP instead
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'"
}
```

---

## Audit Logging

### What Gets Logged

| Event | Data Captured |
|-------|--------------|
| User login | user_id, IP, user agent, method (password/OAuth/magic link) |
| User logout | user_id |
| Failed login | email attempted, IP, user agent |
| User invited | inviter_id, invitee_email, role |
| User deactivated | admin_id, target_user_id, reason |
| Session started | session_id, manager_id, report_id |
| Session completed | session_id, duration, score |
| Template created/edited | template_id, editor_id, changes |
| Data exported | admin_id, export_type, user_id (if applicable) |
| Settings changed | admin_id, setting_key, old_value, new_value |

### Audit Log Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  actor_id UUID REFERENCES users(id),  -- NULL for system events
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tenant_action ON audit_log(tenant_id, action, created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(tenant_id, actor_id, created_at DESC);
```

Audit logs are immutable — no UPDATE or DELETE operations. Retention: 2 years minimum.
