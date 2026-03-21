# Technology Stack: Google Workspace Integration

**Project:** 1on1 - Google Workspace Integration
**Researched:** 2026-03-21

## Recommended Stack

### Core APIs
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Google Calendar API | v3 | Availability checking, event creation, push notifications | Only option; well-documented, granular scopes |
| Google Tasks API | v1 | Action item sync | Only option for Tasks; simple but limited (no webhooks) |
| Auth.js v5 (existing) | v5 | OAuth + token management | Already in use; supports Google provider with token storage |

### Client Libraries
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `googleapis` | latest | Official Google API Node.js client | Official SDK, handles auth headers, retries, pagination. Use over raw HTTP. |

### Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL (existing) | 16 | Token storage, sync state | Already in use; add google_integration table + FK columns |
| Vercel Cron Jobs | - | Tasks polling, watch channel renewal | Already on Vercel; cron functions handle periodic work |
| AES-256-GCM (existing) | - | Token encryption at rest | Already used for private notes; reuse for OAuth tokens |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Google API client | `googleapis` npm | Raw REST calls with fetch | googleapis handles auth headers, retries, pagination automatically |
| Calendar abstraction | Direct Google Calendar API | Nylas, Cronofy | Third-party abstractions add cost ($), latency, and a dependency for a single provider |
| Tasks sync | Direct Google Tasks API | Todoist/Asana API | Google Tasks is the founder's explicit request; workspace-native |
| Token storage | Encrypted in DB (accounts table) | Redis / external secret store | DB is simpler; tokens are per-user, not high-throughput |
| Polling scheduler | Vercel Cron | Bull/BullMQ job queue | Overkill for polling; Vercel cron is simpler, no Redis needed |
| Workspace Add-on | Standalone OAuth app | Google Workspace Add-on | Add-on requires Marketplace listing, separate review, limited UI, and does not provide more API access |

## Installation

```bash
# Only one new dependency
bun add googleapis

# Everything else already exists: Auth.js v5, Drizzle, date-fns, crypto (Node built-in)
```

## OAuth Scopes Inventory

### Login (already configured, no changes needed)
| Scope | Classification | Purpose |
|-------|---------------|---------|
| `openid` | Non-sensitive | OpenID Connect |
| `profile` | Non-sensitive | User name, picture |
| `email` | Non-sensitive | User email |

### Calendar Integration (new, requested incrementally)
| Scope | Classification | Purpose | When Requested |
|-------|---------------|---------|----------------|
| `https://www.googleapis.com/auth/calendar.events.freebusy` | Sensitive | Check availability without seeing event details | User clicks "Check Availability" |
| `https://www.googleapis.com/auth/calendar.events.owned` | Sensitive | Create/edit events the app creates | User clicks "Add to Calendar" |

### Tasks Integration (new, requested incrementally)
| Scope | Classification | Purpose | When Requested |
|-------|---------------|---------|----------------|
| `https://www.googleapis.com/auth/tasks` | Sensitive | Full CRUD on user's tasks | User enables "Sync to Google Tasks" |

### Incremental Consent Strategy

1. **Login**: `openid profile email` only (no verification needed for these)
2. **First calendar feature use**: Request `calendar.events.freebusy`
3. **When user wants to create events**: Add `calendar.events.owned`
4. **When user enables Tasks sync**: Request `tasks`

IMPORTANT: Always pass `prompt: "consent"` + `access_type: "offline"` on every incremental scope request to ensure Google issues a refresh token.

## Auth.js v5 Configuration Changes

```typescript
// Updated Google provider config
Google({
  authorization: {
    params: {
      access_type: "offline",     // Get refresh token
      prompt: "consent",          // Force consent to ensure refresh token
      hd: "*",                    // Show any Workspace domain (enforce server-side)
    },
  },
})
```

Key addition to `signIn` callback:
```typescript
async signIn({ user, account, profile }) {
  if (account?.provider === "google") {
    const googleProfile = profile as { hd?: string };
    // Block personal Gmail accounts (no hd claim)
    if (!googleProfile.hd) {
      return "/login?error=workspace-only";
    }
  }
  // ... existing logic
}
```

## Token Storage

Auth.js DrizzleAdapter already stores `access_token`, `refresh_token`, `expires_at` in the `account` table. We need to:
1. Ensure these columns are populated (they may be NULL for existing credential-based accounts)
2. Add encryption at rest (new utility, reusing private notes encryption pattern)
3. Add a `google_integration` table for sync state (see ARCHITECTURE.md)

## Sources

- [Auth.js Google Provider](https://authjs.dev/getting-started/providers/google) - HIGH confidence
- [Auth.js Refresh Token Rotation](https://authjs.dev/guides/refresh-token-rotation) - HIGH confidence
- [Google OAuth Scopes](https://developers.google.com/identity/protocols/oauth2/scopes) - HIGH confidence
- [Google Tasks Auth Scopes](https://developers.google.com/workspace/tasks/auth) - HIGH confidence
- [Google Calendar FreeBusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) - HIGH confidence
- [Google Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) - HIGH confidence
