"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Plus, FileText, Hash, BookOpen, Wand2 } from "lucide-react";
import { canManageTemplates } from "@/lib/auth/rbac";
import { ExportButton } from "@/components/templates/export-button";
import { ImportDialog } from "@/components/templates/import-dialog";
import { createTemplateSchema } from "@/lib/validations/template";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface TemplateListProps {
  initialTemplates: TemplateData[];
  currentUserRole: string;
  contentLanguage: string;
}

export function TemplateList({
  initialTemplates,
  currentUserRole,
  contentLanguage,
}: TemplateListProps) {
  const t = useTranslations("templates");
  const { showApiError } = useApiErrorToast();
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate =
    currentUserRole === "admin" || currentUserRole === "manager";

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
        const json = await res.json();
        throw new Error(json.error || "Failed to create template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t("create.created"));
      setCreateOpen(false);
      reset();
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTemplateValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  function onSubmit(data: CreateTemplateValues) {
    createMutation.mutate(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/templates/schema">
          <Button variant="ghost" size="sm">
            <BookOpen className="mr-2 h-4 w-4" />
            {t("export.schemaLink")}
          </Button>
        </Link>
        {canCreate && (
          <div className="flex items-center gap-2">
            {canManageTemplates(currentUserRole) && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/templates/ai-editor">
                  <Wand2 className="mr-2 h-4 w-4" />
                  {t("aiEditor.entryPoints.generateWithAI")}
                </Link>
              </Button>
            )}
            <ImportDialog
              currentUserRole={currentUserRole}
              contentLanguage={contentLanguage}
              onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["templates"] })}
            />
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("createTemplate")}
            </Button>
          </div>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t("empty")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyDesc")}</p>
          {canCreate && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("createTemplate")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="relative group">
              <Link href={`/templates/${template.id}`}>
                <Card className="transition-colors hover:bg-accent/50 cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {template.name}
                      </CardTitle>
                      <div className="flex shrink-0 gap-1">
                        {template.isDefault && (
                          <Badge variant="default" className="text-xs">
                            {t("default")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {(template.labels ?? []).map((label) => (
                          <Badge
                            key={label.id}
                            variant="outline"
                            className="text-xs"
                            style={
                              label.color
                                ? { borderColor: label.color, color: label.color }
                                : undefined
                            }
                          >
                            {label.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {t("questionsCount", { count: template.questionCount })}
                        </span>
                        <span>v{template.version}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant={template.isPublished ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {template.isPublished ? t("published") : t("draft")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {canManageTemplates(currentUserRole) && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExportButton templateId={template.id} variant="icon" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canCreate && (
        <Dialog
          open={createOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              reset();
            }
            setCreateOpen(isOpen);
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("create.title")}</DialogTitle>
              <DialogDescription>{t("create.description")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">{t("create.nameLabel")}</Label>
                <Input
                  id="templateName"
                  placeholder={t("create.namePlaceholder")}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateDescription">{t("create.descLabel")}</Label>
                <Textarea
                  id="templateDescription"
                  placeholder={t("create.descPlaceholder")}
                  rows={3}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  {t("create.cancel")}
                </Button>
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
