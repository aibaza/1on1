import Link from "next/link";
import { ArrowLeft, ExternalLink, Inbox } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/feedback/status-badge";
import {
  FeedbackThread,
  type FeedbackThreadMessage,
} from "@/components/feedback/feedback-thread";
import { ReporterReplyForm } from "@/components/feedback/reporter-reply-form";
import type { MyFeedbackDetail } from "@/lib/queries/feedback";

function formatTimestamp(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function ReporterTicketDetail({
  detail,
  locale,
  screenshotSrc,
}: {
  detail: MyFeedbackDetail;
  locale: string;
  screenshotSrc: string | null;
}) {
  const t = await getTranslations("feedback.mine");
  const tType = await getTranslations("feedback.type");
  const { report, messages } = detail;

  return (
    <>
      {/* Header (sticky at the top of the detail pane) */}
      <header className="flex flex-col gap-3 border-b bg-card px-5 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link
            href="/feedback/mine"
            className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground md:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("backToList")}
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="text-xs font-mono text-muted-foreground">
              FB-{report.ticketNumber}
            </span>
          </div>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {report.title}
        </h1>
        {/* Meta card: TYPE / SUBMITTED / PAGE URL */}
        <dl className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-[auto_auto_1fr] sm:gap-x-6">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("ticketLabel")}
            </dt>
            <dd className="text-[13px] font-medium text-foreground">
              {report.type === "bug" ? tType("bug") : tType("suggestion")}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("submitted")}
            </dt>
            <dd className="text-[13px] font-medium text-foreground">
              {formatTimestamp(report.createdAt, locale)}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("pageUrl")}
            </dt>
            <dd className="min-w-0">
              <a
                href={report.pageUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-w-0 max-w-full items-center gap-1 text-[13px] text-primary hover:underline"
              >
                <span className="truncate">{report.pageUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </a>
            </dd>
          </div>
        </dl>
      </header>

      {/* Thread (scrollable middle) */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-6">
        <FeedbackThread
          messages={[
            // Synthesize the original post as the first thread message so the
            // description (and screenshot, when present) shows inline with the
            // conversation the way the designer specified.
            {
              id: `origin-${report.id}`,
              body: report.description,
              authorType: "reporter",
              authorId: report.userId,
              authorName: null,
              authorAvatarUrl: null,
              isInternal: false,
              createdAt: report.createdAt,
              screenshotUrl: screenshotSrc,
              screenshotFilename: `feedback-${report.ticketNumber}.png`,
            } as FeedbackThreadMessage,
            ...messages,
          ]}
        />
      </div>

      {/* Reply form / resolved footer */}
      <div className="shrink-0 border-t bg-muted/20 px-5 py-4 md:px-6">
        <ReporterReplyForm
          feedbackId={report.id}
          currentStatus={report.status}
        />
      </div>
    </>
  );
}

export async function ReporterDetailEmpty() {
  const t = await getTranslations("feedback.mine");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-medium text-foreground">
        {t("emptyDetailTitle")}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("emptyDetailDescription")}
      </p>
    </div>
  );
}

export async function AdminDetailEmpty() {
  const t = await getTranslations("feedback.mine");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-medium text-foreground">
        {t("emptyDetailTitle")}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("emptyDetailDescription")}
      </p>
    </div>
  );
}
