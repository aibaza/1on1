import { format, formatDistanceToNow } from "date-fns";
import { Download, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface FeedbackThreadMessage {
  id: string;
  body: string;
  authorType: "reporter" | "platform_admin";
  authorId: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  isInternal: boolean;
  createdAt: string | Date;
  /** Optional inline screenshot rendered inside a reporter message. */
  screenshotUrl?: string | null;
  screenshotFilename?: string | null;
}

interface FeedbackThreadProps {
  messages: FeedbackThreadMessage[];
  className?: string;
}

function getInitial(name?: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function FeedbackThread({ messages, className }: FeedbackThreadProps) {
  const tThread = useTranslations("feedback.admin.thread");

  if (messages.length === 0) {
    return (
      <div className={cn("py-6 text-sm text-muted-foreground", className)}>
        {tThread("messagesEmpty")}
      </div>
    );
  }

  return (
    <ol role="list" className={cn("flex flex-col gap-6", className)}>
      {messages.map((message) => {
        const createdDate =
          message.createdAt instanceof Date
            ? message.createdAt
            : new Date(message.createdAt);
        const isAdmin = message.authorType === "platform_admin";
        const displayName =
          message.authorName && message.authorName.trim().length > 0
            ? message.authorName
            : isAdmin
              ? tThread("supportTeam")
              : tThread("reporter");
        const absoluteTimestamp = format(createdDate, "PPp");

        return (
          <li key={message.id} className="flex items-start gap-3">
            <Avatar
              size="sm"
              className={cn(
                "mt-0.5 shrink-0",
                isAdmin && "bg-primary/10 text-primary"
              )}
            >
              {message.authorAvatarUrl ? (
                <AvatarImage src={message.authorAvatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback
                className={cn(isAdmin && "bg-primary/10 text-primary")}
              >
                {getInitial(displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className={cn(
                    "text-[13.5px] font-semibold",
                    isAdmin ? "text-primary" : "text-foreground"
                  )}
                >
                  {displayName}
                </span>
                <time
                  dateTime={createdDate.toISOString()}
                  title={absoluteTimestamp}
                  className="text-[11.5px] text-muted-foreground"
                >
                  {formatDistanceToNow(createdDate, { addSuffix: true })}
                </time>
                {message.isInternal && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    <Lock className="h-2.5 w-2.5" aria-hidden />
                    {tThread("internalNote")}
                  </span>
                )}
              </div>

              {isAdmin ? (
                // Support/admin bubble: rounded with a flat top-left corner,
                // muted background — matches the designer spec.
                <div
                  className={cn(
                    "max-w-full rounded-2xl rounded-tl-none border bg-muted/50 px-4 py-3 text-[14px] leading-relaxed text-foreground",
                    message.isInternal &&
                      "border-amber-500/30 bg-amber-500/10"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </div>
              ) : (
                // Reporter message: prose-style, no bubble, with optional
                // inline screenshot thumbnail card underneath.
                <div className="space-y-3">
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
                    {message.body}
                  </p>
                  {message.screenshotUrl ? (
                    <a
                      href={message.screenshotUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group relative block w-64 max-w-full overflow-hidden rounded-lg border bg-muted/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.screenshotUrl}
                        alt={message.screenshotFilename ?? "Screenshot"}
                        className="block h-36 w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-background/85 px-2 py-1 backdrop-blur-sm">
                        <span className="truncate text-[10.5px] font-medium text-foreground">
                          {message.screenshotFilename ?? "screenshot.png"}
                        </span>
                        <Download
                          className="h-3 w-3 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
