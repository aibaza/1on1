"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Save,
  Globe,
  GlobeLock,
  Star,
  Copy,
  Archive,
} from "lucide-react";
import {
  createTemplateSchema,
  templateCategories,
  questionCategories,
  answerTypes,
} from "@/lib/validations/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { QuestionCard } from "./question-card";
import { QuestionForm } from "./question-form";

const categoryLabels: Record<string, string> = {
  check_in: "Check-in",
  career: "Career",
  performance: "Performance",
  onboarding: "Onboarding",
  custom: "Custom",
};

type TemplateMetadata = z.infer<typeof createTemplateSchema>;

export interface QuestionData {
  id?: string;
  questionText: string;
  helpText: string | null;
  category: (typeof questionCategories)[number];
  answerType: (typeof answerTypes)[number];
  answerConfig: Record<string, unknown>;
  isRequired: boolean;
  sortOrder: number;
  conditionalOnQuestionId?: string | null;
  conditionalOperator?: string | null;
  conditionalValue?: string | null;
  createdAt?: string;
}

// Server-returned question data may include DB enum values beyond the client subset
interface ServerQuestionData {
  id: string;
  questionText: string;
  helpText: string | null;
  category: string;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  sortOrder: number;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
  createdAt: string;
  templateId: string;
  isArchived: boolean;
}

interface TemplateData {
  id: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  category: string;
  isDefault: boolean;
  isPublished: boolean;
  isArchived: boolean;
  createdBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  questions: ServerQuestionData[];
}

function toQuestionData(q: ServerQuestionData): QuestionData {
  return {
    id: q.id,
    questionText: q.questionText,
    helpText: q.helpText,
    category: q.category as QuestionData["category"],
    answerType: q.answerType as QuestionData["answerType"],
    answerConfig: (q.answerConfig as Record<string, unknown>) ?? {},
    isRequired: q.isRequired,
    sortOrder: q.sortOrder,
    conditionalOnQuestionId: q.conditionalOnQuestionId,
    conditionalOperator: q.conditionalOperator,
    conditionalValue: q.conditionalValue,
    createdAt: q.createdAt,
  };
}

interface TemplateEditorProps {
  template: TemplateData | null;
  userRole: string;
}

export function TemplateEditor({ template, userRole }: TemplateEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isCreateMode = !template;
  const isReadOnly = userRole === "member";
  const isAdminUser = userRole === "admin";
  const canEdit = !isReadOnly;

  // Template metadata form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateMetadata>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      category: (template?.category as TemplateMetadata["category"]) ?? "custom",
    },
  });

  const selectedCategory = watch("category");

  // Questions state (managed locally, saved in batch)
  const [questions, setQuestions] = useState<QuestionData[]>(
    template?.questions.map(toQuestionData) ?? []
  );

  // Question form dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(
    null
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateMetadata) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create template");
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: async (newTemplate) => {
      // If we have questions, save them via PATCH
      if (questions.length > 0) {
        const formValues = watch();
        await saveMutation.mutateAsync({
          templateId: newTemplate.id,
          body: {
            name: formValues.name,
            description: formValues.description || null,
            category: formValues.category,
            questions: questions.map((q, i) => ({
              ...q,
              sortOrder: i,
            })),
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template created");
      router.push(`/templates/${newTemplate.id}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create template"
      );
    },
  });

  // Save (PATCH) mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      templateId,
      body,
    }: {
      templateId: string;
      body: unknown;
    }) => {
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
      toast.success("Template saved");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template"
      );
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}/publish`, {
        method: "PUT",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to toggle publish status");
      }
      return res.json() as Promise<{ isPublished: boolean }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(
        data.isPublished ? "Template published" : "Template unpublished"
      );
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle publish"
      );
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}/default`, {
        method: "PUT",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to set as default");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template set as default");
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to set default"
      );
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to duplicate template");
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template duplicated");
      router.push(`/templates/${data.id}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to duplicate"
      );
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${template!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to archive template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template archived");
      router.push("/templates");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to archive"
      );
    },
  });

  // Save handler
  function onSave(data: TemplateMetadata) {
    if (isCreateMode) {
      createMutation.mutate(data);
    } else {
      saveMutation.mutate({
        templateId: template!.id,
        body: {
          name: data.name,
          description: data.description || null,
          category: data.category,
          questions: questions.map((q, i) => ({
            ...q,
            sortOrder: i,
          })),
        },
      });
    }
  }

  // Question management
  const handleAddQuestion = useCallback(() => {
    setEditingQuestion(null);
    setEditingIndex(null);
    setQuestionDialogOpen(true);
  }, []);

  const handleEditQuestion = useCallback((question: QuestionData, index: number) => {
    setEditingQuestion(question);
    setEditingIndex(index);
    setQuestionDialogOpen(true);
  }, []);

  const handleRemoveQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveQuestion = useCallback(
    (question: QuestionData) => {
      if (editingIndex !== null) {
        // Update existing
        setQuestions((prev) =>
          prev.map((q, i) => (i === editingIndex ? question : q))
        );
      } else {
        // Add new
        setQuestions((prev) => [
          ...prev,
          { ...question, sortOrder: prev.length },
        ]);
      }
      setQuestionDialogOpen(false);
      setEditingQuestion(null);
      setEditingIndex(null);
    },
    [editingIndex]
  );

  const isSaving =
    createMutation.isPending || saveMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>

        {/* Actions toolbar (edit mode only) */}
        {!isCreateMode && canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {template.isPublished ? (
                <>
                  <GlobeLock className="mr-2 h-4 w-4" />
                  Unpublish
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Publish
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
                Set as Default
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to archive &quot;{template.name}
                    &quot;? It will be hidden from the active list but
                    historical session data will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => archiveMutation.mutate()}
                    disabled={archiveMutation.isPending}
                  >
                    {archiveMutation.isPending ? "Archiving..." : "Archive"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isCreateMode ? "New Template" : template.name}
        </h1>
        {!isCreateMode && (
          <p className="text-sm text-muted-foreground">
            Version {template.version}
            {template.isDefault && " - Default"}
            {template.isPublished ? " - Published" : " - Draft"}
          </p>
        )}
      </div>

      <Separator />

      {/* Template metadata form */}
      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="e.g. Weekly Check-in"
              disabled={isReadOnly}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this template is for..."
              rows={3}
              disabled={isReadOnly}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) =>
                setValue(
                  "category",
                  value as TemplateMetadata["category"]
                )
              }
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {templateCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Questions section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Questions</h2>
              <p className="text-sm text-muted-foreground">
                {questions.length} question{questions.length !== 1 ? "s" : ""}
              </p>
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            )}
          </div>

          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">
                No questions yet. Add your first question to get started.
              </p>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleAddQuestion}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id ?? `new-${index}`}
                  question={question}
                  index={index}
                  isReadOnly={isReadOnly}
                  onEdit={() => handleEditQuestion(question, index)}
                  onRemove={() => handleRemoveQuestion(index)}
                />
              ))}
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
                  ? "Saving..."
                  : isCreateMode
                    ? "Create Template"
                    : "Save Draft"}
              </Button>
            </div>
          </>
        )}
      </form>

      {/* Question form dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add Question"}
            </DialogTitle>
            <DialogDescription>
              Configure the question details and answer type.
            </DialogDescription>
          </DialogHeader>
          <QuestionForm
            question={editingQuestion}
            onSave={handleSaveQuestion}
            onCancel={() => setQuestionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
