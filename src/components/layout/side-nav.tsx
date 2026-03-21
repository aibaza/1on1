"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  FileText,
  Building2,
  Settings,
  HelpCircle,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  matchAlso?: string[];
  minRole?: "admin" | "manager";
}

function canSeeItem(role: string, item: NavItem): boolean {
  if (!item.minRole) return true;
  if (item.minRole === "admin") return role === "admin";
  if (item.minRole === "manager") return role === "admin" || role === "manager";
  return true;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return item.matchAlso?.some((p) => pathname.startsWith(p)) ?? false;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function SideNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const userRole = user?.role ?? "member";
  const t = useTranslations("navigation");

  const mainNavItems: NavItem[] = [
    { label: t("overview"), href: "/overview", icon: LayoutDashboard },
    { label: t("sessions"), href: "/sessions", icon: CalendarDays, matchAlso: ["/sessions"] },
    { label: t("people"), href: "/people", icon: Users, matchAlso: ["/teams"], minRole: "manager" },
    { label: t("analytics"), href: "/analytics", icon: BarChart3, matchAlso: ["/analytics"], minRole: "manager" },
    { label: t("templates"), href: "/templates", icon: FileText, minRole: "manager" },
  ];

  const bottomNavItems: NavItem[] = [
    { label: t("company"), href: "/settings/company", icon: Settings, minRole: "admin" },
  ];

  const visibleMain = mainNavItems.filter((item) => canSeeItem(userRole, item));
  const visibleBottom = bottomNavItems.filter((item) => canSeeItem(userRole, item));

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-100 dark:bg-slate-900 flex flex-col py-6 px-4 z-50 border-r border-slate-200 dark:border-slate-800">
      {/* Brand */}
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shrink-0">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-headline tracking-tight text-primary">1on1</h2>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Meeting Management
          </p>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1">
        {visibleMain.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                active
                  ? "bg-white dark:bg-slate-800 text-primary dark:text-blue-200 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* CTA */}
      <div className="px-2 mb-4">
        <Link
          href="/sessions/new"
          className="w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md text-center block text-white"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
        >
          <CalendarPlus className="h-4 w-4 inline-block mr-2 -mt-0.5" />
          Schedule 1:1
        </Link>
      </div>

      {/* Bottom section */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        {visibleBottom.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                active
                  ? "bg-white dark:bg-slate-800 text-primary dark:text-blue-200 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all"
        >
          <HelpCircle className="h-5 w-5 shrink-0" />
          <span>Support</span>
        </Link>

        {/* User profile */}
        {user && (
          <div className="flex items-center gap-3 px-2 pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{userRole}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
