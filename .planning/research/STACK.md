# Stack Research: i18n for 1on1

**Domain:** Internationalization (i18n) for existing Next.js App Router SaaS
**Researched:** 2026-03-05
**Confidence:** HIGH

## Context

The 1on1 app needs two language layers:
1. **UI language** -- per-user preference (default: browser locale), stored in user profile. Two locales: `en` and `ro`.
2. **Content language** -- per-company admin setting, controls AI-generated content and system templates.

The app runs Next.js 16.1.6, React 19.2, TypeScript 5, Zod 4.3, and has no middleware.ts yet. No `[locale]` segment exists in the URL structure. The app uses route groups `(auth)`, `(dashboard)`, and `(session-wizard)`. Package manager is Bun.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| next-intl | ^4.8 | UI string translations, date/number formatting, Server Component i18n | Purpose-built for Next.js App Router. Native RSC support via `getTranslations()` -- zero client JS for server-rendered strings. ~2KB client bundle. 931K+ weekly npm downloads, 3.7K+ GitHub stars. Wraps native `Intl.DateTimeFormat` / `Intl.NumberFormat` -- no extra date library needed. ICU message format handles Romanian's 3 plural forms correctly. Strict TypeScript types for translation keys via `AppConfig` interface. ESM-only in v4 (matches project). [Confidence: HIGH -- verified via official docs and npm] |

### Supporting Libraries

None needed. next-intl covers translations, date formatting, number formatting, and relative time -- all built on the browser's native `Intl` API. No date-fns, no dayjs, no separate formatting library required.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript `AppConfig` interface | Type-safe translation keys | Catches missing/wrong keys at build time. Defined once in `src/types/next-intl.d.ts`. next-intl v4 moved from global types to module-scoped `AppConfig`. |
| ICU Message Syntax | Plurals, interpolation, select | Built into next-intl. Handles English (2 plural forms) and Romanian (3 plural forms: one, few, other) correctly via `Intl.PluralRules`. |

---

## Architecture Decision: No Locale in URLs

**Use next-intl's "without i18n routing" setup.** This is the most important decision.

### Why no URL-based locale routing

1. **This is a B2B SaaS app behind auth** -- not a public content site. SEO for localized pages is irrelevant.
2. **Language is a user preference**, not a content variant. Two users at the same company may use different UI languages at the same URL.
3. **The app already has route groups** `(auth)`, `(dashboard)`, `(session-wizard)` -- adding a `[locale]` segment would require restructuring every route.
4. **No middleware.ts exists yet** -- the "without i18n routing" setup needs no middleware at all.
5. **Pre-login screens** (login, register, invite) use browser locale detection via `Accept-Language` header or `navigator.language` -- no URL prefix needed.

### How it works

```
messages/
  en.json    # English (default)
  ro.json    # Romanian

src/
  i18n/
    request.ts    # Resolves locale per-request
  app/
    layout.tsx    # Wraps children with NextIntlClientProvider
```

- `src/i18n/request.ts` resolves the locale from: (1) authenticated user's DB preference, (2) cookie for unauthenticated pages, (3) `Accept-Language` header fallback.
- No `[locale]` URL segment. No middleware rewrites. No route restructuring.
- `NextIntlClientProvider` wraps the root layout to enable Client Components.
- Server Components use `const t = await getTranslations('namespace')`.
- Client Components use `const t = useTranslations('namespace')`.

### Locale resolution flow

```
Authenticated user:
  Session -> user.ui_language (from DB) -> 'en' | 'ro'

Unauthenticated visitor (login, register, invite):
  Cookie 'NEXT_LOCALE' -> Accept-Language header -> 'en' (default)
```

---

## Translation File Format

**JSON files in `/messages/` directory:**

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading..."
  },
  "dashboard": {
    "title": "Overview",
    "upcomingSessions": "Upcoming Sessions",
    "noSessions": "No upcoming sessions"
  },
  "session": {
    "wizard": {
      "nextStep": "Next",
      "previousStep": "Back",
      "complete": "Complete Session"
    }
  },
  "settings": {
    "language": "Language",
    "languageDescription": "Choose your preferred language for the interface"
  }
}
```

**Why JSON over other formats:**
- next-intl's native format (no conversion step, no build tooling)
- Easy to diff in code review
- TypeScript can infer key types from it via `AppConfig`
- Simple enough for the founder to maintain Romanian translations directly
- Two languages, one maintainer -- no translation management system needed

---

## Date/Number Formatting Strategy

**Use next-intl's built-in `useFormatter()` (client) / `getFormatter()` (server)** -- they wrap the native `Intl` APIs with locale awareness.

```typescript
// Server Component
const format = await getFormatter();

format.dateTime(session.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' });
// en: "Mar 5, 2026, 2:30 PM"
// ro: "5 mar. 2026, 14:30"

format.relativeTime(session.scheduledAt);
// en: "in 2 hours"
// ro: "peste 2 ore"

format.number(0.85, { style: 'percent' });
// en: "85%"
// ro: "85 %"
```

**No date-fns or dayjs needed for formatting.** The existing `src/lib/utils/scheduling.ts` should be refactored to use next-intl formatters for any user-facing date strings. Date arithmetic (add days, calculate diff) can stay as plain Date math or use `Temporal` -- that is not an i18n concern.

### Global format presets

Define reusable formats in `src/i18n/request.ts`:

```typescript
return {
  locale,
  messages,
  formats: {
    dateTime: {
      short: { dateStyle: 'short', timeStyle: 'short' },
      medium: { dateStyle: 'medium', timeStyle: 'short' },
      dateOnly: { dateStyle: 'long' },
    },
    number: {
      percent: { style: 'percent', maximumFractionDigits: 0 },
    }
  }
};
```

---

## Email Template Translations

React Email templates already exist in `src/lib/email/templates/`. Strategy:

1. **Load translation messages directly** in the email rendering function (emails are server-side only).
2. Use `createTranslator()` from `next-intl` to create a translator outside of React context.
3. Email language follows the **recipient's UI language preference** (not the sender's).

```typescript
import { createTranslator } from 'next-intl';

async function sendInviteEmail(recipientLocale: 'en' | 'ro', data: InviteData) {
  const messages = (await import(`../../../messages/${recipientLocale}.json`)).default;
  const t = createTranslator({ locale: recipientLocale, messages, namespace: 'emails.invite' });

  const subject = t('subject', { companyName: data.companyName });
  const html = renderEmail(<InviteEmail t={t} data={data} />);
  // ... send via nodemailer
}
```

Email translation keys live in the same `messages/en.json` and `messages/ro.json` files under an `emails` namespace. No separate translation system for emails.

---

## AI Content Language

The Vercel AI SDK (`ai` package, already installed) generates content. The **company-level `content_language`** setting determines:

- AI prompt language instructions (e.g., "Respond in Romanian" in system prompt)
- System template default text
- Pre-built questionnaire template translations

This is **not an i18n library concern** -- it is a prompt engineering and DB seed data concern. The i18n stack handles UI strings; AI language is a separate configuration passed to the AI SDK. The `content_language` column on the `tenants` table controls this.

---

## Installation

```bash
bun add next-intl
```

One dependency. That is it.

---

## Integration Points with Existing Code

| Existing Code | Change Needed |
|---------------|---------------|
| `next.config.ts` | Wrap with `createNextIntlPlugin()` -- the plugin connects `src/i18n/request.ts` |
| `src/app/layout.tsx` | Add `NextIntlClientProvider`, set `<html lang={locale}>` dynamically |
| `src/app/(auth)/layout.tsx` | Locale from cookie / `Accept-Language` for unauthenticated users |
| `src/app/(dashboard)/layout.tsx` | Locale from authenticated user's DB preference |
| All hardcoded UI strings | Extract to `messages/en.json` + `messages/ro.json` |
| `src/lib/email/send.ts` | Accept locale param, load correct translations via `createTranslator()` |
| `src/lib/db/schema/users.ts` | Add `ui_language` column (pgEnum: 'en' / 'ro', default 'en') |
| `src/lib/db/schema/tenants.ts` | Add `content_language` column (pgEnum: 'en' / 'ro', default 'en') |
| `src/lib/utils/scheduling.ts` | Refactor date display to use next-intl formatters |
| Settings pages | Add language picker in account settings (UI language) + company settings (content language) |
| `src/components/ui/*` | No changes -- shadcn/ui components are label-agnostic; labels come from consuming components |

### next.config.ts change

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

### Root layout change

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Type-safe translation keys (src/types/next-intl.d.ts)

```typescript
import en from '../../messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof en;
  }
}
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| next-intl | react-i18next | Not designed for App Router. Requires wrapper hacks for Server Components. ~8KB bundle vs ~2KB. next-i18next (the Next.js wrapper) is explicitly incompatible with App Router. |
| next-intl | react-intl (FormatJS) | Heavier (~12KB). Less Next.js-specific. No built-in App Router integration. More boilerplate for RSC. |
| next-intl | Paraglide.js | Newer, compile-time approach. Interesting but smaller ecosystem, less battle-tested with Next.js 16. Reasonable for greenfield but adds risk to existing app. |
| next-intl formatters | date-fns / dayjs | next-intl already wraps `Intl.DateTimeFormat`. Adding date-fns would be redundant for locale-aware formatting. Only consider if you need date arithmetic -- but that is not an i18n concern. |
| JSON translations | YAML / PO / XLIFF | JSON is next-intl's native format. No build step. TypeScript type inference works out of the box. YAML adds a parser dependency. PO/XLIFF are for professional translation workflows with agencies -- overkill for 2 languages maintained by the founder. |
| "Without i18n routing" | URL-based `[locale]` routing | Would require restructuring every route with a `[locale]` segment. Adds URL complexity for zero SEO benefit (app is behind auth). Makes the app harder to maintain for no user-facing gain. |
| Cookie + DB preference | `localePrefix: 'never'` | `localePrefix: 'never'` requires the full routing setup + middleware just to suppress prefixes. "Without i18n routing" is simpler -- no middleware, no routing config, same result. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| next-i18next | Explicitly incompatible with App Router. Pages Router only. | next-intl |
| i18next directly | Low-level, no Next.js integration, requires manual RSC wiring | next-intl (which has ICU format built in) |
| date-fns / dayjs for display formatting | Redundant -- next-intl wraps native `Intl` API for locale-aware formatting. Adds bundle weight for nothing. | next-intl `useFormatter()` / `getFormatter()` |
| Locale URL segments (`/en/`, `/ro/`) | B2B SaaS behind auth. No SEO need. Restructures all routes for zero benefit. | Cookie + DB preference via "without i18n routing" |
| Professional TMS (Crowdin, Phrase, Lokalise) | Two languages, one maintainer. Translation management systems add complexity for zero benefit at this scale. Revisit if you add 5+ languages. | JSON files in repo, reviewed in PRs |
| `navigator.language` directly | Inconsistent across SSR/client. next-intl handles negotiation properly via `getRequestConfig`. | next-intl locale resolution in `request.ts` |
| Separate i18n system for emails | Adds a second translation source of truth. Drift guaranteed. | `createTranslator()` from next-intl with the same message files |
| next-intl middleware | Not needed for the "without i18n routing" setup. Would add unnecessary complexity. | Direct locale resolution in `src/i18n/request.ts` |

---

## Romanian-Specific Considerations

### Plural forms

Romanian has **3 plural forms** (not 2 like English). ICU message format handles this:

```json
{
  "sessions": "{count, plural, one {# sesiune} few {# sesiuni} other {# de sesiuni}}"
}
```

The `few` category covers 0 and numbers 2-19, plus numbers ending in 02-19 (e.g., 102, 219). next-intl delegates plural rule selection to the `Intl.PluralRules` API, which has correct Romanian rules built into every modern browser and Node.js.

### Date format

Romanian uses `dd.MM.yyyy` (day-first with dots) and 24-hour time. The `Intl.DateTimeFormat` API handles this natively when locale is set to `ro` -- no manual format strings needed.

### Font considerations

Romanian uses diacritics: a-breve, i-circumflex, s-comma-below, t-comma-below. The Geist font (already in use) supports these characters. No font changes needed.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next-intl@4.x | Next.js 14+ (incl. 16.x) | ESM-only distribution (except plugin for CJS next.config). Matches project ESM setup. |
| next-intl@4.x | TypeScript 5+ | Required. Project already on TypeScript 5. |
| next-intl@4.x | React 18+ / 19 | Full RSC support. Project on React 19.2 -- fully compatible. |
| next-intl@4.x | Turbopack | Supported via the `createNextIntlPlugin()` wrapper. |
| next-intl@4.x | Bun | Standard npm package, no native bindings. Works with Bun. |

---

## Sources

- [next-intl: App Router without i18n routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) -- setup steps verified, HIGH confidence
- [next-intl 4.0 release blog](https://next-intl.dev/blog/next-intl-4-0) -- breaking changes, AppConfig migration, version requirements, HIGH confidence
- [next-intl npm (v4.8.3)](https://www.npmjs.com/package/next-intl) -- latest version confirmed, HIGH confidence
- [next-intl date/time formatting](https://next-intl.dev/docs/usage/dates-times) -- Intl.DateTimeFormat wrapper confirmed, HIGH confidence
- [next-intl number formatting](https://next-intl.dev/docs/usage/numbers) -- Intl.NumberFormat wrapper confirmed, HIGH confidence
- [next-intl routing configuration](https://next-intl.dev/docs/routing/configuration) -- localePrefix options verified, HIGH confidence
- [Next.js i18n guide](https://nextjs.org/docs/app/guides/internationalization) -- official Next.js i18n guidance, HIGH confidence
- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) -- browser API reference, HIGH confidence
- [Smashing Magazine: Intl API guide](https://www.smashingmagazine.com/2025/08/power-intl-api-guide-browser-native-internationalization/) -- Intl vs libraries comparison, MEDIUM confidence

---
*Stack research for: i18n in 1on1 (Next.js App Router SaaS, English + Romanian)*
*Researched: 2026-03-05*
