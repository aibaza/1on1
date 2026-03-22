"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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

function NavContent({
  visibleMain,
  visibleBottom,
  pathname,
  onNavigate,
}: {
  visibleMain: NavItem[];
  visibleBottom: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="mb-8 px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold font-headline tracking-tighter text-primary">1on1</h2>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
          Meeting Management
        </p>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {visibleMain.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-headline font-semibold text-sm",
                active
                  ? "bg-white dark:bg-[var(--sidebar-accent)] text-primary dark:text-[var(--sidebar-accent-foreground)] font-bold shadow-sm"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* CTA */}
      <div className="px-4 mb-4">
        <Link
          href="/sessions/new"
          onClick={onNavigate}
          className="w-full py-3.5 px-4 rounded-xl font-bold font-headline text-sm shadow-md hover:shadow-lg text-center block text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
        >
          <CalendarPlus className="h-4 w-4 inline-block mr-2 -mt-0.5" />
          Schedule 1:1
        </Link>
      </div>

      {/* Bottom section */}
      <div className="px-2 mt-auto pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/20 space-y-1">
        {visibleBottom.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-headline font-semibold text-sm",
                active
                  ? "bg-white dark:bg-[var(--sidebar-accent)] text-primary dark:text-[var(--sidebar-accent-foreground)] font-bold shadow-sm"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-3 rounded-lg font-headline font-semibold text-sm text-muted-foreground hover:text-primary transition-all"
        >
          <HelpCircle className="h-5 w-5 shrink-0" />
          <span>Support</span>
        </Link>
      </div>
    </>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const userRole = user?.role ?? "member";
  const t = useTranslations("navigation");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
    <>
      {/* Desktop sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-[var(--sidebar)] hidden md:flex flex-col py-6 z-50">
        <NavContent
          visibleMain={visibleMain}
          visibleBottom={visibleBottom}
          pathname={pathname}
        />
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--sidebar)] flex flex-col py-6 shadow-2xl animate-slide-in-left">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
            <NavContent
              visibleMain={visibleMain}
              visibleBottom={visibleBottom}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
