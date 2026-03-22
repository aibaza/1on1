"use client";

import { Bell, HelpCircle, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function EditorialTopBar() {
  const { data: session } = useSession();
  const user = session?.user;
  const userRole = user?.role ?? "member";

  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-var(--sidebar-width,256px))] z-40 bg-[var(--background)]/80 backdrop-blur-xl flex justify-between items-center h-16 px-4 md:px-8 shadow-sm transition-[width] duration-300">
      {/* Search */}
      <div className="flex items-center flex-1">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search records..."
            className="w-full pl-12 pr-4 py-2.5 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-full text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all placeholder:text-muted-foreground/60 font-body"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button aria-label="Notifications" className="p-2 text-muted-foreground hover:text-foreground hover:bg-[var(--editorial-surface-container-high,var(--muted))] rounded-full transition-all">
          <Bell className="h-5 w-5" />
        </button>
        <button aria-label="Help" className="p-2 text-muted-foreground hover:text-foreground hover:bg-[var(--editorial-surface-container-high,var(--muted))] rounded-full transition-all">
          <HelpCircle className="h-5 w-5" />
        </button>
        <ThemeToggle />

        {/* User profile section */}
        <div className="flex items-center gap-3 pl-4 border-l border-[var(--editorial-outline-variant,var(--border))]">
          {user && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground font-headline">{user.name}</p>
              <p className="text-[10px] text-muted-foreground font-medium capitalize">{userRole}</p>
            </div>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
