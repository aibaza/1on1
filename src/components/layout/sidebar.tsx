"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Users, Building2, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  matchAlso?: string[];
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    label: "Overview",
    href: "/overview",
    icon: LayoutDashboard,
  },
  {
    label: "People",
    href: "/people",
    icon: Users,
    matchAlso: ["/teams"],
  },
];

const settingsNavItems: NavItem[] = [
  {
    label: "Company",
    href: "/settings/company",
    icon: Building2,
    adminOnly: true,
  },
  {
    label: "Audit Log",
    href: "/settings/audit-log",
    icon: ScrollText,
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "member";
  const isAdmin = userRole === "admin";

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
        <Link href="/overview" className="text-lg font-semibold tracking-tight">
          1on1
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {mainNavItems.map(renderNavItem)}

        {visibleSettingsItems.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                Settings
              </span>
            </div>
            {visibleSettingsItems.map(renderNavItem)}
          </>
        )}
      </nav>
    </aside>
  );
}
