"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCentsToEuro } from "@/lib/billing/metrics";

interface Customer {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isFounder: boolean;
  founderDiscountPct: number;
  createdAt: string;
  subscriptionStatus: string | null;
  mrrCents: number;
  seats: number;
  billingCycle: string | null;
}

interface CustomerListProps {
  customers: Customer[];
}

const STATUS_OPTIONS = [
  "all",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "founder",
] as const;

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">No sub</Badge>;

  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
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

export function CustomerList({ customers }: CustomerListProps) {
  const t = useTranslations("billing.admin");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      // Text search
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.slug.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      // Status filter
      if (statusFilter === "founder") return c.isFounder;
      if (statusFilter !== "all") return c.subscriptionStatus === statusFilter;
      return true;
    });
  }, [customers, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === "all" ? t("allStatuses") : opt.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 p-12 text-center">
          <p className="text-sm text-muted-foreground">{t("noCustomers")}</p>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customers")}</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/admin/billing/${customer.id}`)
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{customer.name}</span>
                      {customer.isFounder && (
                        <Badge variant="secondary" className="text-xs">
                          Founder
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {customer.slug}
                    </p>
                  </TableCell>
                  <TableCell className="capitalize">{customer.plan}</TableCell>
                  <TableCell>
                    <StatusBadge status={customer.subscriptionStatus} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCentsToEuro(customer.mrrCents)}
                  </TableCell>
                  <TableCell>{customer.seats}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(customer.createdAt).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
