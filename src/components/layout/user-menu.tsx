"use client";

import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, Globe, Check, Paintbrush, User } from "lucide-react";
import Link from "next/link";
import { DESIGN_PREF_COOKIE, type DesignPreference } from "@/lib/design-preference";
import { logoutAction } from "@/lib/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "en" as const, label: "English" },
  { code: "ro" as const, label: "Rom\u00e2n\u0103" },
] as const;

const DESIGNS = [
  { code: "classic" as DesignPreference, label: "Classic" },
  { code: "editorial" as DesignPreference, label: "Editorial (Beta)" },
] as const;

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const { data: session, update } = useSession();
  const t = useTranslations("navigation");
  const user = session?.user;
  // useLocale reads the actual rendered locale (source of truth)
  const currentLang = useLocale();

  // Read design preference from cookie (client-side)
  const currentDesign: DesignPreference =
    (typeof document !== "undefined" &&
      document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${DESIGN_PREF_COOKIE}=`))
        ?.split("=")[1] as DesignPreference) || "classic";

  async function switchLanguage(lang: "en" | "ro") {
    if (lang === currentLang) return;

    // 1. Set cookie client-side immediately so it's available on reload
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;

    // 2. Save to DB + set NEXT_LOCALE cookie via API
    await fetch("/api/user/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang }),
    });

    // 3. Update session JWT so subsequent requests carry new locale
    await update();

    // 4. Reload to re-render with new translations (server-side message loading)
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.name ? getAvatarUrl(user.name, user.image) : undefined} alt={user?.name ?? "User"} />
            <AvatarFallback className="text-xs">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              {user?.role && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {user.role}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            {t("account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          {t("language")}
        </DropdownMenuLabel>
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className="cursor-pointer"
          >
            <span className="flex-1">{lang.label}</span>
            {currentLang === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <Paintbrush className="h-3.5 w-3.5" />
          Design
        </DropdownMenuLabel>
        {DESIGNS.map((design) => (
          <DropdownMenuItem
            key={design.code}
            onClick={() => {
              if (design.code === currentDesign) return;
              document.cookie = `${DESIGN_PREF_COOKIE}=${design.code};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
              window.location.reload();
            }}
            className="cursor-pointer"
          >
            <span className="flex-1">{design.label}</span>
            {currentDesign === design.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              {t("signOut")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
