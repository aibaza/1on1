"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  History,
  BarChart3,
  Users,
  FileText,
  Building2,
  ScrollText,
  Settings,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { SearchTrigger } from "@/components/search/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  matchAlso?: string[];
  /** "admin" = admin only, "manager" = admin + manager, undefined = all roles */
  minRole?: "admin" | "manager";
}

function getPrimaryNavItems(t: ReturnType<typeof useTranslations<"navigation">>): NavItem[] {
  return [
    { label: t("overview"), href: "/overview", icon: LayoutDashboard },
    { label: t("sessions"), href: "/sessions", icon: CalendarDays, matchAlso: ["/sessions"] },
    { label: t("actionItems"), href: "/action-items", icon: ListChecks },
    { label: t("history"), href: "/history", icon: History },
    { label: t("analytics"), href: "/analytics", icon: BarChart3, matchAlso: ["/analytics"], minRole: "manager" },
  ];
}

function getSettingsNavItems(t: ReturnType<typeof useTranslations<"navigation">>): NavItem[] {
  return [
    { label: t("people"), href: "/people", icon: Users, matchAlso: ["/teams"], minRole: "manager" },
    { label: t("templates"), href: "/templates", icon: FileText, minRole: "manager" },
    { label: t("company"), href: "/settings/company", icon: Building2, minRole: "admin" },
    { label: t("auditLog"), href: "/settings/audit-log", icon: ScrollText, minRole: "admin" },
  ];
}

function isPathActive(pathname: string, item: NavItem): boolean {
  if (pathname.startsWith(item.href)) return true;
  if (item.matchAlso) {
    return item.matchAlso.some((path) => pathname.startsWith(path));
  }
  return false;
}

function isSettingsActive(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => isPathActive(pathname, item));
}

function canSeeItem(level: string, item: NavItem): boolean {
  if (!item.minRole) return true;
  if (item.minRole === "admin") return level === "admin";
  if (item.minRole === "manager") return level === "admin" || level === "manager";
  return true;
}

export function TopNav({ avatarUrl }: { avatarUrl?: string | null }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userLevel = session?.user?.level ?? "member";
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("navigation");

  const primaryNavItems = getPrimaryNavItems(t);
  const settingsNavItems = getSettingsNavItems(t);

  const visiblePrimary = primaryNavItems.filter((item) => canSeeItem(userLevel, item));
  const visibleSettings = settingsNavItems.filter((item) => canSeeItem(userLevel, item));
  const settingsActive = isSettingsActive(pathname, visibleSettings);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4 lg:px-6">
      {/* Mobile hamburger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t("toggleNavigation")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
          <div className="flex h-14 items-center border-b px-5">
            <Link
              href="/overview"
              onClick={() => setMobileOpen(false)}
            >
              <Logo className="h-7" />
            </Link>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {visiblePrimary.map((item) => {
              const active = isPathActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
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
            })}

            {visibleSettings.length > 0 && (
              <>
                <div className="mt-4 mb-1 px-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    {t("settings")}
                  </span>
                </div>
                {visibleSettings.map((item) => {
                  const active = isPathActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
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
                })}
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Logo */}
      <Link
        href="/overview"
        className="mr-6 hidden md:block"
      >
        <Logo className="h-7" />
      </Link>

      {/* Desktop primary nav */}
      <nav className="hidden items-center gap-1 md:flex">
        {visiblePrimary.map((item) => {
          const active = isPathActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}

        {/* Settings dropdown */}
        {visibleSettings.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  settingsActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings className="mr-1 h-4 w-4" />
                {t("settings")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {visibleSettings.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <SearchTrigger />
        <ThemeToggle />
        <UserMenu avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
