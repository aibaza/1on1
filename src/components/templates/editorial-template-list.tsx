"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Plus, FileText, Wand2, Upload, MoreHorizontal, List, Sparkles, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { canManageTemplates } from "@/lib/auth/rbac";
import { ImportDialog } from "@/components/templates/import-dialog";
import { createTemplateSchema } from "@/lib/validations/template";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CreateTemplateValues = z.infer<typeof createTemplateSchema>;

interface LabelData {
  id: string;
  name: string;
  color: string | null;
}

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublished: boolean;
  isArchived: boolean;
  version: number;
  createdAt: string;
  questionCount: number;
  labels?: LabelData[];
}

interface EditorialTemplateListProps {
  initialTemplates: TemplateData[];
  currentUserRole: string;
  contentLanguage: string;
}

export function EditorialTemplateList({
  initialTemplates,
  currentUserRole,
  contentLanguage,
}: EditorialTemplateListProps) {
  const t = useTranslations("templates");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const canCreate = currentUserRole === "admin" || currentUserRole === "manager";
  const queryClient = useQueryClient();

  const { data: templates } = useQuery<TemplateData[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    initialData: initialTemplates,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTemplateValues) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create template");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("create.created"));
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: Error) => showApiError(e),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTemplateValues>({
    resolver: zodResolver(createTemplateSchema),
  });

  const onSubmit = (data: CreateTemplateValues) => createMutation.mutate(data);

  const filtered = templates.filter((t) => {
    if (filter === "published") return t.isPublished;
    if (filter === "draft") return !t.isPublished;
    return true;
  });

  return (
    <div className="space-y-10">
      {/* Action buttons (visible to managers/admins) */}
      {canCreate && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            {(["all", "published", "draft"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-white"
                    : "bg-[var(--editorial-surface-container-high,var(--accent))] text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? t("filterAll") : f === "published" ? t("published") : t("draft")}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-6 py-2.5 rounded-xl border border-[var(--editorial-outline-variant,var(--border))] text-primary font-headline font-bold hover:bg-[var(--editorial-surface-container-low,var(--muted))] transition-colors text-sm">
                  {t("import.button")}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("import.button")}
                </DropdownMenuItem>
                {canManageTemplates(currentUserRole) && (
                  <DropdownMenuItem asChild>
                    <Link href="/templates/ai-editor">
                      <Wand2 className="mr-2 h-4 w-4" />
                      {t("aiEditor.entryPoints.generateWithAI")}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="px-6 py-2.5 rounded-xl text-white font-headline font-bold shadow-md hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
            >
              <Plus className="h-4 w-4" />
              {t("createTemplate")}
            </button>
          </div>
        </div>
      )}

      {/* Template Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          heading={t("empty")}
          description={t("emptyDesc")}
          action={
            canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("createTemplate")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`}>
              <div className="group bg-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 border border-[var(--editorial-outline-variant,var(--border))]/50 h-full flex flex-col">
                {/* Icon + Status */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                    template.isPublished
                      ? "bg-[var(--editorial-tertiary,var(--color-success))]/15 text-[var(--editorial-tertiary,var(--color-success))]"
                      : "bg-[var(--editorial-surface-container-high,var(--accent))] text-muted-foreground"
                  }`}>
                    {template.isPublished ? t("published") : t("draft")}
                  </span>
                </div>

                {/* Name + Default badge */}
                <h3 className="font-headline font-bold text-xl mb-2 text-foreground flex items-center gap-2">
                  {template.name}
                  {template.isDefault && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-md uppercase tracking-wider">
                      {t("default")}
                    </span>
                  )}
                </h3>

                {/* Description */}
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{template.description}</p>
                )}

                {/* Labels */}
                {(template.labels ?? []).length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-6">
                    {template.labels!.map((label) => (
                      <span
                        key={label.id}
                        className="px-2 py-1 bg-[var(--editorial-surface-container,var(--muted))] text-[10px] font-bold text-muted-foreground rounded-md"
                        style={label.color ? { color: label.color } : undefined}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="mt-auto py-4 border-t border-[var(--editorial-outline-variant,var(--border))]/30 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <List className="h-3.5 w-3.5" />
                    {t("questionsCount", { count: template.questionCount })} · v{template.version}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {format.relativeTime(new Date(template.createdAt))}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-primary group-hover:underline">{t("edit")}</span>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          ))}

          {/* Create card */}
          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="group bg-[var(--background)] rounded-2xl p-6 border-2 border-dashed border-[var(--editorial-outline-variant,var(--border))]/30 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-[var(--editorial-surface-container-low,var(--muted))] transition-all duration-300 min-h-[280px]"
            >
              <div className="w-14 h-14 rounded-full bg-[var(--editorial-surface-container-high,var(--accent))] group-hover:bg-primary group-hover:text-white flex items-center justify-center text-muted-foreground transition-colors mb-4">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="font-headline font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {t("createTemplate")}
              </h3>
            </button>
          )}
        </div>
      )}

      {/* AI Banner */}
      {canCreate && (
        <section className="bg-card rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row items-center border-l-8 border-[var(--editorial-tertiary,var(--color-success))] border border-[var(--editorial-outline-variant,var(--border))]/50">
          <div className="p-8 md:p-10 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5" style={{ color: "var(--editorial-tertiary, var(--color-success))" }} />
              <span className="text-xs font-black uppercase tracking-widest font-headline" style={{ color: "var(--editorial-tertiary, var(--color-success))" }}>
                {t("aiEditor.intelligence")}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold font-headline mb-3">{t("aiEditor.title")}</h2>
            <p className="text-muted-foreground max-w-xl mb-8">{t("aiEditor.description")}</p>
            <Link
              href="/templates/ai-editor"
              className="inline-flex px-8 py-3 rounded-xl font-headline font-bold shadow-md hover:opacity-90 transition-opacity items-center gap-3 text-white"
              style={{ backgroundColor: "var(--editorial-tertiary, var(--color-success))" }}
            >
              {t("aiEditor.entryPoints.generateWithAI")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="w-full md:w-1/3 h-48 md:h-auto min-h-[200px] relative flex items-center justify-center" style={{ background: "var(--editorial-tertiary-fixed-dim, var(--color-success))", opacity: 0.1 }}>
            <Wand2 className="h-20 w-20 opacity-30" />
          </div>
        </section>
      )}

      {/* Import Dialog */}
      <ImportDialog
        currentUserRole={currentUserRole}
        contentLanguage={contentLanguage}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["templates"] })}
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      {/* Create Dialog */}
      {canCreate && (
        <Dialog open={createOpen} onOpenChange={(isOpen) => { if (!isOpen) reset(); setCreateOpen(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("create.title")}</DialogTitle>
              <DialogDescription>{t("create.description")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">{t("create.nameLabel")}</Label>
                <Input id="templateName" placeholder={t("create.namePlaceholder")} {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateDescription">{t("create.descLabel")}</Label>
                <Textarea id="templateDescription" placeholder={t("create.descPlaceholder")} rows={3} {...register("description")} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("create.cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("create.creating") : t("create.submit")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
