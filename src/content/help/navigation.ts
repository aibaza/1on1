/**
 * Help documentation navigation tree.
 * Each entry maps a slug to its metadata.
 * `roles` restricts visibility: omit for all roles.
 */

export interface HelpPage {
  slug: string;
  titleKey: string; // i18n key under "help"
  roles?: ("admin" | "manager" | "member")[];
  children?: HelpPage[];
}

export const helpNavigation: HelpPage[] = [
  {
    slug: "getting-started",
    titleKey: "nav.gettingStarted",
    children: [
      { slug: "getting-started/overview", titleKey: "nav.gettingStartedOverview" },
      { slug: "getting-started/first-login", titleKey: "nav.firstLogin" },
      { slug: "getting-started/navigation", titleKey: "nav.navigation" },
    ],
  },
  {
    slug: "sessions",
    titleKey: "nav.sessions",
    children: [
      { slug: "sessions/scheduling", titleKey: "nav.scheduling", roles: ["admin", "manager"] },
      { slug: "sessions/wizard", titleKey: "nav.wizard" },
      { slug: "sessions/summary", titleKey: "nav.sessionSummary" },
      { slug: "sessions/history", titleKey: "nav.history" },
    ],
  },
  {
    slug: "action-items",
    titleKey: "nav.actionItems",
    children: [
      { slug: "action-items/overview", titleKey: "nav.actionItemsOverview" },
      { slug: "action-items/managing", titleKey: "nav.managingActions" },
    ],
  },
  {
    slug: "templates",
    titleKey: "nav.templates",
    roles: ["admin", "manager"],
    children: [
      { slug: "templates/overview", titleKey: "nav.templatesOverview", roles: ["admin", "manager"] },
      { slug: "templates/creating", titleKey: "nav.creatingTemplates", roles: ["admin", "manager"] },
      { slug: "templates/ai-editor", titleKey: "nav.aiEditor", roles: ["admin", "manager"] },
    ],
  },
  {
    slug: "analytics",
    titleKey: "nav.analytics",
    roles: ["admin", "manager"],
    children: [
      { slug: "analytics/dashboard", titleKey: "nav.analyticsDashboard", roles: ["admin", "manager"] },
      { slug: "analytics/individual", titleKey: "nav.individualAnalytics", roles: ["admin", "manager"] },
      { slug: "analytics/team", titleKey: "nav.teamAnalytics", roles: ["admin", "manager"] },
    ],
  },
  {
    slug: "people",
    titleKey: "nav.people",
    roles: ["admin", "manager"],
    children: [
      { slug: "people/managing", titleKey: "nav.managingPeople", roles: ["admin", "manager"] },
      { slug: "people/inviting", titleKey: "nav.invitingPeople", roles: ["admin"] },
    ],
  },
  {
    slug: "teams",
    titleKey: "nav.teams",
    roles: ["admin", "manager"],
    children: [
      { slug: "teams/overview", titleKey: "nav.teamsOverview", roles: ["admin", "manager"] },
    ],
  },
  {
    slug: "settings",
    titleKey: "nav.settings",
    roles: ["admin"],
    children: [
      { slug: "settings/company", titleKey: "nav.companySettings", roles: ["admin"] },
      { slug: "settings/billing", titleKey: "nav.billing", roles: ["admin"] },
      { slug: "settings/audit-log", titleKey: "nav.auditLog", roles: ["admin"] },
    ],
  },
  {
    slug: "account",
    titleKey: "nav.account",
    children: [
      { slug: "account/profile", titleKey: "nav.profile" },
      { slug: "account/security", titleKey: "nav.accountSecurity" },
    ],
  },
];

/** Flatten the tree for lookup */
export function getAllHelpPages(): HelpPage[] {
  const pages: HelpPage[] = [];
  function walk(items: HelpPage[]) {
    for (const item of items) {
      pages.push(item);
      if (item.children) walk(item.children);
    }
  }
  walk(helpNavigation);
  return pages;
}

/** Filter navigation by role */
export function filterByRole(
  items: HelpPage[],
  role: "admin" | "manager" | "member"
): HelpPage[] {
  return items
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children ? filterByRole(item.children, role) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}
