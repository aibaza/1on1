"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useMutation } from "@tanstack/react-query";

interface NotesEditorProps {
  sessionId: string;
  category: string;
  initialSharedContent: string;
  initialPrivateContent: string;
  readOnly?: boolean;
  onSavingChange?: (saving: boolean) => void;
}

function EditorToolbar({
  editor,
  disabled,
  labels,
}: {
  editor: ReturnType<typeof useEditor> | null;
  disabled?: boolean;
  labels: { bold: string; italic: string; bulletList: string; orderedList: string; link: string; enterUrl: string };
}) {
  if (!editor) return null;

  const buttons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      label: labels.bold,
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      label: labels.italic,
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      label: labels.bulletList,
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      label: labels.orderedList,
    },
    {
      icon: LinkIcon,
      action: () => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = window.prompt(labels.enterUrl);
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }
      },
      active: editor.isActive("link"),
      label: labels.link,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border/20 px-2 py-2">
      {buttons.map(({ icon: Icon, action, active, label }) => (
        <button
          key={label}
          type="button"
          className={cn(
            "p-1.5 rounded transition-colors hover:bg-muted text-muted-foreground",
            active && "bg-muted text-foreground"
          )}
          onClick={action}
          disabled={disabled}
          title={label}
        >
          <Icon className="size-5" />
        </button>
      ))}
    </div>
  );
}

export function NotesEditor({
  sessionId,
  category,
  initialSharedContent,
  initialPrivateContent,
  readOnly,
  onSavingChange,
}: NotesEditorProps) {
  const t = useTranslations("sessions.wizard");
  const [activeTab, setActiveTab] = useState<string>("shared");
  const [sharedContent, setSharedContent] = useState(initialSharedContent);
  const [privateContent, setPrivateContent] = useState(initialPrivateContent);

  // Debounced values for auto-save
  const debouncedShared = useDebounce(sharedContent, 500);
  const debouncedPrivate = useDebounce(privateContent, 500);

  // Shared notes save mutation
  const saveShared = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, content }),
      });
      if (!res.ok) throw new Error("Failed to save shared notes");
      return res.json();
    },
    onMutate: () => onSavingChange?.(true),
    onSettled: () => onSavingChange?.(false),
  });

  // Private notes save mutation
  const savePrivate = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/notes/private`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, content }),
      });
      if (!res.ok) throw new Error("Failed to save private note");
      return res.json();
    },
    onMutate: () => onSavingChange?.(true),
    onSettled: () => onSavingChange?.(false),
  });

  // Auto-save debounced shared content
  const sharedInitRef = useState(false);
  useEffect(() => {
    if (!sharedInitRef[0]) {
      sharedInitRef[1](true);
      return;
    }
    if (debouncedShared !== initialSharedContent) {
      saveShared.mutate(debouncedShared);
    }
    // Safe: saveShared/initialSharedContent are stable (mutation object + prop from parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedShared]);

  // Auto-save debounced private content
  const privateInitRef = useState(false);
  useEffect(() => {
    if (!privateInitRef[0]) {
      privateInitRef[1](true);
      return;
    }
    if (debouncedPrivate !== initialPrivateContent) {
      savePrivate.mutate(debouncedPrivate);
    }
    // Safe: savePrivate/initialPrivateContent are stable (mutation object + prop from parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPrivate]);

  // Shared editor
  const sharedEditor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: initialSharedContent,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setSharedContent(editor.getHTML());
    },
  });

  // Private editor
  const privateEditor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: initialPrivateContent,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setPrivateContent(editor.getHTML());
    },
  });

  // Expose a flush method for beforeunload
  const flushSaves = useCallback(() => {
    if (sharedContent !== initialSharedContent) {
      navigator.sendBeacon(
        `/api/sessions/${sessionId}/notes`,
        new Blob(
          [JSON.stringify({ category, content: sharedContent })],
          { type: "application/json" }
        )
      );
    }
    if (privateContent !== initialPrivateContent) {
      navigator.sendBeacon(
        `/api/sessions/${sessionId}/notes/private`,
        new Blob(
          [JSON.stringify({ category, content: privateContent })],
          { type: "application/json" }
        )
      );
    }
  }, [sessionId, category, sharedContent, privateContent, initialSharedContent, initialPrivateContent]);

  // Register flush on visibilitychange
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushSaves();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [flushSaves]);

  const toolbarLabels = {
    bold: t("bold"),
    italic: t("italic"),
    bulletList: t("bulletList"),
    orderedList: t("orderedList"),
    link: t("link"),
    enterUrl: t("enterUrl"),
  };

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex border-b border-border/20">
        <button
          type="button"
          onClick={() => setActiveTab("shared")}
          className={cn(
            "px-6 py-3 text-sm font-bold transition-colors",
            activeTab === "shared"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {t("sharedNotes")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("private")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === "private"
              ? "text-primary border-b-2 border-primary font-bold"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <Lock className="size-3" />
          {t("privateNotes")}
        </button>
      </div>

      {/* Editor content */}
      {activeTab === "shared" && (
        <div className="p-6">
          <EditorToolbar editor={sharedEditor} disabled={readOnly} labels={toolbarLabels} />
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none min-h-[120px] [&_.tiptap]:outline-none [&_.tiptap]:min-h-[96px] mt-2">
            <EditorContent editor={sharedEditor} />
          </div>
        </div>
      )}

      {activeTab === "private" && (
        <div className="p-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Lock className="size-3" />
            <span>{t("onlyYouCanSee")}</span>
          </div>
          <EditorToolbar editor={privateEditor} disabled={readOnly} labels={toolbarLabels} />
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none min-h-[120px] [&_.tiptap]:outline-none [&_.tiptap]:min-h-[96px] mt-2">
            <EditorContent editor={privateEditor} />
          </div>
        </div>
      )}
    </div>
  );
}
