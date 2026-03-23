"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";

interface ProfileSheetUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  managerName: string | null;
  status: "active" | "pending" | "deactivated";
  teams: { id: string; name: string }[];
}

interface ProfileSheetProps {
  user: ProfileSheetUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "deactivated":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "";
  }
}

export function ProfileSheet({ user, open, onOpenChange }: ProfileSheetProps) {
  const t = useTranslations("people");
  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage src={getAvatarUrl(`${user.firstName} ${user.lastName}`, user.avatarUrl)} />
              <AvatarFallback>
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg">
                {user.firstName} {user.lastName}
              </SheetTitle>
              <SheetDescription className="truncate">
                {user.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {user.role === "admin" ? t("table.admin") : user.role === "manager" ? t("table.manager") : user.role === "member" ? t("table.member") : user.role}
            </Badge>
            <Badge variant="outline" className={getStatusColor(user.status)}>
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-4">
            {user.jobTitle && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("profile.jobTitle")}
                </p>
                <p className="text-sm">{user.jobTitle}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("profile.manager")}
              </p>
              <p className="text-sm">{user.managerName || t("profile.none")}</p>
            </div>

            {user.teams.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("profile.teams")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.teams.map((team) => (
                    <Badge key={team.id} variant="outline">
                      {team.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href={`/people/${user.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("profile.viewProfile")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
