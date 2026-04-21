import { formatDistanceToNow } from "date-fns";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface AdminThreadMessage {
  id: string;
  body: string;
  authorType: "reporter" | "platform_admin";
  authorId: string;
  isInternal: boolean;
  createdAt: string | Date;
}

interface ThreadPerson {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface AdminThreadProps {
  messages: AdminThreadMessage[];
  reporter: ThreadPerson | null;
  admins: ThreadPerson[];
  className?: string;
}

function initial(name?: string | null, fallback = "?"): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.charAt(0).toUpperCase();
}

export function AdminThread({
  messages,
  reporter,
  admins,
  className,
}: AdminThreadProps) {
  const t = useTranslations("feedback.admin.thread");
  const adminMap = new Map(admins.map((a) => [a.id, a]));

  if (messages.length === 0) {
    return (
      <div className={cn("py-6 text-sm text-muted-foreground", className)}>
        {t("messagesEmpty")}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {messages.map((message, index) => {
        const createdDate =
          message.createdAt instanceof Date
            ? message.createdAt
            : new Date(message.createdAt);

        let author: ThreadPerson | null = null;
        if (message.authorType === "reporter") {
          author = reporter;
        } else {
          author = adminMap.get(message.authorId) ?? null;
        }

        const displayName =
          author?.name ??
          author?.email ??
          (message.authorType === "platform_admin"
            ? t("supportTeam")
            : t("reporter"));

        return (
          <div key={message.id}>
            {index > 0 && <Separator className="my-4" />}
            <div
              className={cn(
                "flex items-start gap-3 rounded-md",
                message.isInternal &&
                  "border border-border bg-muted/50 p-3"
              )}
            >
              <Avatar size="sm" className="mt-0.5">
                {author?.avatarUrl ? (
                  <AvatarImage src={author.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback>{initial(displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] font-medium"
                  >
                    {message.authorType === "platform_admin"
                      ? t("platformAdmin")
                      : t("reporter")}
                  </Badge>
                  {message.isInternal && (
                    <Badge
                      variant="outline"
                      className="h-5 gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                    >
                      <Lock className="h-3 w-3" />
                      {t("internal")}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(createdDate, { addSuffix: true })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {message.body}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
