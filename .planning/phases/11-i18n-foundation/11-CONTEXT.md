# Phase 11: i18n Foundation - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Working i18n pipeline where locale resolves correctly for authenticated and unauthenticated users, and both Server and Client Components can render translated strings through independent UI and content language layers. One page (login) fully translated as proof-of-concept. Requirements: INFRA-01 through INFRA-05.

</domain>

<decisions>
## Implementation Decisions

### Language storage schema
- Dedicated `language` varchar column on users table for UI language preference (not inside JSONB)
- Dedicated `contentLanguage` varchar column on tenants table for company content language (not inside settings JSONB)
- Both EN and RO language codes available from day one (no second migration needed)
- Both languages propagate through JWT (uiLanguage + contentLanguage) — no extra DB calls for either

### Translation file organization
- Namespace structure by domain: common, auth, dashboard, sessions, templates, analytics, settings, emails
- Each namespace = one JSON file per locale (e.g., `messages/en/auth.json`, `messages/ro/auth.json`)
- Files live at top-level `messages/` directory (next-intl convention)
- Keys use nested objects (e.g., `{ "login": { "title": "Sign In" } }`) — next-intl default
- Strict TypeScript type checking via next-intl AppConfig + global.d.ts — `t('nonExistent.key')` is a compile error

### Proof-of-concept scope
- Login page fully translated end-to-end (both Server and Client Components)
- Actual Romanian translations included (~15-20 keys) — not empty/fallback keys
- Basic language switcher in user menu — proves full flow: switch → DB save → JWT update → UI re-render
- Date/number formatting helpers configured (next-intl useFormatter/format.dateTime) — proves formatting pipeline alongside translations

### Claude's Discretion
- Middleware implementation details (cookie name, detection algorithm)
- next-intl plugin configuration specifics
- TypeScript global.d.ts type wiring approach
- JWT callback modification specifics
- Migration file naming and structure

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User consistently chose recommended options aligned with next-intl conventions.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Auth config (`src/lib/auth/config.ts`): JWT callback already stores tenantId, role, userId — extend with uiLanguage + contentLanguage
- Users table (`src/lib/db/schema/users.ts`): Has notificationPreferences JSONB but language gets dedicated column
- Tenants table (`src/lib/db/schema/tenants.ts`): Has settings JSONB (colorTheme) but contentLanguage gets dedicated column
- User menu: Exists in dashboard layout — language switcher plugs in here

### Established Patterns
- Drizzle ORM for all schema changes and migrations
- Auth.js v5 JWT strategy with custom callbacks
- Server Components for reads, API routes for writes
- shadcn/ui + Tailwind for all UI components
- Zod for validation schemas

### Integration Points
- `src/middleware.ts`: Does not exist yet — must be created for locale detection
- `next.config.ts`: Currently minimal (standalone output only) — needs next-intl plugin
- JWT callbacks in auth config — extend to carry language preferences
- Dashboard layout — add language switcher to user menu
- Login page — first page to be fully translated as PoC

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-i18n-foundation*
*Context gathered: 2026-03-05*
