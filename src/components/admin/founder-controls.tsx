"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PLANS = ["free", "pro", "business"] as const;

interface FounderControlsProps {
  tenantId: string;
  isFounder: boolean;
  founderDiscountPct: number;
  plan: string;
}

export function FounderControls({
  tenantId,
  isFounder: initialIsFounder,
  founderDiscountPct: initialDiscount,
  plan: initialPlan,
}: FounderControlsProps) {
  const t = useTranslations("billing.admin.detail");
  const router = useRouter();
  const [isFounder, setIsFounder] = useState(initialIsFounder);
  const [discount, setDiscount] = useState(initialDiscount);
  const [plan, setPlan] = useState(initialPlan);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    isFounder !== initialIsFounder ||
    discount !== initialDiscount ||
    plan !== initialPlan;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/billing/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFounder,
          founderDiscountPct: isFounder ? discount : 0,
          plan,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to save founder controls:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="text-lg font-bold font-headline mb-4">
        {t("founder")}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {t("founderDescription")}
      </p>

      <div className="space-y-6">
        {/* Founder toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="founder-toggle">{t("founder")}</Label>
          <Switch
            id="founder-toggle"
            checked={isFounder}
            onCheckedChange={setIsFounder}
          />
        </div>

        {/* Discount slider (only shown when founder is on) */}
        {isFounder && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("discount")}</Label>
              <span className="text-sm font-bold font-headline">
                {discount}%
              </span>
            </div>
            <Input
              type="range"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              min={0}
              max={100}
              step={5}
              className="h-2 cursor-pointer"
            />
          </div>
        )}

        {/* Plan selector */}
        <div className="space-y-2">
          <Label>Plan</Label>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save with confirmation */}
        {hasChanges && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={saving} className="w-full">
                {saving ? "Saving..." : t("saveChanges")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm changes</AlertDialogTitle>
                <AlertDialogDescription>
                  This will update the tenant&apos;s founder status and billing
                  configuration. Are you sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
