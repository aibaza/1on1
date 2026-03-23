"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    description: string | null;
    managerName: string | null;
    managerAvatarUrl: string | null;
    memberCount: number;
  };
}

export function TeamCard({ team }: TeamCardProps) {
  const t = useTranslations("teams");

  const initials = team.managerName
    ? team.managerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "TL";

  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="transition-all duration-200 hover:bg-accent/50 hover:shadow-md cursor-pointer h-full dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold leading-tight">
            {team.name}
          </CardTitle>
          {team.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {team.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={getAvatarUrl(team.managerName ?? "", team.managerAvatarUrl)}
                  alt={team.managerName ?? t("noLead")}
                />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {team.managerName ?? t("noLead")}
              </span>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {team.memberCount}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
