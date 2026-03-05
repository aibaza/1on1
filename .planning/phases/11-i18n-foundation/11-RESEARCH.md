# Phase 11: i18n Foundation - Research

**Researched:** 2026-03-05
**Domain:** Internationalization (i18n) with next-intl for Next.js 16 App Router
**Confidence:** HIGH

## Summary

Phase 11 establishes the i18n foundation using **next-intl v4** (latest 4.8.x) with Next.js 16's App Router. The project uses a **non-routing** setup (no URL locale prefixes) because locale is driven by user/company DB preferences and browser detection, not URL paths. This is explicitly documented as an official next-intl pattern ("App Router setup without i18n routing").

The architecture has two independent language layers: **UI language** (per-user, stored on `users` table) and **content language** (per-company, stored on `tenants` table). Both propagate through the JWT to avoid per-request DB lookups. For unauthenticated users, locale resolves from `Accept-Language` header via the proxy. The login page serves as proof-of-concept with full EN/RO translations.

**Primary recommendation:** Use next-intl v4 in non-routing mode with cookie-based locale resolution in `i18n/request.ts`, extend the existing proxy.ts for Accept-Language detection, and extend JWT callbacks to carry both `uiLanguage` and `contentLanguage`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dedicated `language` varchar column on users table for UI language preference (not inside JSONB)
- Dedicated `contentLanguage` varchar column on tenants table for company content language (not inside settings JSONB)
- Both EN and RO language codes available from day one (no second migration needed)
- Both languages propagate through JWT (uiLanguage + contentLanguage) -- no extra DB calls for either
- Namespace structure by domain: common, auth, dashboard, sessions, templates, analytics, settings, emails
- Each namespace = one JSON file per locale (e.g., `messages/en/auth.json`, `messages/ro/auth.json`)
- Files live at top-level `messages/` directory (next-intl convention)
- Keys use nested objects (e.g., `{ "login": { "title": "Sign In" } }`) -- next-intl default
- Strict TypeScript type checking via next-intl AppConfig + global.d.ts
- Login page fully translated end-to-end (both Server and Client Components)
- Actual Romanian translations included (~15-20 keys) -- not empty/fallback keys
- Basic language switcher in user menu -- proves full flow: switch -> DB save -> JWT update -> UI re-render
- Date/number formatting helpers configured (next-intl useFormatter/format.dateTime)

### Claude's Discretion
- Middleware implementation details (cookie name, detection algorithm)
- next-intl plugin configuration specifics
- TypeScript global.d.ts type wiring approach
- JWT callback modification specifics
- Migration file naming and structure

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | App uses next-intl for all UI string translations with Server and Client Component support | next-intl v4 provides `getTranslations()` for Server Components and `useTranslations()` for Client Components. `NextIntlClientProvider` in root layout enables client-side access. |
| INFRA-02 | Locale resolves from user DB preference (authenticated) or browser Accept-Language (unauthenticated) via middleware cookie | Non-routing setup: `i18n/request.ts` reads locale from cookie. Proxy.ts sets cookie from JWT (authenticated) or Accept-Language (unauthenticated). |
| INFRA-03 | User language preference persists in DB and propagates through JWT without extra DB calls | Extend existing JWT callback to include `uiLanguage` + `contentLanguage` from user/tenant records at sign-in time. |
| INFRA-04 | Translation files use namespace-based JSON structure with TypeScript type safety | Namespace files in `messages/{locale}/{namespace}.json`, merged in `i18n/request.ts`. AppConfig augmentation in `global.d.ts` for compile-time key validation. |
| INFRA-05 | UI language (per-user) and content language (per-company) are independent, never conflated | Separate DB columns (`users.language`, `tenants.content_language`), separate JWT claims, separate access patterns in code. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | ^4.8 | i18n translations, formatting, type safety | De facto standard for Next.js App Router i18n. ~2KB bundle, native Server Component support, AppConfig type safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | 0.38.x (existing) | Schema migration for language columns | Adding `language` and `content_language` columns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-intl | react-intl | react-intl lacks Server Component support, requires more boilerplate |
| next-intl | next-i18next | Deprecated for App Router; next-intl is the successor |
| next-intl-split | Manual merge | next-intl-split auto-discovers files but adds dependency; manual merge with deepmerge is simpler for 8 namespaces |

**Installation:**
```bash
bun add next-intl
```

## Architecture Patterns

### Recommended Project Structure
```
messages/
├── en/
│   ├── common.json          # Shared strings (nav, buttons, errors)
│   ├── auth.json            # Login, register, forgot-password
│   ├── dashboard.json       # Dashboard components
│   ├── sessions.json        # Session wizard, history
│   ├── templates.json       # Template builder
│   ├── analytics.json       # Analytics pages
│   ├── settings.json        # Settings pages
│   └── emails.json          # Email templates
├── ro/
│   ├── common.json
│   ├── auth.json
│   └── ... (same structure)
src/
├── i18n/
│   └── request.ts           # getRequestConfig -- locale from cookie, load messages
├── global.d.ts              # AppConfig type augmentation
├── app/
│   └── layout.tsx           # NextIntlClientProvider wrapping
proxy.ts                     # Extended with locale detection cookie
```

### Pattern 1: Non-Routing i18n Setup (No URL Prefixes)
**What:** next-intl configured without `[locale]` route segments or locale prefixes in URLs. Locale determined by cookie set in proxy.
**When to use:** When locale is driven by user preferences (DB/JWT), not URL structure.
**Example:**
```typescript
// src/i18n/request.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

const SUPPORTED_LOCALES = ['en', 'ro'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && isValidLocale(cookieLocale) ? cookieLocale : 'en';

  // Merge namespace files into single messages object
  const messages = {
    ...(await import(`../../messages/${locale}/common.json`)).default,
    ...(await import(`../../messages/${locale}/auth.json`)).default,
    // ... additional namespaces
  };

  return {
    locale,
    messages,
    timeZone: 'Europe/Bucharest',
    formats: {
      dateTime: {
        short: { day: 'numeric', month: 'short', year: 'numeric' },
        long: { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric' },
      },
      number: {
        decimal: { maximumFractionDigits: 2 },
      },
    },
  };
});
```

### Pattern 2: Proxy-Based Locale Detection
**What:** Extend existing proxy.ts to detect locale and set cookie for next-intl.
**When to use:** For unauthenticated users (Accept-Language) and authenticated users (JWT claim).
**Example:**
```typescript
// proxy.ts -- extended with locale detection
import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const SUPPORTED_LOCALES = ['en', 'ro'];
const DEFAULT_LOCALE = 'en';

function detectLocale(req: Request, authLocale?: string): string {
  // 1. Authenticated user: use JWT-stored preference
  if (authLocale && SUPPORTED_LOCALES.includes(authLocale)) {
    return authLocale;
  }
  // 2. Existing cookie
  const cookieLocale = req.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('NEXT_LOCALE='))
    ?.split('=')[1]?.trim();
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }
  // 3. Accept-Language header
  const acceptLang = req.headers.get('accept-language');
  if (acceptLang) {
    const preferred = acceptLang.split(',')
      .map(lang => lang.split(';')[0].trim().substring(0, 2).toLowerCase())
      .find(lang => SUPPORTED_LOCALES.includes(lang));
    if (preferred) return preferred;
  }
  return DEFAULT_LOCALE;
}

export const proxy = auth((req) => {
  const isAuth = !!req.auth;
  const uiLanguage = (req.auth as any)?.user?.uiLanguage;
  const locale = detectLocale(req, uiLanguage);

  // Set locale cookie on response
  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  // ... existing auth redirect logic ...
  return response;
});
```

### Pattern 3: JWT Extension for Language Preferences
**What:** Extend Auth.js JWT callback to carry uiLanguage and contentLanguage.
**When to use:** At sign-in time, so every request has locale info without DB calls.
**Example:**
```typescript
// In auth config callbacks
async jwt({ token, user }) {
  if (user) {
    token.tenantId = user.tenantId;
    token.role = user.role;
    token.userId = user.id!;
    token.emailVerified = user.emailVerified ?? null;
    token.uiLanguage = user.uiLanguage ?? 'en';
    token.contentLanguage = user.contentLanguage ?? 'en';
  }
  return token;
},
session({ session, token }) {
  session.user.id = token.userId;
  session.user.tenantId = token.tenantId;
  session.user.role = token.role;
  session.user.emailVerified = token.emailVerified;
  session.user.uiLanguage = token.uiLanguage;
  session.user.contentLanguage = token.contentLanguage;
  return session;
},
```

### Pattern 4: TypeScript AppConfig Type Safety
**What:** Augment next-intl's AppConfig interface for compile-time translation key validation.
**When to use:** Always -- catches typos in translation keys at build time.
**Example:**
```typescript
// src/global.d.ts
// Source: https://next-intl.dev/docs/workflows/typescript
import type en_common from '../messages/en/common.json';
import type en_auth from '../messages/en/auth.json';

type Messages = typeof en_common & typeof en_auth;
// Add other namespaces as they're created

declare module 'next-intl' {
  interface AppConfig {
    Locale: 'en' | 'ro';
    Messages: Messages;
  }
}
```

### Pattern 5: Server Component Translation
**What:** Use `getTranslations` (async) in Server Components.
**Example:**
```typescript
// Server Component
import { getTranslations } from 'next-intl/server';

export default async function LoginHeader() {
  const t = await getTranslations('auth');
  return <h1>{t('login.title')}</h1>;
}
```

### Pattern 6: Client Component Translation
**What:** Use `useTranslations` hook in Client Components.
**Example:**
```typescript
// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth');
  return <button>{t('login.submit')}</button>;
}
```

### Anti-Patterns to Avoid
- **Mixing UI and content language:** Never use `contentLanguage` for UI rendering or `uiLanguage` for company data display
- **Hardcoding locale in components:** Always use `t()` calls, never inline English strings
- **Loading all namespaces everywhere:** Phase 11 loads all, but future phases should lazy-load per route
- **Putting translations in `src/`:** Messages directory should be at project root per next-intl convention
- **Using `localePrefix: 'never'` with routing setup:** For non-routing, skip the routing/middleware setup entirely and use the simpler `i18n/request.ts`-only approach

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Translation key lookup | Custom key-path resolver | `next-intl` `t()` function | Handles interpolation, plurals, rich text, nested keys |
| Locale detection | Custom Accept-Language parser | Parse in proxy, use next-intl cookie convention | Accept-Language parsing has quality values, wildcards, edge cases |
| Date/number formatting | Custom `Intl.DateTimeFormat` wrappers | `next-intl` `useFormatter()` / `format.dateTime()` | Handles locale-specific formats, relative time, consistent API |
| Plural forms | Custom if/else plural logic | ICU MessageFormat via next-intl | Romanian has 3 plural forms (one/few/other), ICU handles this correctly |
| Type-safe keys | Manual key tracking | AppConfig + `createMessagesDeclaration` | Compiler catches missing/wrong keys automatically |

**Key insight:** next-intl v4 handles the full i18n pipeline (detection, loading, rendering, formatting, type safety) -- using it correctly means writing almost no custom i18n code.

## Common Pitfalls

### Pitfall 1: Proxy Response Handling in Next.js 16
**What goes wrong:** Returning `NextResponse.next()` from proxy when auth middleware also needs to return responses creates conflicts.
**Why it happens:** The existing proxy.ts uses `auth()` wrapper which returns its own responses for redirects.
**How to avoid:** When extending proxy.ts, ensure locale cookie is set on ALL response paths (redirect responses AND pass-through responses). Use `NextResponse.next()` only when no redirect is needed, and set cookie on redirect responses too.
**Warning signs:** Locale cookie not being set on certain pages; inconsistent locale after login redirect.

### Pitfall 2: NextIntlClientProvider Placement
**What goes wrong:** Placing `NextIntlClientProvider` inside a route group layout instead of root layout means Client Components outside that group can't access translations.
**Why it happens:** next-intl v4 auto-inherits messages from server config, but the provider must wrap all Client Components that need translations.
**How to avoid:** Place `NextIntlClientProvider` in `app/layout.tsx` (root layout). It automatically inherits locale, messages, timeZone, and formats from the server `i18n/request.ts` config.
**Warning signs:** "useTranslations is not wrapped in NextIntlClientProvider" errors.

### Pitfall 3: Namespace Merging with Spread Operator
**What goes wrong:** If two namespace files have overlapping top-level keys, later spreads overwrite earlier ones silently.
**Why it happens:** Simple `{...a, ...b}` merging is shallow.
**How to avoid:** Use distinct top-level keys matching namespace names. E.g., `common.json` has `{ "common": { ... } }` and `auth.json` has `{ "auth": { ... } }`. Each namespace file wraps its content under its own namespace key. Then `t('auth.login.title')` is unambiguous.
**Warning signs:** Translation keys returning wrong values; keys from one namespace appearing under another.

### Pitfall 4: JWT Not Updating After Language Switch
**What goes wrong:** User changes language in settings, but JWT still has old language until next sign-in.
**Why it happens:** JWT is only populated at sign-in time by default.
**How to avoid:** After saving language preference to DB via API route, trigger a session update. Auth.js v5 supports `update()` on the client session to refresh the JWT. Alternatively, use a `trigger: "update"` in the JWT callback.
**Warning signs:** Language doesn't change until user logs out and back in.

### Pitfall 5: Missing `html lang` Attribute
**What goes wrong:** Root layout has `<html lang="en">` hardcoded, screen readers and SEO always see English.
**Why it happens:** Root layout is a Server Component but doesn't read the current locale.
**How to avoid:** Use `getLocale()` from `next-intl/server` in root layout to set `<html lang={locale}>`.
**Warning signs:** Browser language detection shows wrong language; accessibility audits flag wrong lang attribute.

### Pitfall 6: Romanian Plural Forms
**What goes wrong:** Romanian plurals display incorrectly (e.g., "2 sesiune" instead of "2 sesiuni").
**Why it happens:** Romanian has 3 plural categories: one, few (2-19 and numbers ending in 2-19), other. Most devs only handle singular/plural.
**How to avoid:** Use ICU MessageFormat: `{count, plural, one {# sesiune} few {# sesiuni} other {# de sesiuni}}`.
**Warning signs:** Grammatically incorrect Romanian text with numbers.

## Code Examples

### Complete next.config.ts with next-intl Plugin
```typescript
// next.config.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: "standalone",
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

### Root Layout with NextIntlClientProvider
```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "1on1",
  description: "Structured one-on-one meeting management",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Namespace JSON File Structure
```json
// messages/en/auth.json
{
  "auth": {
    "login": {
      "title": "Sign in",
      "description": "Enter your email and password to access your account",
      "email": "Email",
      "emailPlaceholder": "you@company.com",
      "password": "Password",
      "forgotPassword": "Forgot password?",
      "submit": "Sign in",
      "submitting": "Signing in...",
      "orContinueWith": "Or continue with",
      "noAccount": "Don't have an account?",
      "createOrg": "Create an organization",
      "errors": {
        "invalidCredentials": "Invalid email or password",
        "accessDenied": "No account found for this email. Please register your organization first.",
        "oauthLinked": "This email is already associated with a different sign-in method.",
        "generic": "An error occurred. Please try again."
      }
    }
  }
}
```

```json
// messages/ro/auth.json
{
  "auth": {
    "login": {
      "title": "Autentificare",
      "description": "Introduceți adresa de email și parola pentru a accesa contul",
      "email": "Email",
      "emailPlaceholder": "tu@companie.com",
      "password": "Parolă",
      "forgotPassword": "Ai uitat parola?",
      "submit": "Autentificare",
      "submitting": "Se autentifică...",
      "orContinueWith": "Sau continuă cu",
      "noAccount": "Nu ai cont?",
      "createOrg": "Creează o organizație",
      "errors": {
        "invalidCredentials": "Email sau parolă invalidă",
        "accessDenied": "Nu a fost găsit niciun cont pentru acest email. Înregistrați organizația mai întâi.",
        "oauthLinked": "Acest email este deja asociat cu o altă metodă de autentificare.",
        "generic": "A apărut o eroare. Încercați din nou."
      }
    }
  }
}
```

### Language Switcher API Route Pattern
```typescript
// src/app/api/user/language/route.ts
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const SUPPORTED_LOCALES = ['en', 'ro'];

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { language } = await req.json();
  if (!SUPPORTED_LOCALES.includes(language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  await withTenantContext(session.user.tenantId, session.user.id, async (tx) => {
    await tx.update(users).set({ language }).where(eq(users.id, session.user.id));
  });

  // Response sets cookie so next-intl picks up the change immediately
  const response = NextResponse.json({ success: true });
  response.cookies.set('NEXT_LOCALE', language, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
```

### Drizzle Migration Pattern
```typescript
// Schema change for users table
language: varchar("language", { length: 10 }).notNull().default('en'),

// Schema change for tenants table
contentLanguage: varchar("content_language", { length: 10 }).notNull().default('en'),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-i18next (Pages Router) | next-intl v4 (App Router) | 2023-2025 | next-intl is the App Router standard; next-i18next is deprecated for App Router |
| Manual type augmentation | AppConfig interface | next-intl v4 (Mar 2025) | Centralized type safety for Locale, Messages, and Formats |
| Manual NextIntlClientProvider messages prop | Auto-inheritance from server | next-intl v4 (Mar 2025) | No need to pass messages/formats to provider manually |
| `localeDetection: false` for no cookies | `localeCookie: false` | next-intl v4 (Mar 2025) | GDPR-compliant cookie defaults (session-only by default) |
| middleware.ts | proxy.ts | Next.js 16 (Oct 2025) | Renamed file and export; nodejs runtime (no Edge) |
| CJS + ESM dual output | ESM-only | next-intl v4 (Mar 2025) | ~7% bundle size reduction, requires React 17+ and TS 5+ |

**Deprecated/outdated:**
- `next-i18next`: Don't use with App Router; use next-intl instead
- `localeDetection` config option: Replaced by `localeCookie` in next-intl v4
- `middleware.ts`: Renamed to `proxy.ts` in Next.js 16 (project already uses proxy.ts)

## Open Questions

1. **JWT `update()` trigger for language switch**
   - What we know: Auth.js v5 supports `session.update()` on the client to trigger a JWT refresh with a `trigger: "update"` parameter in the JWT callback
   - What's unclear: Exact implementation pattern with the existing auth config's JWT callback
   - Recommendation: Test during implementation; fallback is setting cookie + page reload

2. **Namespace loading performance**
   - What we know: Merging 8 namespace files via dynamic imports works. next-intl caches via React's `cache()` per request.
   - What's unclear: Whether loading all 8 namespaces on every page has measurable performance impact
   - Recommendation: Acceptable for Phase 11 (foundation). Phase 12+ can optimize by loading only needed namespaces per route group layout.

3. **`createMessagesDeclaration` with split files**
   - What we know: The experimental `createMessagesDeclaration` option in next.config.ts points to a single messages file for generating strict argument types
   - What's unclear: How this works with multiple namespace files that get merged at runtime
   - Recommendation: Start with basic AppConfig Messages type (key checking). Add `createMessagesDeclaration` later if argument type safety is needed.

## Sources

### Primary (HIGH confidence)
- [next-intl official docs: App Router without i18n routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) - Complete non-routing setup
- [next-intl official docs: TypeScript augmentation](https://next-intl.dev/docs/workflows/typescript) - AppConfig type safety setup
- [next-intl official docs: Request configuration](https://next-intl.dev/docs/usage/configuration) - getRequestConfig options, formats, messages
- [next-intl official docs: Routing configuration](https://next-intl.dev/docs/routing/configuration) - localeCookie, localePrefix modes
- [next-intl v4.0 blog post](https://next-intl.dev/blog/next-intl-4-0) - Breaking changes, migration, new features
- [Next.js 16 proxy.ts docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) - middleware.ts to proxy.ts rename

### Secondary (MEDIUM confidence)
- [next-intl npm](https://www.npmjs.com/package/next-intl) - Latest version 4.8.3
- [next-intl GitHub discussions](https://github.com/amannn/next-intl/discussions/357) - Split messages into multiple files pattern
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - Proxy migration details

### Tertiary (LOW confidence)
- None -- all findings verified against official sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - next-intl v4 is the documented standard for Next.js App Router i18n, verified against official docs
- Architecture: HIGH - Non-routing setup is an official next-intl pattern with dedicated documentation page
- Pitfalls: HIGH - Based on official docs (v4 breaking changes), GitHub issues, and understanding of existing codebase patterns

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (next-intl v4 is stable; Next.js 16 is stable)
