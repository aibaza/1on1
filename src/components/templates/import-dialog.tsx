"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  templateImportSchema,
  formatImportErrors,
  derivePreviewStats,
} from "@/lib/templates/import-schema";
import type {
  ImportError,
  TemplateImportPayload,
} from "@/lib/templates/import-schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImportStep = "select" | "preview" | "error" | "conflict" | "success";

interface TemplateData {
  id: string;
  name: string;
}

interface ImportDialogProps {
  currentUserLevel: string;
  contentLanguage: string;
  onImportSuccess?: () => void;
  // Optional controlled state — when provided, parent controls open/close
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ImportDialog({
  currentUserLevel: _currentUserLevel,
  contentLanguage,
  onImportSuccess,
  open: controlledOpen,
  onOpenChange,
}: ImportDialogProps) {
  const t = useTranslations("templates");
  const queryClient = useQueryClient();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [step, setStep] = useState<ImportStep>("select");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedPayload, setParsedPayload] = useState<TemplateImportPayload | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [languageMismatch, setLanguageMismatch] = useState(false);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);
  const [importName, setImportName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates } = useQuery<TemplateData[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: false, // rely on existing cache only
  });

  function handleClose() {
    setOpen(false);
    setStep("select");
    setFileName(null);
    setParsedPayload(null);
    setImportErrors([]);
    setLanguageMismatch(false);
    setMismatchConfirmed(false);
    setImportName("");
    setRenameValue("");
    setCreatedId(null);
    setCreatedName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        setImportErrors([{ path: "root", message: t("import.error.notJson") }]);
        setStep("error");
        return;
      }
      // schemaVersion early check
      if (typeof raw === "object" && raw !== null && "schemaVersion" in raw) {
        const v = (raw as Record<string, unknown>).schemaVersion;
        if (v !== 1) {
          setImportErrors([
            {
              path: "schemaVersion",
              message: t("import.schemaVersionUnsupported", { version: String(v) }),
            },
          ]);
          setStep("error");
          return;
        }
      }
      const result = templateImportSchema.safeParse(raw);
      if (!result.success) {
        setImportErrors(formatImportErrors(result.error));
        setStep("error");
        return;
      }
      const payload = result.data;
      setParsedPayload(payload);
      setImportName(payload.name);
      const mismatch = payload.language !== contentLanguage;
      setLanguageMismatch(mismatch);
      setMismatchConfirmed(!mismatch);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  const importMutation = useMutation({
    mutationFn: async ({
      payload,
      name,
    }: {
      payload: TemplateImportPayload;
      name: string;
    }) => {
      const res = await fetch("/api/templates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, importName: name }),
      });
      const data = await res.json();
      if (res.status === 422) {
        throw { type: "validation", errors: data.errors as ImportError[] };
      }
      if (res.status === 409) {
        throw { type: "conflict", name: data.name as string };
      }
      if (!res.ok) {
        throw { type: "generic", message: data.error ?? t("import.failed") };
      }
      return data as { templateId: string; name: string };
    },
    onSuccess: (data) => {
      setCreatedId(data.templateId);
      setCreatedName(data.name);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      onImportSuccess?.();
    },
    onError: (error: unknown) => {
      const err = error as {
        type: string;
        errors?: ImportError[];
        name?: string;
        message?: string;
      };
      if (err.type === "validation") {
        setImportErrors(err.errors ?? []);
        setStep("error");
      } else if (err.type === "conflict") {
        setRenameValue((err.name ?? importName) + " (imported)");
        setStep("conflict");
      } else {
        toast.error(err.message ?? t("import.failed"));
      }
    },
  });

  function triggerImport(name: string) {
    if (!parsedPayload) return;
    importMutation.mutate({ payload: parsedPayload, name });
  }

  function handlePreviewConfirm() {
    const hasConflict = templates?.some(
      (tmpl) => tmpl.name.toLowerCase() === importName.toLowerCase()
    );
    if (hasConflict) {
      setRenameValue(importName + " (imported)");
      setStep("conflict");
    } else {
      triggerImport(importName);
    }
  }

  const stats = parsedPayload ? derivePreviewStats(parsedPayload) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else setOpen(true);
      }}
    >
      {/* Trigger: hidden file input + visible button */}
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-4 w-4 mr-2" />
        {t("import.button")}
      </Button>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("import.dialogTitle")}</DialogTitle>
        </DialogHeader>

        {/* Step: select */}
        {step === "select" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t("import.step1.description")}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("import.step1.browse")}
              </Button>
              {fileName && (
                <span className="text-sm text-muted-foreground truncate">
                  {t("import.step1.fileSelected", { name: fileName })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step: preview */}
        {step === "preview" && stats && parsedPayload && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t("import.step2.templateName")}</Label>
                <p className="font-medium">{stats.name}</p>
              </div>
              {stats.description && (
                <p className="text-sm text-muted-foreground">{stats.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">
                  {t("import.step2.sections", { count: stats.sectionCount })}
                </Badge>
                <Badge variant="secondary">
                  {t("import.step2.questions", { count: stats.questionCount })}
                </Badge>
              </div>
              {Object.keys(stats.typeCounts).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("import.step2.types")}</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(stats.typeCounts).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type} &times; {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {languageMismatch && !mismatchConfirmed && (
              <div className="rounded-md border border-yellow-500 bg-yellow-50 p-4 text-yellow-800">
                <p className="font-medium text-sm">{t("import.languageMismatch.title")}</p>
                <p className="text-sm mt-1">
                  {t("import.languageMismatch.message", {
                    fileLanguage: parsedPayload.language,
                    companyLanguage: contentLanguage,
                  })}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-600 text-yellow-800 hover:bg-yellow-100"
                    onClick={() => setMismatchConfirmed(true)}
                  >
                    {t("import.languageMismatch.proceed")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClose}
                  >
                    {t("import.languageMismatch.cancel")}
                  </Button>
                </div>
              </div>
            )}

            {(mismatchConfirmed || !languageMismatch) && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  {t("import.step2.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePreviewConfirm}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending
                    ? t("import.step2.importing")
                    : t("import.step2.importButton")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step: error */}
        {step === "error" && (
          <div className="space-y-4 py-2">
            <p className="font-medium text-destructive">{t("import.error.title")}</p>
            <ul className="max-h-48 overflow-y-auto space-y-1 text-sm border rounded p-3 bg-muted/40">
              {importErrors.slice(0, 10).map((e, i) => (
                <li key={i}>
                  <span className="font-mono text-xs text-muted-foreground">{e.path}:</span>{" "}
                  {e.message}
                </li>
              ))}
              {importErrors.length > 10 && (
                <li className="text-muted-foreground">
                  {t("import.error.tooManyErrors", { count: importErrors.length - 10 })}
                </li>
              )}
            </ul>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClose}>
                {t("import.error.close")}
              </Button>
            </div>
          </div>
        )}

        {/* Step: conflict */}
        {step === "conflict" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t("import.step3.message", { name: importName })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="renameInput">{t("import.step3.renameLabel")}</Label>
              <Input
                id="renameInput"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="sm" onClick={handleClose}>
                {t("import.step3.cancel")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const copyName = importName + " (copy)";
                  setImportName(copyName);
                  triggerImport(copyName);
                }}
                disabled={importMutation.isPending}
              >
                {t("import.step3.copyButton")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setImportName(renameValue);
                  triggerImport(renameValue);
                }}
                disabled={importMutation.isPending || !renameValue.trim()}
              >
                {t("import.step3.renameButton", { name: renameValue })}
              </Button>
            </div>
          </div>
        )}

        {/* Step: success */}
        {step === "success" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t("import.step4.message", { name: createdName ?? "" })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                {t("import.step4.close")}
              </Button>
              {createdId && (
                <Button size="sm" asChild>
                  <Link href={`/templates/${createdId}`}>
                    {t("import.step4.viewTemplate")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
