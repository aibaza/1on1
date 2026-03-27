"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCentsToEuro } from "@/lib/billing/metrics";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  orgType: string;
  isFounder: boolean;
  founderDiscountPct: number;
  paddleCustomerId: string | null;
  billingEmail: string | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  status: string;
  billingCycle: string | null;
  seats: number;
  mrrCents: number;
  paddleSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  status: "draft" | "open" | "paid" | "past_due" | "canceled";
  currency: string;
  totalCents: number;
  subtotalCents: number;
  taxCents: number;
  invoicePdfUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface BillingEvent {
  id: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface CustomerDetailProps {
  tenant: Tenant;
  subscription: Subscription | null;
  invoices: Invoice[];
  events: BillingEvent[];
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    paid: "default",
    open: "secondary",
    draft: "outline",
    canceled: "outline",
    paused: "outline",
    unpaid: "destructive",
  };
  return (
    <Badge variant={variants[status] ?? "outline"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export function CustomerDetail({
  tenant,
  subscription,
  invoices,
  events,
}: CustomerDetailProps) {
  const t = useTranslations("billing.admin.detail");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Tenant Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-bold font-headline mb-4">
          {tenant.name}
        </h3>
        <div className="space-y-0">
          <InfoRow label="Slug" value={tenant.slug} />
          <InfoRow label="Plan" value={<span className="capitalize">{tenant.plan}</span>} />
          <InfoRow label="Org Type" value={<span className="capitalize">{tenant.orgType.replace("_", " ")}</span>} />
          <InfoRow
            label={t("founder")}
            value={
              tenant.isFounder ? (
                <Badge variant="secondary">
                  Founder ({tenant.founderDiscountPct}% off)
                </Badge>
              ) : (
                "No"
              )
            }
          />
          <InfoRow label="Billing Email" value={tenant.billingEmail ?? "-"} />
          <InfoRow label="Paddle ID" value={tenant.paddleCustomerId ?? "-"} />
          <InfoRow label="Created" value={formatDate(tenant.createdAt)} />
        </div>
      </div>

      {/* Subscription */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-bold font-headline mb-4">
          {t("subscription")}
        </h3>
        {subscription ? (
          <div className="space-y-0">
            <InfoRow label="Status" value={<StatusBadge status={subscription.status} />} />
            <InfoRow label="Cycle" value={subscription.billingCycle ?? "-"} />
            <InfoRow label="Seats" value={subscription.seats} />
            <InfoRow label="MRR" value={formatCentsToEuro(subscription.mrrCents)} />
            <InfoRow label="Paddle Sub ID" value={subscription.paddleSubscriptionId ?? "-"} />
            <InfoRow label="Current Period" value={`${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`} />
            <InfoRow label="Trial" value={subscription.trialStart ? `${formatDate(subscription.trialStart)} - ${formatDate(subscription.trialEnd)}` : "-"} />
            {subscription.canceledAt && (
              <InfoRow label="Canceled" value={formatDate(subscription.canceledAt)} />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noSubscription")}</p>
        )}
      </div>

      {/* Invoices */}
      <div className="rounded-xl border bg-card p-6 lg:col-span-2">
        <h3 className="text-lg font-bold font-headline mb-4">
          {t("invoices")}
        </h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">
                      {formatDate(inv.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCentsToEuro(inv.totalCents)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.invoicePdfUrl ? (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={inv.invoicePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Billing Events */}
      <div className="rounded-xl border bg-card p-6 lg:col-span-2">
        <h3 className="text-lg font-bold font-headline mb-4">
          {t("events")}
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-3 py-2 border-b last:border-b-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {evt.eventType.replace(/_/g, " ")}
                  </p>
                  {Object.keys(evt.metadata).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {JSON.stringify(evt.metadata)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(evt.createdAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
