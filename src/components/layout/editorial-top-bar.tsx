"use client";

import { Bell, HelpCircle, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function EditorialTopBar() {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl flex justify-between items-center h-16 px-8 shadow-sm border-b border-slate-200/50 dark:border-slate-800/50">
      {/* Search */}
      <div className="flex items-center flex-1">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-muted border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-border mx-1" />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
