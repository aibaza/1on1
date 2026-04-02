/**
 * Help content loader using dynamic imports (bundled at build time).
 * This works on Vercel where fs.readFile cannot access source files.
 */

type ContentModule = { default: string };

const contentMap: Record<string, Record<string, () => Promise<ContentModule>>> = {
  en: {
    "account/profile": () => import("@/content/help/en/account/profile.md"),
    "account/security": () => import("@/content/help/en/account/security.md"),
    "action-items/managing": () => import("@/content/help/en/action-items/managing.md"),
    "action-items/overview": () => import("@/content/help/en/action-items/overview.md"),
    "analytics/dashboard": () => import("@/content/help/en/analytics/dashboard.md"),
    "analytics/individual": () => import("@/content/help/en/analytics/individual.md"),
    "analytics/team": () => import("@/content/help/en/analytics/team.md"),
    "getting-started/first-login": () => import("@/content/help/en/getting-started/first-login.md"),
    "getting-started/navigation": () => import("@/content/help/en/getting-started/navigation.md"),
    "getting-started/overview": () => import("@/content/help/en/getting-started/overview.md"),
    "people/inviting": () => import("@/content/help/en/people/inviting.md"),
    "people/managing": () => import("@/content/help/en/people/managing.md"),
    "sessions/history": () => import("@/content/help/en/sessions/history.md"),
    "sessions/scheduling": () => import("@/content/help/en/sessions/scheduling.md"),
    "sessions/summary": () => import("@/content/help/en/sessions/summary.md"),
    "sessions/wizard": () => import("@/content/help/en/sessions/wizard.md"),
    "settings/audit-log": () => import("@/content/help/en/settings/audit-log.md"),
    "settings/billing": () => import("@/content/help/en/settings/billing.md"),
    "settings/company": () => import("@/content/help/en/settings/company.md"),
    "teams/overview": () => import("@/content/help/en/teams/overview.md"),
    "templates/ai-editor": () => import("@/content/help/en/templates/ai-editor.md"),
    "templates/creating": () => import("@/content/help/en/templates/creating.md"),
    "templates/overview": () => import("@/content/help/en/templates/overview.md"),
  },
  ro: {
    "account/profile": () => import("@/content/help/ro/account/profile.md"),
    "account/security": () => import("@/content/help/ro/account/security.md"),
    "action-items/managing": () => import("@/content/help/ro/action-items/managing.md"),
    "action-items/overview": () => import("@/content/help/ro/action-items/overview.md"),
    "analytics/dashboard": () => import("@/content/help/ro/analytics/dashboard.md"),
    "analytics/individual": () => import("@/content/help/ro/analytics/individual.md"),
    "analytics/team": () => import("@/content/help/ro/analytics/team.md"),
    "getting-started/first-login": () => import("@/content/help/ro/getting-started/first-login.md"),
    "getting-started/navigation": () => import("@/content/help/ro/getting-started/navigation.md"),
    "getting-started/overview": () => import("@/content/help/ro/getting-started/overview.md"),
    "people/inviting": () => import("@/content/help/ro/people/inviting.md"),
    "people/managing": () => import("@/content/help/ro/people/managing.md"),
    "sessions/history": () => import("@/content/help/ro/sessions/history.md"),
    "sessions/scheduling": () => import("@/content/help/ro/sessions/scheduling.md"),
    "sessions/summary": () => import("@/content/help/ro/sessions/summary.md"),
    "sessions/wizard": () => import("@/content/help/ro/sessions/wizard.md"),
    "settings/audit-log": () => import("@/content/help/ro/settings/audit-log.md"),
    "settings/billing": () => import("@/content/help/ro/settings/billing.md"),
    "settings/company": () => import("@/content/help/ro/settings/company.md"),
    "teams/overview": () => import("@/content/help/ro/teams/overview.md"),
    "templates/ai-editor": () => import("@/content/help/ro/templates/ai-editor.md"),
    "templates/creating": () => import("@/content/help/ro/templates/creating.md"),
    "templates/overview": () => import("@/content/help/ro/templates/overview.md"),
  },
};

/**
 * Load markdown content for a help page.
 * Tries locale-specific content first, falls back to English.
 */
export async function loadHelpContent(
  slug: string,
  locale: string
): Promise<string | null> {
  // Try requested locale first, then fall back to English
  const locales = locale === "en" ? ["en"] : [locale, "en"];

  for (const loc of locales) {
    const loader = contentMap[loc]?.[slug];
    if (loader) {
      try {
        const mod = await loader();
        return mod.default;
      } catch {
        continue;
      }
    }
  }

  return null;
}
