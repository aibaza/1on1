"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransferSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  currentManagerId: string;
  currentManagerName: string;
  reportId: string;
  reportName: string;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  level?: string;
}

export function TransferSeriesDialog({
  open,
  onOpenChange,
  seriesId,
  currentManagerId,
  currentManagerName,
  reportId,
  reportName,
}: TransferSeriesDialogProps) {
  const t = useTranslations("sessions");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showApiError } = useApiErrorToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(
    null
  );

  const { data: usersList = [] } = useQuery<UserOption[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    enabled: open,
  });

  const managerOptions = usersList.filter(
    (u) =>
      u.id !== currentManagerId &&
      u.id !== reportId &&
      (u.level === "admin" || u.level === "manager")
  );

  const selectedManager = managerOptions.find(
    (u) => u.id === selectedManagerId
  );

  const transfer = useMutation({
    mutationFn: async (newManagerId: string) => {
      const res = await fetch(`/api/series/${seriesId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newManagerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to transfer series");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("transfer.successSingle"));
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
      setSelectedManagerId(null);
      router.refresh();
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  const handleSubmit = () => {
    if (!selectedManagerId) return;
    transfer.mutate(selectedManagerId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedManagerId(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("transfer.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("transfer.description", {
              report: reportName,
              currentManager: currentManagerName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("transfer.selectManager")}
            </label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="w-full justify-between"
                  disabled={transfer.isPending}
                >
                  <span className="truncate">
                    {selectedManager
                      ? `${selectedManager.firstName} ${selectedManager.lastName}`
                      : t("transfer.pickManagerPlaceholder")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput
                    placeholder={t("transfer.searchPlaceholder")}
                  />
                  <CommandList>
                    <CommandEmpty>{t("transfer.noUserFound")}</CommandEmpty>
                    <CommandGroup>
                      {managerOptions.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.firstName} ${user.lastName}`}
                          onSelect={() => {
                            setSelectedManagerId(user.id);
                            setPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedManagerId === user.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {user.firstName} {user.lastName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {t("transfer.warning")}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={transfer.isPending}
          >
            {t("transfer.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedManagerId || transfer.isPending}
          >
            {transfer.isPending
              ? t("transfer.transferring")
              : t("transfer.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
