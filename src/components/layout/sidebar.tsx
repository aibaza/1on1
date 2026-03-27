// Legacy sidebar -- kept as icon-only collapsible fallback. Not used in default layout.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Users, Building2, ScrollText, FileText, CalendarDays, ListChecks, History, BarChart3, LogOut, CreditCard, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useTranslations } from "next-intl";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  matchAlso?: string[];
  adminOnly?: boolean;
}

function getMainNavItems(t: ReturnType<typeof useTranslations<"navigation">>): NavItem[] {
  return [
    {
      label: t("overview"),
      href: "/overview",
      icon: LayoutDashboard,
    },
    {
      label: t("sessions"),
      href: "/sessions",
      icon: CalendarDays,
      matchAlso: ["/sessions"],
    },
    {
      label: t("actionItems"),
      href: "/action-items",
      icon: ListChecks,
    },
    {
      label: t("history"),
      href: "/history",
      icon: History,
    },
    {
      label: t("analytics"),
      href: "/analytics",
      icon: BarChart3,
      matchAlso: ["/analytics"],
    },
  ];
}

function getSettingsNavItems(t: ReturnType<typeof useTranslations<"navigation">>): NavItem[] {
  return [
    {
      label: t("people"),
      href: "/people",
      icon: Users,
      matchAlso: ["/teams"],
    },
    {
      label: t("templates"),
      href: "/templates",
      icon: FileText,
    },
    {
      label: t("company"),
      href: "/settings/company",
      icon: Building2,
      adminOnly: true,
    },
    {
      label: t("billing"),
      href: "/settings/billing",
      icon: CreditCard,
      adminOnly: true,
    },
    {
      label: t("auditLog"),
      href: "/settings/audit-log",
      icon: ScrollText,
      adminOnly: true,
    },
  ];
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userLevel = session?.user?.level ?? "member";
  const isAdmin = userLevel === "admin";
  const t = useTranslations("navigation");

  const mainNavItems = getMainNavItems(t);
  const settingsNavItems = getSettingsNavItems(t);

  function isActive(item: NavItem) {
    if (pathname.startsWith(item.href)) return true;
    if (item.matchAlso) {
      return item.matchAlso.some((path) => pathname.startsWith(path));
    }
    return false;
  }

  function renderNavItem(item: NavItem) {
    const active = isActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
        )}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  }

  const visibleSettingsItems = settingsNavItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/overview">
          <Logo className="h-7" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {mainNavItems.map(renderNavItem)}

        {visibleSettingsItems.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {t("settings")}
              </span>
            </div>
            {visibleSettingsItems.map(renderNavItem)}
          </>
        )}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium">{session?.user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </button>
        </form>
      </div>
    </aside>
  );
}
