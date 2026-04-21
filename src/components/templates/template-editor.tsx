"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  ArrowLeft,
  Plus,
  Save,
  Globe,
  GlobeLock,
  Star,
  Copy,
  Archive,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Wand2,
  MoreHorizontal,
  History,
} from "lucide-react";
import {
  createTemplateSchema,
  answerTypes,
} from "@/lib/validations/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { QuestionCard } from "./question-card";
import { QuestionForm } from "./question-form";
import { ExportButton } from "@/components/templates/export-button";
import { VersionHistoryTab } from "./version-history-tab";
import { canManageTemplates } from "@/lib/auth/rbac";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TemplateFormValues = z.infer<typeof createTemplateSchema>;

export interface QuestionData {
  id?: string;
  questionText: string;
  helpText: string | null;
  answerType: (typeof answerTypes)[number];
  answerConfig: Record<string, unknown>;
  isRequired: boolean;
  sortOrder: number;
  conditionalOnQuestionId?: string | null;
  conditionalOperator?: string | null;
  conditionalValue?: string | null;
  scoreWeight?: number;
  createdAt?: string;
}

export interface SectionData {
  id?: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  questions: QuestionData[];
}

interface LabelData {
  id: string;
  name: string;
  color: string | null;
}

// Server-returned question data
interface ServerQuestionData {
  id: string;
  questionText: string;
  helpText: string | null;
  sectionId: string;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  sortOrder: number;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
  scoreWeight: string | null;
  createdAt: string;
  templateId: string;
  isArchived: boolean;
}

interface ServerSectionData {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  questions: ServerQuestionData[];
}

interface TemplateData {
  id: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublished: boolean;
  isArchived: boolean;
  createdBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  labels: LabelData[];
  sections: ServerSectionData[];
}

function toQuestionData(q: ServerQuestionData): QuestionData {
  return {
    id: q.id,
    questionText: q.questionText,
    helpText: q.helpText,
    answerType: q.answerType as QuestionData["answerType"],
    answerConfig: (q.answerConfig as Record<string, unknown>) ?? {},
    isRequired: q.isRequired,
    sortOrder: q.sortOrder,
    conditionalOnQuestionId: q.conditionalOnQuestionId,
    conditionalOperator: q.conditionalOperator,
    conditionalValue: q.conditionalValue,
    scoreWeight: q.scoreWeight ? Number(q.scoreWeight) : 1,
    createdAt: q.createdAt,
  };
}

function toSectionData(s: ServerSectionData): SectionData {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    sortOrder: s.sortOrder,
    questions: s.questions.map(toQuestionData),
  };
}

interface TemplateEditorProps {
  template: TemplateData | null;
  userLevel: string;
}

export function TemplateEditor({ template, userLevel }: TemplateEditorProps) {
  const t = useTranslations("templates");
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isCreateMode = !template;
  const isReadOnly = userLevel === "member";
  const isAdminUser = userLevel === "admin";
  const canEdit = !isReadOnly;

  // Template metadata form
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
    },
  });

  // Sections state
  const [sections, setSections] = useState<SectionData[]>(
    template?.sections.map(toSectionData) ?? []
  );

  // Label selection state
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    template?.labels.map((l) => l.id) ?? []
  );

  // Fetch available labels
  const { data: availableLabels } = useQuery<LabelData[]>({
    queryKey: ["labels"],
    queryFn: async () => {
      const res = await fetch("/api/labels");
      if (!res.ok) throw new Error("Failed to fetch labels");
      return res.json();
    },
  });

  // Section editing
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [sectionNameInput, setSectionNameInput] = useState("");

  // Question form dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [editingQuestionSectionIndex, setEditingQuestionSectionIndex] = useState<number>(0);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i))
  );

  // Controlled archive dialog state (used by mobile overflow menu to avoid Radix focus-trap conflict)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Version history view state
  const [showHistory, setShowHistory] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, labelIds: selectedLabelIds }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create template");
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: async (newTemplate) => {
      if (sections.length > 0) {
        const formValues = getValues();
        await saveMutation.mutateAsync({
          templateId: newTemplate.id,
          body: {
            name: formValues.name,
            description: formValues.description || null,
            labelIds: selectedLabelIds,
            sections: sections.map((s, si) => ({
              ...s,
              sortOrder: si,
              questions: s.questions.map((q, qi) => ({
                ...q,
                sortOrder: qi,
              })),
            })),
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t("editor.saved"));
      router.push(`/templates/${newTemplate.id}`);
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  // Save (PATCH) mutation
  const saveMutation = useMutation({
    mutationFn: async ({ templateId, body }: { templateId: string; body: unknown }) => {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t("editor.saved"));
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}/publish`, { method: "PUT" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to toggle publish status");
      }
      return res.json() as Promise<{ isPublished: boolean }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(data.isPublished ? t("editor.publishedToast") : t("editor.unpublishedToast"));
      router.refresh();
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}/default`, { method: "PUT" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to set as default");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t("editor.defaultToast"));
      router.refresh();
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to duplicate template");
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t("editor.duplicatedToast"));
      router.push(`/templates/${data.id}`);
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to archive template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t("editor.archivedToast"));
      router.push("/templates");
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  // Save handler
  function onSave(data: TemplateFormValues) {
    if (isCreateMode) {
      createMutation.mutate(data);
    } else {
      saveMutation.mutate({
        templateId: template!.id,
        body: {
          name: data.name,
          description: data.description || null,
          labelIds: selectedLabelIds,
          sections: sections.map((s, si) => ({
            ...s,
            sortOrder: si,
            questions: s.questions.map((q, qi) => ({
              ...q,
              sortOrder: qi,
            })),
          })),
        },
      });
    }
  }

  // Section management
  const handleAddSection = useCallback(() => {
    setSections((prev) => [
      ...prev,
      { name: "New Section", sortOrder: prev.length, questions: [] },
    ]);
    setExpandedSections((prev) => new Set([...prev, sections.length]));
  }, [sections.length]);

  const handleRenameSection = useCallback((index: number, name: string) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, name } : s)));
  }, []);

  const handleRemoveSection = useCallback((index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
    setExpandedSections((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      }
      return next;
    });
  }, []);

  // Flatten all questions across sections for conditional logic
  const allQuestions: QuestionData[] = sections.flatMap((s) => s.questions);

  // Question management
  const handleAddQuestion = useCallback((sectionIndex: number) => {
    setEditingQuestion(null);
    setEditingQuestionIndex(null);
    setEditingQuestionSectionIndex(sectionIndex);
    setQuestionDialogOpen(true);
  }, []);

  const handleEditQuestion = useCallback(
    (sectionIndex: number, questionIndex: number, question: QuestionData) => {
      setEditingQuestion(question);
      setEditingQuestionIndex(questionIndex);
      setEditingQuestionSectionIndex(sectionIndex);
      setQuestionDialogOpen(true);
    },
    []
  );

  const handleRemoveQuestion = useCallback((sectionIndex: number, questionIndex: number) => {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIndex
          ? { ...s, questions: s.questions.filter((_, qi) => qi !== questionIndex) }
          : s
      )
    );
  }, []);

  const handleSaveQuestion = useCallback(
    (question: QuestionData) => {
      const sectionIdx = editingQuestionSectionIndex;
      if (editingQuestionIndex !== null) {
        setSections((prev) =>
          prev.map((s, si) =>
            si === sectionIdx
              ? {
                  ...s,
                  questions: s.questions.map((q, qi) =>
                    qi === editingQuestionIndex ? question : q
                  ),
                }
              : s
          )
        );
      } else {
        setSections((prev) =>
          prev.map((s, si) =>
            si === sectionIdx
              ? { ...s, questions: [...s.questions, { ...question, sortOrder: s.questions.length }] }
              : s
          )
        );
      }
      setQuestionDialogOpen(false);
      setEditingQuestion(null);
      setEditingQuestionIndex(null);
    },
    [editingQuestionSectionIndex, editingQuestionIndex]
  );

  // DnD within a section
  const handleDragEnd = useCallback(
    (sectionIndex: number) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setSections((prev) =>
        prev.map((s, si) => {
          if (si !== sectionIndex) return s;
          const oldIdx = s.questions.findIndex(
            (q) => (q.id ?? `new-${s.questions.indexOf(q)}`) === active.id
          );
          const newIdx = s.questions.findIndex(
            (q) => (q.id ?? `new-${s.questions.indexOf(q)}`) === over.id
          );
          if (oldIdx === -1 || newIdx === -1) return s;
          return { ...s, questions: arrayMove(s.questions, oldIdx, newIdx) };
        })
      );
    },
    []
  );

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleLabel = useCallback((labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  }, []);

  const isSaving = createMutation.isPending || saveMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("editor.backToTemplates")}
          </Link>
        </Button>

        {!isCreateMode && canEdit && (
          <>
            {/* DESKTOP layout: full button row (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-2">
              {canManageTemplates(userLevel) && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/templates/${template!.id}/ai-editor`}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {t("aiEditor.entryPoints.editWithAI")}
                  </Link>
                </Button>
              )}
              {canManageTemplates(userLevel) && (
                <ExportButton templateId={template!.id} variant="full" />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="mr-2 h-4 w-4" />
                {showHistory ? t("history.hideHistory") : t("history.showHistory")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                {template.isPublished ? (
                  <>
                    <GlobeLock className="mr-2 h-4 w-4" />
                    {t("editor.unpublish")}
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    {t("editor.publish")}
                  </>
                )}
              </Button>
              {isAdminUser && !template.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDefaultMutation.mutate()}
                  disabled={setDefaultMutation.isPending}
                >
                  <Star className="mr-2 h-4 w-4" />
                  {t("editor.setDefault")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
              >
                <Copy className="mr-2 h-4 w-4" />
                {t("editor.duplicate")}
              </Button>
              {/* Desktop: AlertDialog with inline trigger (unchanged) */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Archive className="mr-2 h-4 w-4" />
                    {t("editor.archive")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("editor.archiveTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("editor.archiveDesc", { name: template.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("editor.archiveCancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => archiveMutation.mutate()}
                      disabled={archiveMutation.isPending}
                    >
                      {archiveMutation.isPending ? t("editor.archiving") : t("editor.archiveConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* MOBILE layout: overflow menu (visible only below md) */}
            <div className="flex md:hidden items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManageTemplates(userLevel) && (
                    <DropdownMenuItem asChild>
                      <Link href={`/templates/${template!.id}/ai-editor`}>
                        <Wand2 className="mr-2 h-4 w-4" />
                        {t("aiEditor.entryPoints.editWithAI")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setShowHistory(!showHistory)}>
                    <History className="mr-2 h-4 w-4" />
                    {showHistory ? t("history.hideHistory") : t("history.showHistory")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                  >
                    {template.isPublished ? (
                      <>
                        <GlobeLock className="mr-2 h-4 w-4" />
                        {t("editor.unpublish")}
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        {t("editor.publish")}
                      </>
                    )}
                  </DropdownMenuItem>
                  {isAdminUser && !template.isDefault && (
                    <DropdownMenuItem
                      onSelect={() => setDefaultMutation.mutate()}
                      disabled={setDefaultMutation.isPending}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      {t("editor.setDefault")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => duplicateMutation.mutate()}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {t("editor.duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Archive: opens controlled AlertDialog — does NOT nest AlertDialogTrigger inside DropdownMenuItem */}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setArchiveDialogOpen(true)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {t("editor.archive")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Controlled AlertDialog — opened by mobile dropdown menu item */}
              <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("editor.archiveTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("editor.archiveDesc", { name: template.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("editor.archiveCancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => archiveMutation.mutate()}
                      disabled={archiveMutation.isPending}
                    >
                      {archiveMutation.isPending ? t("editor.archiving") : t("editor.archiveConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isCreateMode ? t("editor.newTemplate") : template.name}
        </h1>
        {!isCreateMode && (
          <p className="text-sm text-muted-foreground">
            {t("editor.version", { number: template.version })}
            {template.isDefault && ` - ${t("default")}`}
            {template.isPublished ? ` - ${t("published")}` : ` - ${t("draft")}`}
          </p>
        )}
      </div>

      <Separator />

      {/* Version history view (replaces form when active) */}
      {showHistory && !isCreateMode ? (
        <VersionHistoryTab templateId={template!.id} />
      ) : (
      /* Template metadata form */
      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("editor.nameLabel")}</Label>
            <Input
              id="name"
              placeholder={t("editor.namePlaceholder")}
              disabled={isReadOnly}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("editor.descLabel")}</Label>
            <Textarea
              id="description"
              placeholder={t("editor.descPlaceholder")}
              rows={3}
              disabled={isReadOnly}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>{t("editor.labelsLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {(availableLabels ?? []).map((label) => (
                <Badge
                  key={label.id}
                  variant={selectedLabelIds.includes(label.id) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  style={
                    label.color && selectedLabelIds.includes(label.id)
                      ? { backgroundColor: label.color, borderColor: label.color }
                      : label.color
                        ? { borderColor: label.color, color: label.color }
                        : undefined
                  }
                  onClick={() => !isReadOnly && toggleLabel(label.id)}
                >
                  {label.name}
                </Badge>
              ))}
              {(availableLabels ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("editor.noLabels")}
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("editor.sections")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("editor.sectionsSummary", { sections: sections.length, questions: allQuestions.length })}
              </p>
            </div>
            {canEdit && (
              <Button type="button" variant="outline" size="sm" onClick={handleAddSection}>
                <Plus className="mr-2 h-4 w-4" />
                {t("editor.addSection")}
              </Button>
            )}
          </div>

          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">
                {t("editor.noSections")}
              </p>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleAddSection}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("editor.addSection")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, sectionIndex) => {
                const isExpanded = expandedSections.has(sectionIndex);
                const sortableIds = section.questions.map(
                  (q, i) => q.id ?? `new-${i}`
                );

                return (
                  <Collapsible
                    key={section.id ?? `section-${sectionIndex}`}
                    open={isExpanded}
                    onOpenChange={() => toggleSection(sectionIndex)}
                  >
                    <div className="rounded-lg border">
                      {/* Section header */}
                      <div className="flex items-center gap-2 px-4 py-3">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </CollapsibleTrigger>

                        {editingSectionIndex === sectionIndex ? (
                          <Input
                            autoFocus
                            value={sectionNameInput}
                            onChange={(e) => setSectionNameInput(e.target.value)}
                            onBlur={() => {
                              if (sectionNameInput.trim()) {
                                handleRenameSection(sectionIndex, sectionNameInput.trim());
                              }
                              setEditingSectionIndex(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (sectionNameInput.trim()) {
                                  handleRenameSection(sectionIndex, sectionNameInput.trim());
                                }
                                setEditingSectionIndex(null);
                              }
                              if (e.key === "Escape") {
                                setEditingSectionIndex(null);
                              }
                            }}
                            className="h-7 text-sm font-semibold"
                          />
                        ) : (
                          <span className="flex-1 text-sm font-semibold">
                            {section.name}
                          </span>
                        )}

                        <Badge variant="secondary" className="text-xs">
                          {section.questions.length} Q
                        </Badge>

                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSectionIndex(sectionIndex);
                                setSectionNameInput(section.name);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("editor.removeSectionTitle")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("editor.removeSectionDesc", { name: section.name })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("editor.removeSectionCancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveSection(sectionIndex)}>
                                    {t("editor.removeSectionConfirm")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>

                      {/* Section content */}
                      <CollapsibleContent>
                        <div className="border-t px-4 py-3 space-y-3">
                          {section.questions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {t("editor.noQuestions")}
                            </p>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              modifiers={[restrictToVerticalAxis]}
                              onDragEnd={handleDragEnd(sectionIndex)}
                            >
                              <SortableContext
                                items={sortableIds}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-3">
                                  {section.questions.map((question, qIndex) => (
                                    <QuestionCard
                                      key={question.id ?? `new-${qIndex}`}
                                      question={question}
                                      index={qIndex}
                                      isReadOnly={isReadOnly}
                                      allQuestions={allQuestions}
                                      onEdit={() =>
                                        handleEditQuestion(sectionIndex, qIndex, question)
                                      }
                                      onRemove={() =>
                                        handleRemoveQuestion(sectionIndex, qIndex)
                                      }
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}

                          {canEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleAddQuestion(sectionIndex)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {t("editor.addQuestion")}
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        {/* Save button */}
        {canEdit && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving
                  ? t("editor.saving")
                  : isCreateMode
                    ? t("editor.createTemplate")
                    : t("editor.saveDraft")}
              </Button>
            </div>
          </>
        )}
      </form>
      )}

      {/* Question form dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? t("editor.editQuestion") : t("editor.addQuestionTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("editor.questionDesc")}
            </DialogDescription>
          </DialogHeader>
          <QuestionForm
            question={editingQuestion}
            questionIndex={editingQuestionIndex ?? allQuestions.length}
            allQuestions={allQuestions}
            onSave={handleSaveQuestion}
            onCancel={() => setQuestionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
