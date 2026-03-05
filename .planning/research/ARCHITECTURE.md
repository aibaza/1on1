# Architecture Patterns: i18n for 1on1

**Domain:** Internationalization (English + Romanian) for existing Next.js 15 App Router SaaS
**Researched:** 2026-03-05

## Recommended Architecture

### Two-Language-Layer Model

The system has two distinct language contexts that flow independently:

1. **UI Language** (per-user preference) -- drives all interface strings: buttons, labels, navigation, form placeholders, error messages, validation messages
2. **Content Language** (per-company setting, already exists as `tenant.settings.preferredLanguage`) -- drives AI-generated content (summaries, nudges, action suggestions) and email templates

These are independent because a Romanian-speaking admin of a multinational company might set their personal UI to Romanian while the company's AI output and emails go in English.

```
                    +-------------------+
                    |   Root Layout     |
                    |  (reads locale    |
                    |   from cookie     |
                    |   or session)     |
                    +--------+----------+
                             |
                    +--------v----------+
                    | NextIntlClient    |
                    | Provider          |
                    | (locale + msgs)   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+       +-----------v---------+
    | Server Components |       | Client Components   |
    | getTranslations() |       | useTranslations()   |
    | (async, no hook)  |       | (hook, via context) |
    +-------------------+       +---------------------+

    Content Language flows separately:
    +-----------------+     +------------------+     +------------------+
    | AI Pipeline     |     | Email Service    |     | Inngest Jobs     |
    | reads tenant    |     | reads tenant     |     | reads tenant     |
    | .preferredLang  |     | .preferredLang   |     | .preferredLang   |
    +-----------------+     +------------------+     +------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/i18n/request.ts` | Resolve current UI locale per-request (cookie -> 'en' fallback) | Root layout, all Server Components |
| `NextIntlClientProvider` (in root layout) | Pass locale + messages to Client Components via React context | All Client Components |
| `messages/{locale}.json` | Static UI translation strings organized by namespace | next-intl loader in i18n/request.ts |
| `users.language` (new DB column) | Persist user's UI language preference | Auth session (JWT), middleware |
| `tenant.settings.preferredLanguage` (existing) | Company content language for AI + emails | AI pipeline, email service, Inngest jobs |
| `NEXT_LOCALE` cookie | Bridge between authenticated user preference and SSR locale resolution | Middleware, i18n/request.ts |
| Middleware (`middleware.ts`) | Set locale cookie from JWT on auth requests; detect browser locale pre-auth | i18n/request.ts |

### Data Flow: UI Language

```
1. User logs in
2. Auth.js jwt callback reads user.language from DB, stores in JWT token
3. Middleware runs on every request:
   - If authenticated: reads locale from JWT, sets NEXT_LOCALE cookie
   - If unauthenticated: reads Accept-Language header, sets cookie
4. i18n/request.ts reads cookie to determine locale
5. Root layout gets locale + messages, wraps children in NextIntlClientProvider
6. Server Components: await getTranslations('namespace')
7. Client Components: useTranslations('namespace')
```

### Data Flow: Content Language (already built)

```
1. Admin sets preferredLanguage in Company Settings (already exists in UI)
2. pipeline.ts line 59 reads tenant.settings.preferredLanguage
3. service.ts withLanguageInstruction() appends language to AI system prompts
4. Email templates: NEW -- read tenant language, select translated template strings
```

## Library Choice: next-intl (without i18n routing)

**Use next-intl because:**
- Purpose-built for Next.js App Router with Server Components + Client Components
- Supports "without i18n routing" mode -- locale from cookie/DB, no URL prefixes
- ~2KB client bundle
- Identical API surface for Server (`getTranslations`) and Client (`useTranslations`)
- Built-in ICU message format for plurals, dates, numbers
- Active maintenance, wide adoption in Next.js ecosystem

**Without i18n routing mode** is the correct choice because:
- The requirement explicitly states "No locale in URLs -- purely setting-driven"
- Locale is determined by user preference (DB) or browser detection, not URL path
- No `[locale]` segment needed in the app directory structure -- zero restructuring of existing 290 source files
- No middleware URL rewriting needed

**Confidence: HIGH** (verified via official next-intl documentation at next-intl.dev)

## Integration Points with Existing Code

### 1. Root Layout (`src/app/layout.tsx`)

**Current state:** Static `<html lang="en">`. Wraps children in `ThemeProvider`.

**Required changes:**
- Import `NextIntlClientProvider` and `getLocale`, `getMessages` from next-intl
- Set `<html lang={locale}>` dynamically
- Wrap children: `<NextIntlClientProvider messages={messages}>`

```typescript
// src/app/layout.tsx (after)
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export default async function RootLayout({ children }: Props) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. i18n Request Config (`src/i18n/request.ts`) -- NEW FILE

Core locale resolution logic. next-intl calls this once per request.

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const SUPPORTED_LOCALES = ['en', 'ro'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const locale = SUPPORTED_LOCALES.includes(cookieLocale as SupportedLocale)
    ? (cookieLocale as SupportedLocale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### 3. Next.js Config (`next.config.ts`)

Add the next-intl plugin wrapper:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

### 4. Middleware (`middleware.ts`) -- NEW FILE

The app currently has NO middleware file. Auth protection happens in the dashboard layout via `auth()`. The new middleware handles locale cookie setting, wrapping Auth.js's `auth()` handler.

```typescript
// middleware.ts
import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const SUPPORTED_LOCALES = ['en', 'ro'];
const DEFAULT_LOCALE = 'en';

export default auth((req) => {
  const response = NextResponse.next();
  const existingLocale = req.cookies.get(LOCALE_COOKIE)?.value;

  // If user is authenticated, use their stored language preference from JWT
  if (req.auth?.user) {
    const userLocale = (req.auth.user as any).language;
    if (userLocale && SUPPORTED_LOCALES.includes(userLocale) && userLocale !== existingLocale) {
      response.cookies.set(LOCALE_COOKIE, userLocale, {
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
      });
    }
    return response;
  }

  // If no cookie set (unauthenticated), detect from Accept-Language header
  if (!existingLocale) {
    const acceptLang = req.headers.get('accept-language') || '';
    const detected = acceptLang
      .split(',')
      .map(part => part.split(';')[0].trim().split('-')[0])
      .find(lang => SUPPORTED_LOCALES.includes(lang));

    response.cookies.set(LOCALE_COOKIE, detected || DEFAULT_LOCALE, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });
  }

  return response;
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

**Key decision:** Middleware uses Auth.js v5's `auth()` wrapper, which gives access to the JWT-decoded session without a DB call. The `language` field added to the JWT makes this zero-cost.

### 5. Database Schema Change

**Users table** -- add `language` column:

```typescript
// src/lib/db/schema/users.ts -- add column
language: varchar("language", { length: 10 }).notNull().default("en"),
```

Migration: `ALTER TABLE "user" ADD COLUMN "language" VARCHAR(10) NOT NULL DEFAULT 'en';`

This is a non-breaking additive change. All existing users default to English.

### 6. Auth Session (JWT) Changes

**`src/lib/auth/config.ts`** -- add `language` to JWT token:

```typescript
// In jwt callback:
async jwt({ token, user, trigger }) {
  if (user) {
    token.language = user.language;
    // ... existing fields (tenantId, role, userId, emailVerified)
  }

  // Handle session update (when user changes language in settings)
  if (trigger === 'update') {
    const dbUser = await adminDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, token.userId),
      columns: { language: true },
    });
    if (dbUser) token.language = dbUser.language;
  }

  return token;
},

// In session callback:
session({ session, token }) {
  session.user.language = token.language;
  // ... existing fields
  return session;
},
```

**TypeScript types** -- extend Auth.js types:

```typescript
// src/types/next-auth.d.ts
declare module "next-auth" {
  interface User {
    language?: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    language?: string;
  }
}
```

### 7. Translation File Organization

```
messages/
  en.json          # English (default, complete)
  ro.json          # Romanian
```

**Namespace structure inside each JSON:**

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading...",
    "error": "Something went wrong",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "search": "Search...",
    "noResults": "No results found"
  },
  "nav": {
    "overview": "Overview",
    "people": "People",
    "teams": "Teams",
    "sessions": "Sessions",
    "templates": "Templates",
    "analytics": "Analytics",
    "settings": "Settings",
    "actionItems": "Action Items"
  },
  "auth": {
    "login": { "title": "Sign in", "email": "Email", "password": "Password", ... },
    "register": { ... },
    "invite": { ... },
    "forgotPassword": { ... }
  },
  "dashboard": { ... },
  "session": {
    "wizard": { ... },
    "summary": { ... },
    "status": { "scheduled": "Scheduled", "inProgress": "In Progress", ... }
  },
  "people": { ... },
  "templates": { ... },
  "settings": {
    "company": { ... },
    "account": { ... }
  },
  "analytics": { ... },
  "series": { ... },
  "validation": {
    "required": "This field is required",
    "emailInvalid": "Invalid email address",
    "tooShort": "Must be at least {min} characters",
    "tooLong": "Must be at most {max} characters"
  }
}
```

**Rationale for single file per locale (not per-component):**
- next-intl loads one messages object per request
- At ~800-1200 keys, each JSON is ~15-25KB -- well within the "pass all messages to client" threshold
- Simpler to search, audit, and maintain than per-component splitting
- Namespaces provide logical grouping without file fragmentation

### 8. AI Pipeline Integration (NO changes needed)

The AI pipeline already handles content language correctly:
- `pipeline.ts` line 59: reads `tenant.settings.preferredLanguage`
- `service.ts` lines 42-48: `withLanguageInstruction()` appends language instruction to system prompts
- `prompts/base.ts`: instructs "Write in the same language as the session data"

The AI pipeline uses **content language** (company setting), not **UI language** (user setting). These are intentionally decoupled. No changes required.

### 9. Email Template Translation

Email templates currently have hardcoded English strings (e.g., "Upcoming 1:1 Meeting", "Hi {recipientName}", "You have been invited", "Key Takeaways", "Action Items").

**Recommended approach: Standalone translation function (not next-intl)**

Email templates render server-side via `@react-email/render` and are called from Inngest jobs and notification services -- outside the Next.js request lifecycle. They cannot use `useTranslations()` or `getTranslations()`.

```typescript
// src/lib/email/i18n.ts
import en from '../../../messages/en.json';
import ro from '../../../messages/ro.json';

const emailMessages: Record<string, Record<string, unknown>> = { en, ro };

export function getEmailTranslation(locale: string, key: string): string {
  const messages = emailMessages[locale] || emailMessages.en;
  const value = key.split('.').reduce((obj: any, k) => obj?.[k], messages);
  return typeof value === 'string' ? value : key;
}

export function createEmailTranslator(locale: string) {
  return (key: string) => getEmailTranslation(locale, key);
}
```

**Email templates receive translated labels as props:**

```typescript
// In notification service (e.g., summary-email.ts):
const tenantLang = (tenantSettings.preferredLanguage as string) || 'en';
const t = createEmailTranslator(tenantLang);

SessionSummaryEmail({
  ...existingProps,
  labels: {
    title: t('email.summary.title'),
    greeting: t('email.summary.greeting'),
    keyTakeaways: t('email.summary.keyTakeaways'),
    actionItems: t('email.summary.actionItems'),
    viewSession: t('email.summary.viewSession'),
  },
});
```

This uses the **company's content language** (not the individual user's UI language), because emails are company communications.

### 10. Zod Validation Messages

Current Zod schemas in `src/lib/validations/` produce English error messages. Two options:

**Recommended approach: Translate at the form display layer**

Keep Zod schemas language-agnostic. In form components, map Zod error codes to translated strings:

```typescript
// In a form component:
const t = useTranslations('validation');

// After Zod validation fails:
const translatedErrors = zodErrors.map(err => ({
  ...err,
  message: t(err.code, { ...err.params }), // e.g., t('too_small', { minimum: 3 })
}));
```

This avoids coupling Zod schemas to the i18n system and keeps validation schemas reusable server-side where there is no i18n context.

### 11. Date and Number Formatting

next-intl includes `useFormatter()` / `getFormatter()` with ICU-based date/number formatting. Replace the manual formatting in `src/lib/utils/formatting.ts`:

```typescript
// Server Component
const format = await getFormatter();
format.dateTime(date, { dateStyle: 'long' });
format.number(score, { maximumFractionDigits: 1 });

// Client Component
const format = useFormatter();
format.relativeTime(date); // "2 hours ago"
```

## Patterns to Follow

### Pattern 1: Server Component Translation

**What:** Use `getTranslations()` in async Server Components for zero client-side cost.
**When:** Any Server Component that renders text (page headers, metadata, static labels).

```typescript
// src/app/(dashboard)/overview/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function OverviewPage() {
  const t = await getTranslations('dashboard');
  return <h1>{t('title')}</h1>;
}
```

### Pattern 2: Client Component Translation

**What:** Use `useTranslations()` hook in Client Components.
**When:** Interactive components with text (forms, dialogs, wizards -- all 106 "use client" files).

```typescript
// src/components/session/wizard-shell.tsx
'use client';
import { useTranslations } from 'next-intl';

export function WizardShell() {
  const t = useTranslations('session.wizard');
  return <Button>{t('next')}</Button>;
}
```

### Pattern 3: Language Switcher Flow

**What:** User changes their UI language in account settings.
**When:** Account settings page (needs to be created).

```
1. User selects new language in account settings dropdown
2. Client calls PATCH /api/settings/account with { language: 'ro' }
3. API updates users.language in DB
4. Client calls update() from next-auth's useSession() to refresh JWT
5. Middleware on next request detects new language in JWT, updates NEXT_LOCALE cookie
6. i18n/request.ts picks up new cookie value
7. Page reloads with new locale (full page reload for clean state)
```

### Pattern 4: ICU Message Format for Dynamic Content

**What:** Use ICU message syntax for plurals, interpolation, and select.
**When:** Messages that contain variables or plural forms.

```json
{
  "sessions": {
    "count": "You have {count, plural, =0 {no upcoming sessions} one {# upcoming session} other {# upcoming sessions}}",
    "completedBy": "Completed by {name} on {date, date, medium}"
  }
}
```

```typescript
const t = useTranslations('sessions');
t('count', { count: 3 }); // "You have 3 upcoming sessions"
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Locale in URL Segments

**What:** Using `[locale]` in the app directory structure with URL-based routing.
**Why bad:** Would require restructuring all 290 source files into a `[locale]/` segment, breaking all existing routes and bookmarks. The requirement explicitly says "no locale in URLs."
**Instead:** Use next-intl's "without i18n routing" mode with cookie-based locale resolution.

### Anti-Pattern 2: Dynamic Translation Keys

**What:** `t(\`status.${status}\`)` where `status` comes from runtime data.
**Why bad:** Translation tooling cannot statically extract these keys. Missing translations silently render raw keys. TypeScript cannot type-check key existence.
**Instead:** Use explicit mappings: `const labels: Record<Status, string> = { active: t('status.active'), paused: t('status.paused') };`

### Anti-Pattern 3: Translating User-Generated Content

**What:** Trying to translate session answers, talking points, action item titles, or private notes.
**Why bad:** These are user-generated content in whatever language the user typed. The AI pipeline already handles mixed-language content via its "Write in the same language as the session data" instruction.
**Instead:** Only translate UI chrome (labels, buttons, headings, placeholders). User content stays as-is.

### Anti-Pattern 4: Using next-intl Inside Email Templates

**What:** Trying to use `getTranslations()` or `useTranslations()` in React Email components.
**Why bad:** Email templates render outside the Next.js request lifecycle (called from Inngest jobs, notification services). next-intl requires the Next.js request context.
**Instead:** Use the standalone `createEmailTranslator()` function that directly imports message files.

### Anti-Pattern 5: Separate Translation Files per Component

**What:** Co-locating `wizard-shell.en.json` next to each component.
**Why bad:** next-intl loads one messages object per locale per request. Splitting requires custom merging logic and loses the ability to search all translations in one place.
**Instead:** Single `messages/{locale}.json` per language with flat namespace keys.

## Build/Bundle Considerations

### Client-Side Impact

- **next-intl runtime:** ~2KB gzipped -- negligible
- **Translation messages:** ~15-25KB per locale JSON. Only the active locale loads. Passed to `NextIntlClientProvider` in full -- acceptable for this scale (under 50KB). Subsetting adds complexity without meaningful benefit.
- **No new client-side dependencies** beyond next-intl itself

### Dynamic Rendering

next-intl APIs cause routes to opt into dynamic rendering (because they read cookies via `cookies()`). This is a non-issue because every dashboard page already reads the auth session dynamically. Auth pages (login, register) will become dynamic, but they are lightweight and benefit from dynamic rendering anyway (Accept-Language header detection).

### Build Time

No impact. Messages are loaded at runtime from JSON files, not compiled into the build.

## Scalability Considerations

| Concern | At 2 languages (now) | At 5 languages | At 15+ languages |
|---------|---------------------|----------------|-------------------|
| Message file size | ~20KB/locale, trivial | ~20KB/locale, trivial | Consider namespace splitting per page |
| Bundle impact | Negligible | Negligible | May want per-page message subsets |
| Translation management | Manual JSON editing | Consider Crowdin/Phrase TMS | Mandatory TMS integration |
| Missing translations | Manual review | Add CI lint for missing keys | Automated completeness CI checks |
| RTL support | N/A (en, ro both LTR) | May need RTL (Arabic) | Requires `dir` attribute + layout changes |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/i18n/request.ts` | next-intl request config (locale resolution from cookie) |
| `messages/en.json` | English translation strings (~800-1200 keys) |
| `messages/ro.json` | Romanian translation strings |
| `src/lib/email/i18n.ts` | Email-specific translation loader (works outside Next.js request) |
| `middleware.ts` | Locale cookie management + browser language detection |
| Account settings page (`src/app/(dashboard)/settings/account/`) | User language preference UI |
| `PATCH /api/settings/account` route | API for updating user language |

## Existing Files to Modify

| File | Change | Scope |
|------|--------|-------|
| `next.config.ts` | Add `createNextIntlPlugin` wrapper | 3 lines |
| `src/app/layout.tsx` | Add `NextIntlClientProvider`, dynamic `lang` attr | ~10 lines |
| `src/lib/db/schema/users.ts` | Add `language` column | 1 line |
| `src/lib/auth/config.ts` | Add `language` to JWT/session callbacks | ~10 lines |
| `src/types/next-auth.d.ts` | Extend User/JWT types with `language` | ~6 lines |
| 106 Client Components | Replace hardcoded strings with `useTranslations()` | Bulk work |
| ~30 Server Component pages | Replace hardcoded strings with `getTranslations()` | Moderate work |
| 7 email templates | Accept `labels` prop with translated strings | ~5-10 lines each |
| `src/lib/notifications/summary-email.ts` | Read tenant language, create translator, pass labels | ~15 lines |
| Other notification senders | Same pattern as summary-email | ~10 lines each |
| `src/lib/utils/formatting.ts` | Optional: replace with next-intl formatters | Low priority |
| `package.json` | Add `next-intl` dependency | 1 line |

## Suggested Build Order (Dependency-Aware)

**Phase 1: Foundation** (no UI changes, unblocks everything)
- Install next-intl, update `next.config.ts`
- Create `src/i18n/request.ts`
- Create `messages/en.json` with initial namespaces (common, nav)
- Create `messages/ro.json` (copy of en.json initially)
- DB migration: add `users.language` column
- Update Auth.js JWT/session callbacks to include `language`
- Create `middleware.ts` for locale cookie

**Phase 2: Root Layout Integration** (unblocks all component work)
- Update `src/app/layout.tsx` with NextIntlClientProvider
- Verify end-to-end: Server + Client translation loading works

**Phase 3: String Extraction -- Shared Components** (highest reuse, validates pattern)
- Navigation: top-nav, sidebar, user-menu
- Common namespace: buttons, labels, status badges
- Auth pages: login, register, invite, forgot-password

**Phase 4: String Extraction -- Feature Components** (bulk of work, parallelizable)
- Dashboard components
- Session wizard components (largest group: ~20 components)
- People management components
- Template editor components
- Analytics components
- Settings pages
- Series components
- Action items page
- History page

**Phase 5: Language Switcher UI**
- Account settings page (new)
- PATCH /api/settings/account route
- JWT refresh flow via useSession().update()

**Phase 6: Email Translation**
- Create `src/lib/email/i18n.ts`
- Update 7 email templates to accept labels prop
- Update notification services to pass tenant language

**Phase 7: Polish**
- Zod validation message translation
- Date/number formatting with next-intl
- Complete Romanian translations (translate all keys from Phase 3-4)
- CI lint script for missing translation keys between en.json and ro.json

## Sources

- [next-intl: App Router without i18n routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) -- HIGH confidence
- [next-intl: Server & Client Components](https://next-intl.dev/docs/environments/server-client-components) -- HIGH confidence
- [next-intl: Routing configuration](https://next-intl.dev/docs/routing/configuration) -- HIGH confidence
- [Next.js: Internationalization guide](https://nextjs.org/docs/pages/guides/internationalization) -- HIGH confidence
- Existing codebase analysis: `src/lib/ai/service.ts`, `src/lib/ai/pipeline.ts`, `src/app/layout.tsx`, `src/lib/auth/config.ts`, `src/lib/db/schema/users.ts`, `src/lib/email/templates/*.tsx` -- direct inspection

---
*Architecture research for: i18n integration in 1on1 SaaS*
*Researched: 2026-03-05*
