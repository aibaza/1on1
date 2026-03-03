# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-03-03
**Domain:** Next.js scaffolding, PostgreSQL multi-tenancy with RLS, application-level encryption, Docker Compose local environment, Vercel deployment
**Confidence:** HIGH

## Summary

Phase 1 establishes the complete application skeleton: a Next.js 15 project scaffolded with Bun, connected to PostgreSQL via Drizzle ORM, with the full database schema (all tables from data-model.md) deployed upfront. The critical infrastructure pieces are Row-Level Security (RLS) enforced via a dedicated application role (not neondb_owner which has BYPASSRLS), a `withTenantContext()` wrapper using `SET LOCAL` inside transactions, and AES-256-GCM private note encryption with HKDF-derived per-tenant keys and key versioning.

The local development environment uses Docker Compose with PostgreSQL (two databases: `oneonone_stable` and `oneonone_dev`) and a built Next.js app for the stable "green" instance, while active development runs bare-metal with `bun dev`. Deployment targets Vercel with the Neon-Vercel integration for automatic database branching on preview deploys.

**Primary recommendation:** Use `drizzle-orm/neon-serverless` (WebSocket driver) for all database access -- it supports interactive transactions required by the `SET LOCAL` pattern for RLS. The HTTP driver (`neon-http`) does not support session/interactive transactions and cannot be used with `SET LOCAL`. For local development, the same neon-serverless driver works against a local PostgreSQL via a WebSocket proxy, or use `drizzle-orm/node-postgres` (pg) with direct TCP connections.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Database provider:** Neon for managed PostgreSQL (not Supabase). Database branching enabled. Dedicated app role (not neondb_owner) to enforce RLS. Full schema deployed upfront -- all tables from data-model.md created in Phase 1.
- **Encryption key storage:** Master encryption key as environment variable (ENCRYPTION_MASTER_KEY). Key versioning via key_version field on private_note table (missing from current docs -- must be added). Rotation means updating env var and re-deploying.
- **Development seed data:** Full demo company "Acme Corp" with admin, 2 managers, 4 members, teams, reporting lines, 2 templates, sessions with answers. Second tenant "Beta Inc" with minimal data for multi-tenancy isolation testing. Idempotent seed script at src/lib/db/seed.ts.
- **Blue-green local setup:** Stable (green) version runs in Docker Compose (PostgreSQL + built Next.js on port 4300). Active dev runs bare-metal with `bun dev` on 4301. Shared PostgreSQL container with two databases.
- **Vercel deployment:** Vercel project linked to GitHub. Default *.vercel.app subdomain. Production from main, previews from PRs. Neon Vercel integration for automatic DATABASE_URL and branch cleanup. No CI/CD yet.

### Claude's Discretion
- Connection pooling configuration for Neon
- Docker Compose service configuration and Dockerfile optimization
- ESLint and Prettier configuration details
- TypeScript strict mode config specifics
- Drizzle ORM configuration and migration setup approach

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Application runs in Docker Compose locally on port 4300, accessible on local network | Docker Compose with PostgreSQL + standalone Next.js build; host binding 0.0.0.0:4300 |
| INFR-02 | Blue-green local deployment -- stable test env always running while developing | Two Docker Compose databases (oneonone_stable, oneonone_dev); stable runs containerized, dev runs bare-metal |
| INFR-03 | Application is deployable to Vercel (serverless functions, edge runtime) | Next.js 15 + output: "standalone"; neon-serverless driver for Vercel serverless; Neon-Vercel integration |
| INFR-04 | Bun is the package manager for all dependency management | `bunx create-next-app` scaffolding; `bun install`; bun.lock file |
| ORG-02 | Organization data fully isolated via tenant_id on all tables | Every table with tenant data includes tenant_id column; withTenantContext() wrapper |
| ORG-03 | PostgreSQL Row-Level Security enforces tenant isolation at DB level | RLS policies on all tenant-scoped tables; dedicated app role without BYPASSRLS; SET LOCAL in transactions |
| SEC-01 | Private notes encrypted at rest with AES-256-GCM, per-tenant keys via HKDF | Node.js crypto.hkdfSync for key derivation; AES-256-GCM encrypt/decrypt; stored as JSON payload |
| SEC-02 | Encryption key versioning for rotation support | key_version column on private_note; decrypt attempts current version, falls back to old keys |
| SEC-05 | Tenant ID always derived from authenticated session, never from request parameters | withTenantContext() takes tenantId from session; no tenant parameter in API routes |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest 15.5) | Full-stack React framework | App Router, Server Components, API routes, Vercel-native |
| TypeScript | 5.x (strict mode) | Type safety | End-to-end type safety with Drizzle schema inference |
| Drizzle ORM | 0.45.x | Type-safe PostgreSQL ORM | Declarative schema, pgEnum, RLS support, migration generation |
| drizzle-kit | latest | Schema migrations CLI | `generate` and `migrate` commands; `drizzle-kit studio` for DB browsing |
| @neondatabase/serverless | latest | Neon PostgreSQL driver | WebSocket + HTTP drivers for serverless; required for Neon connections |
| Tailwind CSS | 4.x | Utility-first CSS | CSS-first config (@theme directive), no tailwind.config.ts needed, 70% smaller output |
| shadcn/ui | latest (CLI) | UI component library | Accessible Radix-based components; installed via CLI into project; Tailwind v4 support |
| Bun | 1.x (latest stable) | Package manager + runtime | 28x faster installs than npm; TypeScript native; user preference |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | latest | Environment variable loading | Local development .env file loading |
| pg | 8.x | Direct PostgreSQL TCP driver | Local development without WebSocket proxy (alternative to neon-serverless locally) |
| ws + bufferutil | latest | WebSocket support for Node.js | Required if using neon-serverless driver in Node.js (local dev) |
| zod | 3.x | Schema validation | Shared client/server validation; seed data validation |
| tsx | latest | TypeScript execution | Running seed scripts: `bun run src/lib/db/seed.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| neon-serverless (WebSocket) | neon-http | HTTP is faster for single queries but does NOT support interactive transactions needed for SET LOCAL |
| neon-serverless locally | pg (node-postgres) | pg works via direct TCP without WebSocket proxy; simpler local setup but different driver in dev vs prod |
| pgEnum | text + CHECK constraint | pgEnum provides type safety and Drizzle inference; CHECK is more flexible but less type-safe |
| Next.js 15 | Next.js 16 | 16 is available but 15 is specified in project stack; more ecosystem maturity |

**Installation:**
```bash
# Scaffold project
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --use-bun

# Core dependencies
bun add drizzle-orm @neondatabase/serverless zod

# Dev dependencies
bun add -d drizzle-kit tsx dotenv @types/node

# For local dev with neon-serverless driver in Node.js
bun add ws bufferutil
bun add -d @types/ws

# shadcn/ui initialization
bunx shadcn@latest init
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                          # Next.js App Router (pages + API routes)
│   ├── api/                      # API route handlers
│   └── (dashboard)/              # Protected route group (future phases)
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── db/
│   │   ├── schema/               # Drizzle table definitions (one file per domain)
│   │   │   ├── enums.ts          # All pgEnum definitions (shared across tables)
│   │   │   ├── tenants.ts
│   │   │   ├── users.ts
│   │   │   ├── teams.ts
│   │   │   ├── templates.ts
│   │   │   ├── series.ts
│   │   │   ├── sessions.ts
│   │   │   ├── answers.ts
│   │   │   ├── action-items.ts
│   │   │   ├── notifications.ts
│   │   │   ├── analytics.ts
│   │   │   └── index.ts          # Re-exports all tables + enums
│   │   ├── index.ts              # DB client initialization (driver selection)
│   │   ├── tenant-context.ts     # withTenantContext() wrapper
│   │   ├── migrations/           # Generated by drizzle-kit
│   │   └── seed.ts               # Development seed data
│   ├── encryption/
│   │   ├── keys.ts               # HKDF key derivation, key version management
│   │   └── private-notes.ts      # AES-256-GCM encrypt/decrypt for notes
│   └── validations/              # Zod schemas (future phases)
├── types/
│   └── index.ts                  # Shared TypeScript types
drizzle.config.ts                 # Drizzle Kit configuration
docker-compose.yml                # Local development services
Dockerfile                        # Production build for stable container
.env.example                      # Template for environment variables
.env.local                        # Local secrets (git-ignored)
```

### Pattern 1: Dual-Database Driver Setup

**What:** Configure Drizzle to use neon-serverless in production and either neon-serverless (with ws) or node-postgres locally.
**When to use:** Always -- the connection driver must match the environment.
**Example:**

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// In Node.js environments (local dev), configure WebSocket
if (typeof globalThis.WebSocket === 'undefined') {
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

Source: [Drizzle + Neon docs](https://orm.drizzle.team/docs/connect-neon), [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)

### Pattern 2: Tenant Context via SET LOCAL in Transaction

**What:** Every database query runs inside a transaction that sets `app.current_tenant_id` via `SET LOCAL`, enabling RLS policies.
**When to use:** Every database operation that touches tenant-scoped data.
**Why SET LOCAL is safe with connection pooling:** Neon uses PgBouncer in transaction mode (`pool_mode=transaction`). `SET LOCAL` is scoped to the current transaction and automatically reverts when the transaction commits or rolls back. This is explicitly compatible with transaction-mode pooling. Regular `SET` (without LOCAL) would be dangerous because it persists on the session/connection level.
**Example:**

```typescript
// src/lib/db/tenant-context.ts
import { db } from './index';
import { sql } from 'drizzle-orm';

export async function withTenantContext<T>(
  tenantId: string,
  userId: string,
  operation: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await operation(tx);
  });
}
```

Note: Using `set_config(name, value, true)` is equivalent to `SET LOCAL` and works better as a function call in parameterized queries. The third argument `true` means "local to current transaction."

Source: [PostgreSQL set_config docs](https://www.postgresql.org/docs/current/functions-admin.html), [PgBouncer transaction mode compatibility](https://www.pgbouncer.org/features.html)

### Pattern 3: Dedicated Application Role for RLS Enforcement

**What:** Create a PostgreSQL role without BYPASSRLS that the application connects as. neondb_owner (Neon's default) has BYPASSRLS and must NOT be used for application queries.
**When to use:** Database setup / migration step -- create the role once, use it for all application connections.
**Example:**

```sql
-- Run as neondb_owner (migration context)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password' NOINHERIT;

-- Grant access
GRANT CONNECT ON DATABASE neondb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;

-- RLS policies apply to this role
-- neondb_owner retains BYPASSRLS for migrations and admin operations
```

Source: [Neon Manage Roles](https://neon.com/docs/manage/roles), [Neon Database Access](https://neon.com/docs/manage/database-access)

### Pattern 4: Drizzle Schema with pgEnum and UUID Primary Keys

**What:** Define tables using Drizzle's pgTable with UUID primary keys, pgEnum for type-safe enums, and proper foreign key relationships.
**When to use:** All schema definitions.
**Example:**

```typescript
// src/lib/db/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'member']);
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro', 'enterprise']);
export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled', 'in_progress', 'completed', 'cancelled', 'missed'
]);
// ... all other enums

// src/lib/db/schema/tenants.ts
import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { planEnum } from './enums';

export const tenants = pgTable('tenant', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  plan: planEnum('plan').notNull().default('free'),
  settings: jsonb('settings').notNull().default({}),
  logoUrl: varchar('logo_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Source: [Drizzle pgEnum docs](https://orm.drizzle.team/docs/column-types/pg), [Drizzle schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration)

### Pattern 5: AES-256-GCM Encryption with HKDF Key Derivation

**What:** Derive per-tenant encryption keys from a master key using HKDF, then encrypt/decrypt private notes with AES-256-GCM.
**When to use:** All private note read/write operations.
**Example:**

```typescript
// src/lib/encryption/keys.ts
import { hkdfSync, randomBytes } from 'crypto';

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, 'hex');

export function deriveTenantKey(tenantId: string, keyVersion: number = 1): Buffer {
  const info = `tenant:${tenantId}:v${keyVersion}`;
  return Buffer.from(
    hkdfSync('sha256', MASTER_KEY, '', info, 32) // 32 bytes = 256 bits
  );
}

// src/lib/encryption/private-notes.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { deriveTenantKey } from './keys';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

interface EncryptedPayload {
  ciphertext: string;  // hex
  iv: string;          // hex
  authTag: string;     // hex
  keyVersion: number;
}

export function encryptNote(
  plaintext: string,
  tenantId: string,
  keyVersion: number
): EncryptedPayload {
  const key = deriveTenantKey(tenantId, keyVersion);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    keyVersion,
  };
}

export function decryptNote(
  payload: EncryptedPayload,
  tenantId: string
): string {
  const key = deriveTenantKey(tenantId, payload.keyVersion);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

  let plaintext = decipher.update(payload.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}
```

Source: [Node.js crypto.hkdfSync](https://nodejs.org/api/crypto.html#cryptohkdfsyncdigest-ikm-salt-info-keylen), [AES-256-GCM gist](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81)

### Pattern 6: RLS Policy Definition in SQL Migrations

**What:** Enable RLS and create policies for all tenant-scoped tables as part of Drizzle migrations.
**When to use:** After table creation, in the same migration or a dedicated RLS migration.
**Example:**

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_question ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answer ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE talking_point ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshot ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (applied to all tenant-scoped tables)
CREATE POLICY tenant_isolation ON "user"
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Private notes: additional author-only restriction
CREATE POLICY tenant_isolation ON private_note
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY author_only ON private_note
  USING (author_id = current_setting('app.current_user_id')::uuid);

-- TENANT table itself does NOT get tenant-scoped RLS (it IS the tenant)
-- Instead, restrict to "id matches current tenant"
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self_access ON tenant
  USING (id = current_setting('app.current_tenant_id')::uuid);
```

Note: Drizzle ORM has native RLS support via `pgPolicy()` and `.withRLS()`, but for complex multi-table policies, custom SQL migrations provide more control and clarity.

Source: [Drizzle RLS docs](https://orm.drizzle.team/docs/rls), [PostgreSQL RLS docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### Anti-Patterns to Avoid

- **Using neondb_owner for application queries:** This role has BYPASSRLS -- RLS policies are silently ignored. Always use a dedicated app role.
- **Using `SET` instead of `SET LOCAL`:** Regular `SET` persists beyond the transaction. With PgBouncer transaction pooling, the setting leaks to the next user of that connection. Always use `SET LOCAL` or `set_config(..., true)`.
- **Querying outside withTenantContext():** Any query that bypasses the tenant context wrapper will see all data (if using the app role without default-deny RLS) or no data (with default-deny). Every query must go through the wrapper.
- **Using neon-http driver for RLS:** The HTTP driver does not support interactive transactions. `SET LOCAL` requires a transaction context. Use neon-serverless (WebSocket) instead.
- **Using serial/bigserial for ID columns:** Deprecated in modern PostgreSQL. Use `uuid().primaryKey().defaultRandom()` or `integer().primaryKey().generatedAlwaysAsIdentity()` as appropriate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Custom SQL migration runner | drizzle-kit generate + migrate | Handles schema diffs, rollback tracking, migration ordering |
| PostgreSQL connection pooling | Custom pool management | Neon built-in PgBouncer (pooled connection string) | Handles up to 10,000 concurrent connections; managed infrastructure |
| HKDF key derivation | Custom KDF implementation | Node.js crypto.hkdfSync | NIST-standard (RFC 5869); battle-tested implementation |
| AES-256-GCM encryption | Custom encryption library | Node.js crypto (createCipheriv/createDecipheriv) | OpenSSL-backed; handles IV generation, auth tags, padding |
| UI component primitives | Custom accessible components | shadcn/ui (Radix-based) | Keyboard navigation, ARIA attributes, focus management |
| CSS utility framework | Custom design tokens | Tailwind CSS v4 | @theme directive for tokens; automatic content detection |
| Docker multi-stage builds | Single-stage Dockerfile | Multi-stage pattern (deps, builder, runner) | Smaller images; separate build-time from runtime deps |

**Key insight:** This phase is infrastructure -- every piece should use battle-tested libraries. Custom code is limited to the tenant context wrapper, encryption integration, and seed data. Everything else is configuration.

## Common Pitfalls

### Pitfall 1: neondb_owner BYPASSRLS

**What goes wrong:** Application connects as neondb_owner (Neon's default role), RLS policies exist but are silently bypassed. All data is visible across tenants.
**Why it happens:** neondb_owner inherits neon_superuser which includes BYPASSRLS. The Neon-Vercel integration provisions DATABASE_URL with neondb_owner by default.
**How to avoid:** Create a dedicated `app_user` role via SQL. Update DATABASE_URL in Vercel env vars to use this role. Keep neondb_owner credentials separate for migrations only.
**Warning signs:** Seed data from "Beta Inc" appearing when logged in as "Acme Corp" user. Test this explicitly with the two-tenant seed data.

### Pitfall 2: SET LOCAL Without Transaction

**What goes wrong:** `SET LOCAL` outside a transaction is equivalent to `SET` -- it becomes session-scoped and leaks to other requests via connection pooling.
**Why it happens:** Forgetting to wrap queries in `db.transaction()`, or calling `db.execute()` directly instead of through `withTenantContext()`.
**How to avoid:** Make `withTenantContext()` the only way to get a database handle for tenant-scoped queries. The function always wraps in a transaction.
**Warning signs:** Intermittent data leakage in production (hard to reproduce locally with single-user testing). Two-tenant seed data testing catches this early.

### Pitfall 3: HTTP Driver with Transactions

**What goes wrong:** Using `drizzle-orm/neon-http` which does not support interactive/session transactions. `SET LOCAL` cannot be issued because each statement runs in its own implicit transaction.
**Why it happens:** neon-http is recommended for simple queries and is faster for single operations. It's easy to start with it and not realize it can't do transactions.
**How to avoid:** Use `drizzle-orm/neon-serverless` (WebSocket driver) which supports `db.transaction()`. The HTTP driver is only suitable for non-RLS queries (which this project has none of).
**Warning signs:** "Transactions are not supported" errors; RLS policies not taking effect.

### Pitfall 4: Forgetting DEFAULT PRIVILEGES

**What goes wrong:** New tables created in future migrations don't grant permissions to app_user. Queries fail with "permission denied."
**Why it happens:** `GRANT ... ON ALL TABLES` only covers existing tables. New tables need `ALTER DEFAULT PRIVILEGES` to auto-grant.
**How to avoid:** Include `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ... ON TABLES TO app_user` in the role setup migration.
**Warning signs:** Queries work for Phase 1 tables but break when Phase 2 adds new tables.

### Pitfall 5: Encryption Key in Code or Git

**What goes wrong:** Master encryption key committed to git or hardcoded in source. Key exposure compromises all private notes.
**Why it happens:** Forgetting to add .env.local to .gitignore, or using a placeholder key that becomes permanent.
**How to avoid:** Generate a random 256-bit key (`openssl rand -hex 32`). Store ONLY in .env.local (git-ignored) and Vercel env vars. .env.example has a placeholder comment, never a real key.
**Warning signs:** `ENCRYPTION_MASTER_KEY` appearing in git history or CI logs.

### Pitfall 6: Tailwind CSS v4 Breaking Changes

**What goes wrong:** Following Tailwind v3 tutorials/patterns that don't work in v4. Stale configuration files.
**Why it happens:** Tailwind v4 (released January 2025) replaced tailwind.config.ts with CSS-first configuration (@theme directive). Many tutorials/examples still show v3 patterns.
**How to avoid:** Do not create tailwind.config.ts. All configuration goes in globals.css via `@import "tailwindcss"` and `@theme` blocks. Content detection is automatic.
**Warning signs:** tailwind.config.ts file exists; `@tailwind base/components/utilities` directives in CSS (v3 pattern).

### Pitfall 7: Docker Bind Mount Performance

**What goes wrong:** Docker volumes for node_modules or .next cause extremely slow builds on macOS/Windows.
**Why it happens:** File system translation layer between host and container is slow for large directories.
**How to avoid:** Use named volumes (not bind mounts) for node_modules. For the stable container, copy built output into the image -- don't mount source code.
**Warning signs:** Docker builds taking 10+ minutes; hot reload latency of 30+ seconds.

## Code Examples

### Drizzle Configuration

```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/neon-new
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/lib/db/migrations',
  schema: './src/lib/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Database Client Initialization

```typescript
// src/lib/db/index.ts
// Source: https://orm.drizzle.team/docs/connect-neon
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Node.js environments need WebSocket polyfill
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require('ws');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
```

### Complete Tenant Context Wrapper

```typescript
// src/lib/db/tenant-context.ts
import { sql } from 'drizzle-orm';
import { db, type Database } from './index';

type TransactionClient = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Wraps a database operation in a transaction with tenant context.
 * SET LOCAL ensures the setting is scoped to this transaction only,
 * which is safe with PgBouncer transaction-mode pooling.
 */
export async function withTenantContext<T>(
  tenantId: string,
  userId: string,
  operation: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // set_config with true = SET LOCAL (transaction-scoped)
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userId}, true)`
    );
    return await operation(tx);
  });
}
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "0.0.0.0:4300:3000"
    environment:
      DATABASE_URL: postgresql://app_user:app_password@db:5432/oneonone_stable
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

### Database Initialization Script

```bash
#!/bin/bash
# scripts/init-db.sh - Creates both databases and the app role
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  -- Create databases
  CREATE DATABASE oneonone_stable;
  CREATE DATABASE oneonone_dev;

  -- Create app role (no BYPASSRLS)
  CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password';

  -- Grant on stable database
  \c oneonone_stable
  GRANT CONNECT ON DATABASE oneonone_stable TO app_user;
  GRANT USAGE, CREATE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;

  -- Grant on dev database
  \c oneonone_dev
  GRANT CONNECT ON DATABASE oneonone_dev TO app_user;
  GRANT USAGE, CREATE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;
EOSQL
```

### Standalone Dockerfile for Next.js + Bun

```dockerfile
# Dockerfile
# Multi-stage build for Next.js standalone with Bun

# Stage 1: Install dependencies
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# Stage 2: Build application
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

Note: The runner stage uses `node:22-alpine` (not bun) because Next.js standalone output is a Node.js server. Bun is used for faster dependency installation and building.

### next.config.ts for Standalone Output

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker deployment
};

export default nextConfig;
```

### ESLint Flat Config

```javascript
// eslint.config.mjs
// Source: https://nextjs.org/docs/app/api-reference/config/eslint
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "node_modules/**"],
  },
];

export default eslintConfig;
```

### Generate Master Encryption Key

```bash
# Generate a 256-bit (32-byte) key as hex string
openssl rand -hex 32
# Output: e.g. a1b2c3d4e5f6...  (64 hex characters)

# Add to .env.local
echo "ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)" >> .env.local
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serial` / `bigserial` PKs | `uuid().defaultRandom()` or `integer().generatedAlwaysAsIdentity()` | Drizzle 0.32+ (2024) | Identity columns prevent accidental ID insertion; UUIDs avoid enumeration |
| tailwind.config.ts (JS config) | CSS-first config with @theme directive | Tailwind CSS v4 (Jan 2025) | No config file needed; 70% smaller CSS output; 5x faster builds |
| @tailwind base/components/utilities | @import "tailwindcss" | Tailwind CSS v4 (Jan 2025) | Single import replaces three directives |
| .eslintrc.json (legacy config) | eslint.config.mjs (flat config) | ESLint 9+ / Next.js 15 | Flat config is now the standard; .eslintrc is deprecated |
| neon-http for all queries | neon-serverless for transactions | Ongoing distinction | HTTP cannot do interactive transactions; serverless (WebSocket) required for SET LOCAL |
| Drizzle `pgPolicy()` in schema | Custom SQL migrations for RLS | Drizzle 0.32+ | Drizzle has native RLS support but custom SQL gives more control for complex policies |

**Deprecated/outdated:**
- `tailwind.config.ts` / `tailwind.config.js` -- replaced by CSS-first configuration in v4
- `.eslintrc.json` / `.eslintrc.js` -- replaced by flat config `eslint.config.mjs`
- `serial` / `bigserial` columns -- use identity columns or UUIDs instead
- `@tailwind base; @tailwind components; @tailwind utilities;` -- use `@import "tailwindcss"` in v4

## Open Questions

1. **Neon Vercel integration and dedicated app role**
   - What we know: Neon-Vercel integration provisions DATABASE_URL with neondb_owner. We need a dedicated app_user role.
   - What's unclear: Whether the integration can be configured to provision a different role, or if we must manually update DATABASE_URL in Vercel env vars after initial setup.
   - Recommendation: After installing the Neon-Vercel integration, manually update DATABASE_URL to use app_user credentials. Document this in setup instructions. LOW risk -- straightforward manual step.

2. **Drizzle RLS via schema vs custom SQL migration**
   - What we know: Drizzle 0.32+ has native `pgPolicy()` and `.withRLS()` support. We could define RLS in Drizzle schema files.
   - What's unclear: Whether `drizzle-kit generate` handles the dedicated role creation and complex policy patterns (e.g., private note author-only) reliably, or if custom SQL is more predictable.
   - Recommendation: Define tables in Drizzle schema (for type inference), but create RLS policies and the app role via custom SQL migration files. This gives full control over the exact SQL. MEDIUM confidence -- Drizzle's RLS support is relatively new.

3. **Private note content column storage format**
   - What we know: The encrypted payload includes ciphertext, IV, authTag, and keyVersion. The current schema has `content TEXT` on private_note.
   - What's unclear: Whether to store the encrypted payload as a JSON string in the TEXT column, or add separate columns (content_encrypted, iv, auth_tag, key_version).
   - Recommendation: Store as JSON string in the existing `content TEXT` column with a `key_version INTEGER` column added separately (as noted in CONTEXT.md). The JSON approach keeps the schema simple and the encryption details are implementation concerns. The key_version column enables efficient querying for re-encryption jobs.

4. **Local PostgreSQL WebSocket proxy for neon-serverless**
   - What we know: neon-serverless uses WebSocket to connect. Local PostgreSQL speaks TCP.
   - What's unclear: Whether to use a WebSocket proxy (like the Neon local proxy) or simply use the `pg` driver locally.
   - Recommendation: Use `pg` (node-postgres) driver locally for simplicity, with an environment-based driver switch. Alternatively, use Neon's local development proxy if available. The driver abstraction in `withTenantContext()` makes the switch transparent. MEDIUM confidence -- need to test driver interchangeability.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM - Connect to Neon](https://orm.drizzle.team/docs/connect-neon) - Connection drivers, setup, configuration
- [Drizzle ORM - RLS](https://orm.drizzle.team/docs/rls) - Row-Level Security support, pgPolicy, withRLS
- [Drizzle ORM - Transactions](https://orm.drizzle.team/docs/transactions) - Transaction API, raw SQL execution
- [Drizzle ORM - PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - pgEnum, uuid, identity columns
- [Neon - Manage Roles](https://neon.com/docs/manage/roles) - Role creation, BYPASSRLS, neondb_owner
- [Neon - Database Access](https://neon.com/docs/manage/database-access) - GRANT chain, schema/table/sequence permissions
- [Neon - Connection Pooling](https://neon.com/docs/connect/connection-pooling) - PgBouncer transaction mode, pooled vs direct
- [Neon - Vercel Integration](https://neon.com/docs/guides/neon-managed-vercel-integration) - Branch per preview, auto-cleanup
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - Policy syntax, USING/WITH CHECK
- [shadcn/ui - Next.js Installation](https://ui.shadcn.com/docs/installation/next) - CLI init, Tailwind v4 support
- [Tailwind CSS v4 - Next.js Guide](https://tailwindcss.com/docs/guides/nextjs) - CSS-first config, @import, @theme
- [Next.js - Deploying](https://nextjs.org/docs/app/getting-started/deploying) - Standalone output, Docker

### Secondary (MEDIUM confidence)
- [Drizzle + Local and Serverless Postgres](https://neon.com/guides/drizzle-local-vercel) - Dual driver setup pattern
- [Next.js Docker + Bun Standalone Guide](https://dev.to/imamdev_/complete-guide-to-deploying-nextjs-standalone-with-bun-and-docker-1fc9) - Dockerfile patterns
- [PgBouncer Features](https://www.pgbouncer.org/features.html) - SET LOCAL compatibility with transaction mode
- [pganalyze - RLS with PgBouncer](https://pganalyze.com/blog/postgres-row-level-security-ruby-rails) - SET LOCAL safety in transaction mode
- [Node.js crypto.hkdfSync](https://nodejs.org/api/crypto.html) - HKDF key derivation API
- [Bun + Next.js Guide](https://bun.com/docs/guides/ecosystem/nextjs) - Bun as package manager and runtime

### Tertiary (LOW confidence)
- [Bun runtime compatibility concerns](https://github.com/vercel/next.js/discussions/55272) - Bun runtime not fully supported for Next.js in all cases; use Bun as package manager, Node.js as runtime
- [Next.js 16 availability](https://nextjs.org/blog) - Next.js 16.1 is now available, but project specifies Next.js 15

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-documented with official guides for this exact combination (Next.js + Drizzle + Neon + Tailwind v4)
- Architecture: HIGH - Tenant isolation via SET LOCAL in transactions is a well-established pattern; Drizzle transaction API verified; PgBouncer transaction-mode compatibility confirmed
- Pitfalls: HIGH - BYPASSRLS on neondb_owner is documented by Neon; SET LOCAL vs SET distinction is well-understood in PostgreSQL community; Tailwind v4 migration differences are documented
- Encryption: HIGH - AES-256-GCM and HKDF are NIST standards; Node.js crypto API is stable and well-documented
- Docker/Deployment: MEDIUM - Blue-green local pattern is custom (no standard template exists); Dockerfile with Bun builds is less battle-tested than npm/pnpm equivalents

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack; 30-day validity)
