"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "People", href: "/people" },
  { label: "Teams", href: "/teams" },
];

export function PeopleTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-[3px] w-fit">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/people"
              ? pathname === "/people" || pathname.startsWith("/people/")
              : pathname === "/teams" || pathname.startsWith("/teams/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
