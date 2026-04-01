"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  helpNavigation,
  filterByRole,
  type HelpPage,
} from "@/content/help/navigation";

interface HelpSidebarProps {
  role: "admin" | "manager" | "member";
}

function NavItem({
  page,
  currentSlug,
  depth,
}: {
  page: HelpPage;
  currentSlug: string;
  depth: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- help namespace added at runtime
  const t = useTranslations("help" as any) as any;
  const isActive = currentSlug === page.slug;
  const isParentActive = currentSlug.startsWith(page.slug + "/");
  const hasChildren = page.children && page.children.length > 0;

  // Section headers (depth 0 with children) — not clickable links
  if (depth === 0 && hasChildren) {
    return (
      <div className="mt-6 first:mt-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-3">
          {t(page.titleKey)}
        </p>
        <ul className="space-y-0.5">
          {page.children!.map((child) => (
            <NavItem
              key={child.slug}
              page={child}
              currentSlug={currentSlug}
              depth={depth + 1}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <li>
      <Link
        href={`/help/${page.slug}`}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        {isActive && (
          <ChevronRight className="size-3 shrink-0" />
        )}
        <span className={!isActive ? "ml-5" : ""}>{t(page.titleKey)}</span>
      </Link>
    </li>
  );
}

export function HelpSidebar({ role }: HelpSidebarProps) {
  const pathname = usePathname();
  const currentSlug = pathname.replace("/help/", "").replace(/\/$/, "");
  const filteredNav = filterByRole(helpNavigation, role);

  return (
    <nav className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-28 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4">
        {filteredNav.map((section) => (
          <NavItem
            key={section.slug}
            page={section}
            currentSlug={currentSlug}
            depth={0}
          />
        ))}
      </div>
    </nav>
  );
}
