"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useZodI18nErrors } from "@/lib/i18n/zod-error-map";
import { X, Search, User, ChevronDown, Loader2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createTeamSchema } from "@/lib/validations/team";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type CreateTeamValues = z.infer<typeof createTeamSchema>;

interface EditorialTeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  users: { id: string; firstName: string; lastName: string }[];
}

export function EditorialTeamCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  users,
}: EditorialTeamCreateDialogProps) {
  const t = useTranslations("teams");
  const { showApiError } = useApiErrorToast();
  useZodI18nErrors();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDropdownOpen, setLeadDropdownOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "", description: "" },
  });

  const selectedLead = selectedLeadId
    ? users.find((u) => u.id === selectedLeadId)
    : null;

  const filteredUsers = users.filter((u) => {
    if (!leadSearch) return true;
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    return name.includes(leadSearch.toLowerCase());
  });

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

  function handleClose() {
    reset();
    setSelectedLeadId(null);
    setLeadSearch("");
    setLeadDropdownOpen(false);
    onOpenChange(false);
  }

  const inputClass =
    "w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-[var(--editorial-primary-container,var(--ring))] outline-none transition-all";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 gap-0 overflow-visible border-[var(--editorial-outline-variant,var(--border))]/10">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-headline font-bold text-foreground">{t("create.title")}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t("create.description")}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8 space-y-6">
          {/* Team Name */}
          <div className="space-y-2">
            <label className="block text-sm font-headline font-bold text-foreground">
              {t("create.nameLabel")} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t("create.namePlaceholder")}
              className={inputClass}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-headline font-bold text-foreground">
                {t("create.descriptionLabel")} <span className="text-muted-foreground font-normal">({t("create.optional")})</span>
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                  {t("create.descriptionTooltip")}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">{t("create.descriptionHint")}</p>
            <textarea
              placeholder={t("create.descriptionPlaceholder")}
              rows={4}
              className={`${inputClass} resize-none`}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Team Lead */}
          <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="block text-sm font-headline font-bold text-foreground">
              {t("create.teamLead")}
            </label>
            <div
              onClick={() => setLeadDropdownOpen(!leadDropdownOpen)}
              className={`${inputClass} flex items-center justify-between cursor-pointer hover:bg-[var(--editorial-surface-container-high,var(--accent))] transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className={selectedLead ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {selectedLead ? `${selectedLead.firstName} ${selectedLead.lastName}` : t("create.none")}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Dropdown */}
            {leadDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-[var(--editorial-outline-variant,var(--border))]/10 shadow-xl rounded-lg overflow-hidden z-[70]">
                <div className="px-4 py-2 bg-[var(--editorial-surface-container-low,var(--muted))]">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full bg-transparent border-none focus:ring-0 text-sm pl-8 py-1 outline-none"
                      placeholder={t("create.searchPlaceholder")}
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {/* None option */}
                  <div
                    onClick={() => {
                      setSelectedLeadId(null);
                      setValue("managerId", undefined);
                      setLeadDropdownOpen(false);
                      setLeadSearch("");
                    }}
                    className="px-4 py-2 hover:bg-[var(--editorial-surface-container-low,var(--muted))] flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">—</div>
                    <span className="text-sm">{t("create.none")}</span>
                  </div>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedLeadId(user.id);
                        setValue("managerId", user.id);
                        setLeadDropdownOpen(false);
                        setLeadSearch("");
                      }}
                      className="px-4 py-2 hover:bg-[var(--editorial-surface-container-low,var(--muted))] flex items-center gap-3 cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full bg-[var(--editorial-primary-container,var(--primary))] text-[10px] flex items-center justify-center text-primary-foreground font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <span className="text-sm">{user.firstName} {user.lastName}</span>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">{t("create.noUserFound")}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg border border-[var(--editorial-outline-variant,var(--border))] text-muted-foreground font-headline font-semibold hover:bg-[var(--editorial-surface-container-low,var(--muted))] transition-colors active:scale-[0.98]"
            >
              {t("create.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-primary to-[var(--editorial-primary-container,var(--primary))] text-primary-foreground font-headline font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center gap-3 disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? t("create.creating") : t("create.submit")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
