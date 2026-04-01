"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ActionItemPersonGroup,
  type ActionItemEntry,
} from "./action-item-list";

export type { ActionItemEntry as SeriesActionItem };

interface ActionItemsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionItems: ActionItemEntry[];
  managerId: string;
  reportId: string;
  managerName: string;
  reportName: string;
  currentUserId?: string;
  onToggleActionItem?: (actionItemId: string, currentStatus: string) => void;
}

export function ActionItemsHistoryDialog({
  open,
  onOpenChange,
  actionItems,
  managerId,
  reportId,
  managerName,
  reportName,
  currentUserId,
  onToggleActionItem,
}: ActionItemsHistoryDialogProps) {
  const t = useTranslations("sessions");

  const reportItems = useMemo(
    () => actionItems.filter((ai) => ai.assigneeId === reportId),
    [actionItems, reportId]
  );
  const managerItems = useMemo(
    () => actionItems.filter((ai) => ai.assigneeId === managerId),
    [actionItems, managerId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {t("historyDialog.allActionItems")}
          </DialogTitle>
          <DialogDescription>
            {t("historyDialog.actionItemsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          {reportItems.length > 0 && (
            <ActionItemPersonGroup
              name={reportName}
              items={reportItems}
              showSessionGroups
              currentUserId={currentUserId}
              onToggle={onToggleActionItem}
            />
          )}
          {managerItems.length > 0 && (
            <ActionItemPersonGroup
              name={managerName}
              items={managerItems}
              defaultOpen={reportItems.length === 0}
              showSessionGroups
              currentUserId={currentUserId}
              onToggle={onToggleActionItem}
            />
          )}
          {reportItems.length === 0 && managerItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground italic">
              {t("context.noActionItems")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
