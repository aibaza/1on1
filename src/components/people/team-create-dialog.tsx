"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useZodI18nErrors } from "@/lib/i18n/zod-error-map";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTeamSchema } from "@/lib/validations/team";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type CreateTeamValues = z.infer<typeof createTeamSchema>;

interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  users: { id: string; firstName: string; lastName: string }[];
}

export function TeamCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  users,
}: TeamCreateDialogProps) {
  const t = useTranslations("teams");
  const { showApiError } = useApiErrorToast();
  useZodI18nErrors();
  const [leadOpen, setLeadOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const selectedLead = selectedLeadId
    ? users.find((u) => u.id === selectedLeadId)
    : null;

  async function onSubmit(data: CreateTeamValues) {
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          managerId: selectedLeadId || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create team");
      }

      toast.success(t("create.created"));
      reset();
      setSelectedLeadId(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      showApiError(error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          reset();
          setSelectedLeadId(null);
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>
            {t("create.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">{t("create.nameLabel")}</Label>
            <Input
              id="teamName"
              placeholder={t("create.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamDescription">{t("create.descriptionLabel")}</Label>
            <Textarea
              id="teamDescription"
              placeholder={t("create.descriptionPlaceholder")}
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("create.teamLead")}</Label>
            <Popover open={leadOpen} onOpenChange={setLeadOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={leadOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedLead
                      ? `${selectedLead.firstName} ${selectedLead.lastName}`
                      : t("create.selectLead")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("create.searchPlaceholder")} />
                  <CommandList>
                    <CommandEmpty>{t("create.noUserFound")}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setSelectedLeadId(null);
                          setValue("managerId", undefined);
                          setLeadOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !selectedLeadId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {t("create.none")}
                      </CommandItem>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.firstName} ${user.lastName}`}
                          onSelect={() => {
                            setSelectedLeadId(user.id);
                            setValue("managerId", user.id);
                            setLeadOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedLeadId === user.id
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("create.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("create.creating") : t("create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
