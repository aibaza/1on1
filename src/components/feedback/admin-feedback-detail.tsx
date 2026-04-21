"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Calendar, ExternalLink, Mail, Monitor } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { StatusBadge } from "@/components/feedback/status-badge";
import { PriorityBadge } from "@/components/feedback/priority-badge";
import { TypeBadge } from "@/components/feedback/type-badge";
import { ScreenshotViewer } from "@/components/feedback/screenshot-viewer";
import { AdminThread, type AdminThreadMessage } from "@/components/feedback/admin-thread";
import { AdminReplyForm } from "@/components/feedback/admin-reply-form";
import {
  AdminControlsPanel,
  type AssigneeOption,
} from "@/components/feedback/admin-controls-panel";

import type {
  FeedbackCloseReason,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType,
} from "@/lib/validations/feedback";

export interface AdminFeedbackReport {
  id: string;
  ticketNumber: number;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  tags: string[];
  screenshotUrl: string | null;
  pageUrl: string;
  viewport: { w?: number; h?: number } | unknown;
  userAgent: string;
  assignedToUserId: string | null;
  closeReason: FeedbackCloseReason | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminFeedbackReporter {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface AdminFeedbackTenant {
  id: string;
  name: string;
  slug: string;
}

interface AdminFeedbackDetailProps {
  reportData: AdminFeedbackReport;
  initialMessages: AdminThreadMessage[];
  reporter: AdminFeedbackReporter | null;
  tenant: AdminFeedbackTenant | null;
  assignees: AssigneeOption[];
}

function initial(name?: string | null, email?: string | null): string {
  const src = name?.trim() || email?.trim() || "?";
  return src.charAt(0).toUpperCase();
}

export function AdminFeedbackDetail({
  reportData,
  initialMessages,
  reporter,
  tenant,
  assignees,
}: AdminFeedbackDetailProps) {
  const t = useTranslations("feedback.admin.detail");
  const viewport = reportData.viewport as { w?: number; h?: number } | null;
  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-5 md:px-6 md:py-6 space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-2 -ml-2 text-muted-foreground md:hidden"
        >
          <Link href="/admin/feedback">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium text-muted-foreground">
                FB-{reportData.ticketNumber}
              </span>
              <TypeBadge type={reportData.type} />
              <StatusBadge status={reportData.status} />
              <PriorityBadge priority={reportData.priority} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {reportData.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Left: thread + reply */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              {reporter ? (
                <Avatar size="sm" className="mt-0.5">
                  {reporter.avatarUrl ? (
                    <AvatarImage
                      src={reporter.avatarUrl}
                      alt={reporter.name ?? reporter.email ?? t("reporter")}
                    />
                  ) : null}
                  <AvatarFallback>
                    {initial(reporter.name, reporter.email)}
                  </AvatarFallback>
                </Avatar>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium">
                    {reporter?.name ?? reporter?.email ?? t("unknownReporter")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("reportedAt", {
                      date: format(
                        new Date(reportData.createdAt),
                        "MMM d, yyyy 'at' h:mm a"
                      ),
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {reportData.description}
                </p>
              </div>
            </div>
            {reportData.screenshotUrl ? (
              <div className="mt-4">
                <ScreenshotViewer url={`/api/feedback/screenshots/${reportData.id}`} />
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("conversation")}
            </h2>
            <AdminThread
              messages={initialMessages}
              reporter={reporter}
              admins={assignees}
            />
          </Card>

          <AdminReplyForm reportId={reportData.id} />
        </div>

        {/* Right: controls + metadata */}
        <div className="space-y-5">
          <Card className="p-5">
            <AdminControlsPanel
              reportId={reportData.id}
              currentStatus={reportData.status}
              currentPriority={reportData.priority}
              currentAssignedToUserId={reportData.assignedToUserId}
              currentTags={reportData.tags}
              currentCloseReason={reportData.closeReason}
              assignees={assignees}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("context")}
            </h2>
            <div className="space-y-3 text-sm">
              {reporter ? (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {t("reporter")}
                    </div>
                    <div className="truncate font-medium">
                      {reporter.name ?? reporter.email ?? t("unknown")}
                    </div>
                    {reporter.email && reporter.name ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {reporter.email}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {tenant ? (
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {t("tenant")}
                    </div>
                    <Link
                      href={`/admin/billing/${tenant.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {tenant.name}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {tenant.slug}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">
                    {t("page")}
                  </div>
                  <a
                    href={reportData.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-medium hover:underline"
                  >
                    {reportData.pageUrl}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">
                    {t("viewport")}
                  </div>
                  <div className="font-medium">
                    {viewport?.w && viewport?.h
                      ? `${viewport.w} × ${viewport.h}`
                      : t("unknown")}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">
                    {t("created")}
                  </div>
                  <div className="font-medium">
                    {format(new Date(reportData.createdAt), "PPp")}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-xs text-muted-foreground">
                  {t("userAgent")}
                </div>
                <div className="mt-1 break-words font-mono text-[11px] text-muted-foreground">
                  {reportData.userAgent}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
