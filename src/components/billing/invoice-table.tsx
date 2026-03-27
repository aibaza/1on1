"use client";

import { useTranslations } from "next-intl";
import { Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Invoice {
  id: string;
  status: "draft" | "open" | "paid" | "past_due" | "canceled";
  currency: string;
  totalCents: number;
  invoicePdfUrl: string | null;
  createdAt: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function StatusBadge({
  status,
  t,
}: {
  status: Invoice["status"];
  t: ReturnType<typeof useTranslations>;
}) {
  const variants: Record<Invoice["status"], "default" | "secondary" | "destructive" | "outline"> = {
    paid: "default",
    open: "secondary",
    draft: "outline",
    past_due: "destructive",
    canceled: "outline",
  };

  const labels: Record<Invoice["status"], string> = {
    paid: t("paid"),
    open: t("open"),
    draft: t("open"),
    past_due: t("pastDue"),
    canceled: t("canceled"),
  };

  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const t = useTranslations("billing.settings");

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 p-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">{t("noInvoices")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("amount")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead className="text-right">{t("download")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="text-sm">
                {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {formatCurrency(invoice.totalCents, invoice.currency)}
              </TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} t={t} />
              </TableCell>
              <TableCell className="text-right">
                {invoice.invoicePdfUrl ? (
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={invoice.invoicePdfUrl}
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
  );
}
