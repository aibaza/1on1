"use client";

import { Search, ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function EditorialTopBar({ avatarUrl }: { avatarUrl?: string | null }) {
  const { data: session } = useSession();
  const t = useTranslations("navigation");
  const tAdmin = useTranslations("admin");
  const user = session?.user;
  const userLevel = user?.level ?? "member";
  const impersonatedBy = (user as { impersonatedBy?: { name: string } } | undefined)?.impersonatedBy;

  async function handleStopImpersonation() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-var(--sidebar-width,256px))] z-40 bg-[var(--background)]/80 backdrop-blur-xl flex justify-between items-center h-16 px-4 md:px-8 shadow-sm transition-[width] duration-300">
      {/* Search — opens CommandPalette via Cmd+K */}
      <div className="flex items-center flex-1">
        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
            );
          }}
          className="relative w-full max-w-md text-left"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <div className="w-full pl-12 pr-4 py-2.5 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-full text-sm text-muted-foreground/60 hover:bg-[var(--editorial-surface-container,var(--accent))] transition-colors cursor-pointer font-body">
            {t("searchRecords")}
          </div>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Impersonation indicator */}
        {impersonatedBy && (
          <button
            onClick={handleStopImpersonation}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {tAdmin("impersonation.banner", { name: user?.name ?? "", admin: impersonatedBy.name })}
            </span>
            <span className="sm:hidden">
              {tAdmin("impersonation.returnToAdmin")}
            </span>
          </button>
        )}

        <ThemeToggle />

        {/* User profile section */}
        <div className="pl-3 border-l border-[var(--editorial-outline-variant,var(--border))]">
          <UserMenu
            avatarUrl={avatarUrl}
            renderTrigger={
              user ? (
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-foreground font-headline">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium capitalize">{userLevel}</p>
                </div>
              ) : undefined
            }
          />
        </div>
      </div>
    </header>
  );
}
