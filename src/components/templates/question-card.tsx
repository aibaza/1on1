"use client";

import { Pencil, Trash2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { QuestionData } from "./template-editor";

const answerTypeLabels: Record<string, string> = {
  text: "Text",
  rating_1_5: "Rating (1-5)",
  rating_1_10: "Rating (1-10)",
  yes_no: "Yes/No",
  multiple_choice: "Multiple Choice",
  mood: "Mood",
};

const categoryLabels: Record<string, string> = {
  check_in: "Check-in",
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  performance: "Performance",
  career: "Career",
  feedback: "Feedback",
  recognition: "Recognition",
  goals: "Goals",
  custom: "Custom",
};

interface QuestionCardProps {
  question: QuestionData;
  index: number;
  isReadOnly: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

export function QuestionCard({
  question,
  index,
  isReadOnly,
  onEdit,
  onRemove,
}: QuestionCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-4">
        {/* Sort order number */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {index + 1}
        </div>

        {/* Question content */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium leading-snug">
                {question.questionText}
                {question.isRequired && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </p>
              {question.helpText && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {question.helpText}
                </p>
              )}
            </div>

            {/* Actions */}
            {!isReadOnly && (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit question</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove question</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Question</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove this question? This
                        change takes effect when you save the template.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onRemove}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {answerTypeLabels[question.answerType] ?? question.answerType}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {categoryLabels[question.category] ?? question.category}
            </Badge>
            {question.conditionalOnQuestionId && (
              <Badge
                variant="outline"
                className="text-xs border-amber-300 text-amber-700 dark:text-amber-400"
              >
                <GitBranch className="mr-1 h-3 w-3" />
                Conditional
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
