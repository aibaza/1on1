"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import { X, Mail, Briefcase, Users, UserCog, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileSheetUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  level: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  managerName: string | null;
  status: "active" | "pending" | "deactivated";
  teamName: string | null;
}

interface ProfileSheetProps {
  user: ProfileSheetUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ProfileSheet({ user, open, onOpenChange }: ProfileSheetProps) {
  const t = useTranslations("people");
  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`;
  const roleLabel = user.level === "admin" ? t("table.admin") : user.level === "manager" ? t("table.manager") : t("table.member");

  const statusColor = user.status === "active"
    ? "bg-[var(--color-success,#004c47)]/10 text-[var(--color-success,#004c47)]"
    : user.status === "pending"
      ? "bg-[var(--color-warning,#f59e0b)]/10 text-[var(--color-warning,#f59e0b)]"
      : "bg-muted text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[440px] p-0 flex flex-col [&>button]:hidden">
        {/* Header */}
        <header className="p-8 pb-6 border-b border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-primary/5">
                <ThemedAvatarImage name={fullName} uploadedUrl={user.avatarUrl} role={user.level} />
                <AvatarFallback className="text-sm font-bold">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-headline font-extrabold text-foreground">{fullName}</h2>
                {user.jobTitle && (
                  <p className="text-sm text-muted-foreground/60 font-medium">{user.jobTitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 font-bold text-xs rounded-full uppercase tracking-wider bg-primary/10 text-primary">
              {roleLabel}
            </span>
            <span className={cn("px-3 py-1 font-bold text-xs rounded-full uppercase tracking-wider", statusColor)}>
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </span>
          </div>
        </header>

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-lg">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                {t("profile.email")}
              </p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
          </div>

          {/* Job title */}
          {user.jobTitle && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-lg">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                  {t("profile.jobTitle")}
                </p>
                <p className="text-sm font-medium text-foreground">{user.jobTitle}</p>
              </div>
            </div>
          )}

          {/* Manager */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-lg">
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                {t("profile.manager")}
              </p>
              <p className="text-sm font-medium text-foreground">
                {user.managerName || t("profile.none")}
              </p>
            </div>
          </div>

          {/* Team */}
          {user.teamName && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                  {t("profile.teams")}
                </p>
                <p className="text-sm font-medium text-foreground">{user.teamName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-8 pt-0">
          <Link
            href={`/people/${user.id}`}
            className="w-full py-3 text-white rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
          >
            <ExternalLink className="h-4 w-4" />
            {t("profile.viewProfile")}
          </Link>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
