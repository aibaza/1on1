"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { ArrowRightLeft, Check, ChevronsUpDown } from "lucide-react";
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

interface TransferAllSeriesDialogProps {
  fromManagerId: string;
  fromManagerName: string;
  activeSeriesCount: number;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  level?: string;
}

export function TransferAllSeriesDialog({
  fromManagerId,
  fromManagerName,
  activeSeriesCount,
}: TransferAllSeriesDialogProps) {
  const t = useTranslations("people");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showApiError } = useApiErrorToast();

  const [open, setOpen] = useState(false);
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
      u.id !== fromManagerId &&
      (u.level === "admin" || u.level === "manager")
  );

  const selectedManager = managerOptions.find(
    (u) => u.id === selectedManagerId
  );

  const transfer = useMutation({
    mutationFn: async (newManagerId: string) => {
      const res = await fetch(
        `/api/users/${fromManagerId}/transfer-managed-series`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newManagerId }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to transfer series");
      }
      return res.json();
    },
    onSuccess: (data: { transferred: number }) => {
      toast.success(
        t("transferAll.successBulk", { count: data.transferred })
      );
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
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

  if (activeSeriesCount === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
        {t("transferAll.button")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setSelectedManagerId(null);
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transferAll.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("transferAll.description", {
                count: activeSeriesCount,
                fromManager: fromManagerName,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("transferAll.selectManager")}
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
                        : t("transferAll.pickManagerPlaceholder")}
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
                      placeholder={t("transferAll.searchPlaceholder")}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {t("transferAll.noUserFound")}
                      </CommandEmpty>
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
              {t("transferAll.warning")}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={transfer.isPending}
            >
              {t("transferAll.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedManagerId || transfer.isPending}
            >
              {transfer.isPending
                ? t("transferAll.transferring")
                : t("transferAll.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
