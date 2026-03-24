"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import type { TemplateExport } from "@/lib/templates/export-schema";
import type { ChatTurnResponse } from "@/lib/ai/schemas/template-chat";
import type { AiChatMessage, AiVersionSnapshot } from "@/lib/ai/editor-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { ChatInput } from "@/components/templates/ai-editor/chat-input";
import { TemplatePreviewPanel } from "@/components/templates/ai-editor/template-preview-panel";

interface AiEditorShellProps {
  initialTemplate?: TemplateExport;
  templateId?: string;
  contentLanguage: string;
  userLevel: string;
  initialChatHistory?: AiChatMessage[] | null;
  initialVersionHistory?: AiVersionSnapshot[] | null;
}

async function postAiChat(
  messages: AiChatMessage[],
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

function formatVersionTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiEditorShell({
  initialTemplate,
  templateId,
  contentLanguage: _contentLanguage,
  userLevel: _userLevel,
  initialChatHistory,
  initialVersionHistory,
}: AiEditorShellProps) {
  const t = useTranslations("templates");

  // Default greeting shown when there is no persisted conversation yet.
  const greetingText = initialTemplate
    ? t("aiEditor.chat.greetingExisting")
    : t("aiEditor.chat.greetingNew");

  const defaultMessages: AiChatMessage[] = [
    { role: "user", content: "__start__", hidden: true, hiddenFromAI: true },
    // Greeting is shown in the user's UI language but excluded from AI context
    // so it doesn't bias the AI towards the UI language instead of the company's content language.
    { role: "assistant", content: greetingText, hiddenFromAI: true },
  ];

  // Restore persisted conversation, or fall back to the default greeting.
  const [messages, setMessages] = useState<AiChatMessage[]>(
    initialChatHistory && initialChatHistory.length > 0
      ? initialChatHistory
      : defaultMessages
  );

  const [currentTemplate, setCurrentTemplate] = useState<TemplateExport | null>(
    initialTemplate ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(360);

  // Version history — one snapshot per AI-applied template change, labeled by timestamp.
  const [versions, setVersions] = useState<AiVersionSnapshot[]>(
    initialVersionHistory ?? []
  );
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number | null>(
    initialVersionHistory && initialVersionHistory.length > 0
      ? initialVersionHistory.length - 1
      : null
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

  // Fire-and-forget: persist chat history (and optionally a new version snapshot) to DB.
  function saveHistory(
    msgs: AiChatMessage[],
    newVersionTemplate?: TemplateExport
  ) {
    if (!templateId) return;
    void fetch(`/api/templates/${templateId}/ai-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: msgs,
        ...(newVersionTemplate ? { newVersion: { template: newVersionTemplate } } : {}),
      }),
    });
  }

  const chatMutation = useMutation({
    mutationFn: ({
      updatedMessages,
      template,
    }: {
      updatedMessages: AiChatMessage[];
      template: TemplateExport | null;
    }) => postAiChat(updatedMessages, template),
    onSuccess: (result) => {
      const assistantMsg: AiChatMessage = { role: "assistant", content: result.chatMessage };
      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        if (result.templateJson !== null) {
          saveHistory(next, result.templateJson);
        } else {
          saveHistory(next);
        }
        return next;
      });
      if (result.templateJson !== null) {
        setCurrentTemplate(result.templateJson);
        const snapshot: AiVersionSnapshot = {
          timestamp: new Date().toISOString(),
          template: result.templateJson,
        };
        setVersions((prev) => {
          const next = [...prev, snapshot];
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
    const updatedMessages: AiChatMessage[] = [
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
    setMessages((prev) => {
      const next: AiChatMessage[] = [
        ...prev,
        {
          role: "user",
          content: `[System context: user switched the template preview to version from ${formatVersionTimestamp(v.timestamp)}. This version is now the active template context.]`,
          hidden: true,
        },
      ];
      saveHistory(next);
      return next;
    });
  }

  function handleReset() {
    setMessages(defaultMessages);
    setCurrentTemplate(initialTemplate ?? null);
    setVersions([]);
    setSelectedVersionIdx(null);
    if (templateId) {
      void fetch(`/api/templates/${templateId}/ai-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: defaultMessages }),
      });
    }
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

      {/* Desktop layout: side-by-side panels with drag resize (lg and above) */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left: Template Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("aiEditor.preview.title")}
            </h2>
            {versions.length > 0 && (
              <select
                value={selectedVersionIdx ?? versions.length - 1}
                onChange={(e) => handleVersionSelect(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1 bg-background text-foreground cursor-pointer"
              >
                {versions.map((v, i) => (
                  <option key={i} value={i}>
                    {formatVersionTimestamp(v.timestamp)}
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

        {/* Right: Chat */}
        <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: chatWidth }}>
          <ChatPanel messages={messages} isLoading={isLoading} />
          <div className="border-t p-4 shrink-0">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>

      {/* Mobile layout: tab-based toggle between Preview and Chat (below lg) */}
      <div className="flex flex-col flex-1 overflow-hidden lg:hidden">
        <Tabs defaultValue="preview" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-4 mt-3 shrink-0">
            <TabsTrigger value="preview" className="flex-1">
              {t("aiEditor.preview.title")}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex-1">
              Chat
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="flex-1 overflow-y-auto p-4 mt-0">
            {versions.length > 0 && (
              <select
                value={selectedVersionIdx ?? versions.length - 1}
                onChange={(e) => handleVersionSelect(Number(e.target.value))}
                className="mb-3 text-xs border rounded px-2 py-1 bg-background text-foreground cursor-pointer w-full"
              >
                {versions.map((v, i) => (
                  <option key={i} value={i}>
                    {formatVersionTimestamp(v.timestamp)}
                  </option>
                ))}
              </select>
            )}
            <TemplatePreviewPanel template={currentTemplate} />
          </TabsContent>
          <TabsContent value="chat" className="flex flex-col flex-1 overflow-hidden mt-0">
            <ChatPanel messages={messages} isLoading={isLoading} />
            <div className="border-t p-4 shrink-0">
              <ChatInput onSend={handleSend} disabled={isLoading} />
            </div>
          </TabsContent>
        </Tabs>
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
