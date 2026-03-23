"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  CalendarPlus,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Logo, LogoIcon } from "@/components/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COLLAPSE_BREAKPOINT = 1536; // collapsed under 2xl, expanded on wide screens
const SIDEBAR_EXPANDED = 256; // w-64
const SIDEBAR_COLLAPSED = 72; // w-[72px]

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

function NavLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg transition-all font-headline font-semibold text-sm",
        collapsed ? "px-0 py-3 justify-center" : "px-4 py-3",
        active
          ? "bg-white dark:bg-[var(--sidebar-accent)] text-primary dark:text-[var(--sidebar-accent-foreground)] font-bold shadow-sm"
          : "text-muted-foreground hover:text-primary"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function SideNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const userRole = user?.role ?? "member";
  const t = useTranslations("navigation");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userToggled, setUserToggled] = useState(false);

  // Auto-collapse below 1920px, but respect manual toggle
  useEffect(() => {
    function handleResize() {
      if (!userToggled) {
        setCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userToggled]);

  const [, startTransition] = useTransition();
  const toggleCollapse = useCallback(() => {
    setUserToggled(true);
    startTransition(() => {
      setCollapsed((prev) => !prev);
    });
  }, [startTransition]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const mainNavItems: NavItem[] = [
    { label: t("overview"), href: "/overview", icon: LayoutDashboard },
    { label: t("sessions"), href: "/sessions", icon: CalendarDays, matchAlso: ["/sessions"] },
    { label: t("people"), href: "/people", icon: Users, minRole: "manager" },
    { label: t("analytics"), href: "/analytics", icon: BarChart3, matchAlso: ["/analytics"], minRole: "manager" },
    { label: t("templates"), href: "/templates", icon: FileText, minRole: "manager" },
  ];

  const bottomNavItems: NavItem[] = [
    { label: t("teams"), href: "/teams", icon: UsersRound, matchAlso: ["/teams"], minRole: "manager" },
    { label: t("company"), href: "/settings/company", icon: Settings, minRole: "admin" },
  ];

  const visibleMain = mainNavItems.filter((item) => canSeeItem(userRole, item));
  const visibleBottom = bottomNavItems.filter((item) => canSeeItem(userRole, item));

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  // Update CSS variable imperatively to avoid style tag re-injection
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
  }, [sidebarWidth]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="h-screen fixed left-0 top-0 bg-[var(--sidebar)] hidden md:flex flex-col py-6 z-50 transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        {/* Brand */}
        <div className={cn("mb-8 flex items-center overflow-visible", collapsed ? "justify-center" : "px-6")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/overview">
                  <Logo className="h-6 w-full max-w-[64px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>1on1 — {t("meetingManagement")}</TooltipContent>
            </Tooltip>
          ) : (
            <div>
              <Link href="/overview">
                <Logo className="h-7" />
              </Link>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5">
                {t("meetingManagement")}
              </p>
            </div>
          )}
        </div>

        {/* Main navigation */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "px-3" : "px-2")}>
          {visibleMain.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        {/* CTA */}
        <div className={cn("mb-4", collapsed ? "px-3" : "px-4")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/sessions/new"
                  className="w-full py-3 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
                >
                  <CalendarPlus className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>{t("scheduleMeeting")}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/sessions/new"
              className="w-full py-3.5 px-4 rounded-xl font-bold font-headline text-sm shadow-md hover:shadow-lg text-center block text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
            >
              <CalendarPlus className="h-4 w-4 inline-block mr-2 -mt-0.5" />
              {t("scheduleMeeting")}
            </Link>
          )}
        </div>

        {/* Bottom section */}
        <div className={cn(
          "mt-auto pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/20 space-y-1",
          collapsed ? "px-3" : "px-2"
        )}>
          {visibleBottom.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  className="flex items-center justify-center py-3 rounded-lg text-muted-foreground hover:text-primary transition-all"
                >
                  <HelpCircle className="h-5 w-5 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>{t("support")}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-headline font-semibold text-sm text-muted-foreground hover:text-primary transition-all"
            >
              <HelpCircle className="h-5 w-5 shrink-0" />
              <span>{t("support")}</span>
            </Link>
          )}

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              "flex items-center rounded-lg py-2.5 text-muted-foreground hover:text-primary transition-all w-full",
              collapsed ? "justify-center" : "gap-3 px-4"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4 shrink-0" />
              : <PanelLeftClose className="h-4 w-4 shrink-0" />}
            {!collapsed && <span className="text-xs font-medium">{t("collapse")}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[55] p-2 rounded-lg bg-[var(--sidebar)] shadow-md text-foreground"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--sidebar)] flex flex-col py-6 shadow-2xl animate-slide-in-left">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Mobile always expanded */}
            <div className="mb-8 px-6">
              <Logo className="h-7" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                {t("meetingManagement")}
              </p>
            </div>
            <nav className="flex-1 space-y-1 px-2">
              {visibleMain.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              ))}
            </nav>
            <div className="px-4 mb-4">
              <Link
                href="/sessions/new"
                onClick={() => setMobileOpen(false)}
                className="w-full py-3.5 px-4 rounded-xl font-bold font-headline text-sm shadow-md hover:shadow-lg text-center block text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
              >
                <CalendarPlus className="h-4 w-4 inline-block mr-2 -mt-0.5" />
                {t("scheduleMeeting")}
              </Link>
            </div>
            <div className="px-2 mt-auto pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/20 space-y-1">
              {visibleBottom.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              ))}
              <Link
                href="#"
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-headline font-semibold text-sm text-muted-foreground hover:text-primary transition-all"
              >
                <HelpCircle className="h-5 w-5 shrink-0" />
                <span>{t("support")}</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
