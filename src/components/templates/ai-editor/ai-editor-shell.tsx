"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import type { TemplateExport } from "@/lib/templates/export-schema";
import type { ChatTurnResponse } from "@/lib/ai/schemas/template-chat";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatPanel } from "@/components/templates/ai-editor/chat-panel";
import type { ChatMessage } from "@/components/templates/ai-editor/chat-panel";
import { ChatInput } from "@/components/templates/ai-editor/chat-input";
import { TemplatePreviewPanel } from "@/components/templates/ai-editor/template-preview-panel";

interface AiEditorShellProps {
  initialTemplate?: TemplateExport;
  templateId?: string;
  contentLanguage: string;
  userRole: string;
}

async function postAiChat(
  messages: ChatMessage[],
  currentTemplate: TemplateExport | null
): Promise<ChatTurnResponse> {
  // Strip hiddenFromAI messages before sending — prevents UI-language greeting
  // from contaminating the AI's language context.
  const aiMessages = messages.filter((m) => !m.hiddenFromAI);
  const res = await fetch("/api/templates/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: aiMessages, currentTemplate }),
  });
  if (!res.ok) {
    throw new Error(`AI chat failed: ${res.status}`);
  }
  return res.json() as Promise<ChatTurnResponse>;
}

export function AiEditorShell({
  initialTemplate,
  templateId,
  contentLanguage: _contentLanguage,
  userRole: _userRole,
}: AiEditorShellProps) {
  const t = useTranslations("templates");
  // Static welcome message shown instantly — no API call on mount.
  // The hidden synthetic user turn is prepended so the AI has the full
  // conversation context (including its own opening) on the first real turn.
  const greetingText = initialTemplate
    ? t("aiEditor.chat.greetingExisting")
    : t("aiEditor.chat.greetingNew");

  const initialMessages: ChatMessage[] = [
    { role: "user", content: "__start__", hidden: true, hiddenFromAI: true },
    // Greeting is shown in the user's UI language but excluded from AI context
    // so it doesn't bias the AI towards the UI language instead of the company's content language.
    { role: "assistant", content: greetingText, hiddenFromAI: true },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [currentTemplate, setCurrentTemplate] = useState<TemplateExport | null>(
    initialTemplate ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(360);

  // Version history — one entry per AI-applied template change
  const initialVersions = initialTemplate
    ? [{ label: "v1", template: initialTemplate }]
    : [];
  const [versions, setVersions] = useState<{ label: string; template: TemplateExport }[]>(initialVersions);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number | null>(
    initialTemplate ? 0 : null
  );
  const isDragging = useRef(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = chatWidth;

    function onMouseMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.min(600, Math.max(240, startWidth + delta));
      setChatWidth(newWidth);
    }

    function onMouseUp() {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [chatWidth]);

  const chatMutation = useMutation({
    mutationFn: ({
      updatedMessages,
      template,
    }: {
      updatedMessages: ChatMessage[];
      template: TemplateExport | null;
    }) => postAiChat(updatedMessages, template),
    onSuccess: (result) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.chatMessage },
      ]);
      if (result.templateJson !== null) {
        setCurrentTemplate(result.templateJson);
        setVersions((prev) => {
          const newLabel = `v${prev.length + 1}`;
          const next = [...prev, { label: newLabel, template: result.templateJson! }];
          setSelectedVersionIdx(next.length - 1);
          return next;
        });
      }
    },
    onError: () => {
      toast.error(t("aiEditor.chat.errorToast"));
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  function handleSend(userMessage: string) {
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);
    chatMutation.mutate({ updatedMessages, template: currentTemplate });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentTemplate) throw new Error("No template to save");

      const res = await fetch("/api/templates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: currentTemplate,
          importName: currentTemplate.name,
          // When editing an existing template, replace its content in-place
          ...(templateId ? { targetTemplateId: templateId } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string; conflict?: boolean; name?: string };
        throw new Error(data.error ?? "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("aiEditor.saveSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handleSave() {
    saveMutation.mutate();
  }

  function handleVersionSelect(idx: number) {
    const v = versions[idx];
    setSelectedVersionIdx(idx);
    setCurrentTemplate(v.template);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `[System context: user switched the template preview to ${v.label}. This version is now the active template context.]`,
        hidden: true,
      },
    ]);
  }

  function handleReset() {
    setMessages(initialMessages);
    setCurrentTemplate(initialTemplate ?? null);
    setVersions(initialVersions);
    setSelectedVersionIdx(initialTemplate ? 0 : null);
    setResetDialogOpen(false);
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header bar */}
      <header className="flex items-center justify-between border-b px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={templateId ? `/templates/${templateId}` : "/templates"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {templateId
                ? t("aiEditor.header.backToBuilder")
                : t("aiEditor.header.back")}
            </Link>
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {templateId
              ? t("aiEditor.header.editTemplate")
              : t("aiEditor.header.newTemplate")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("aiEditor.header.reset")}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={currentTemplate === null || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {t("aiEditor.header.save")}
          </Button>
        </div>
      </header>

      {/* Main split-screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Template Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("aiEditor.preview.title")}
            </h2>
            {versions.length > 1 && (
              <select
                value={selectedVersionIdx ?? versions.length - 1}
                onChange={(e) => handleVersionSelect(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1 bg-background text-foreground cursor-pointer"
              >
                {versions.map((v, i) => (
                  <option key={i} value={i}>
                    {v.label}
                    {v.template.name ? ` — ${v.template.name}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <TemplatePreviewPanel template={currentTemplate} />
        </div>

        {/* Drag handle */}
        <div
          className="w-1 shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
          onMouseDown={handleDragStart}
        />

        {/* Right: Chat — resizable column */}
        <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: chatWidth }}>
          <ChatPanel messages={messages} isLoading={isLoading} />
          <div className="border-t p-4 shrink-0">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>

      {/* Reset confirmation */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("aiEditor.resetConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("aiEditor.resetConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("aiEditor.resetConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              {t("aiEditor.resetConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
