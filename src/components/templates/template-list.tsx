"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, FileText, Hash } from "lucide-react";
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
}

export function TemplateList({
  initialTemplates,
  currentUserRole,
}: TemplateListProps) {
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
      toast.success("Template created");
      setCreateOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create template"
      );
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
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No templates yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first template to get started.
          </p>
          {canCreate && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {template.name}
                    </CardTitle>
                    <div className="flex shrink-0 gap-1">
                      {template.isDefault && (
                        <Badge variant="default" className="text-xs">
                          Default
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
                        {template.questionCount} questions
                      </span>
                      <span>v{template.version}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={template.isPublished ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {template.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
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
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>
                Create a new questionnaire template for your 1:1 sessions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="e.g. Weekly Check-in"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateDescription">Description</Label>
                <Textarea
                  id="templateDescription"
                  placeholder="Describe what this template is for..."
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
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
