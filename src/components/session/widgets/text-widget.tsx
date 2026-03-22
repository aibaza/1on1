"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

interface TextWidgetProps {
  value: string | null;
  onChange: (value: { answerText: string }) => void;
  disabled?: boolean;
}

export function TextWidget({ value, onChange, disabled }: TextWidgetProps) {
  const t = useTranslations("sessions.wizard");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value ?? ""}
      onChange={(e) => onChange({ answerText: e.target.value })}
      placeholder={t("typeResponse")}
      disabled={disabled}
      className="w-full min-h-[120px] border-none focus:ring-0 text-foreground placeholder-muted-foreground/40 resize-none bg-transparent text-sm leading-relaxed disabled:opacity-50"
      rows={4}
    />
  );
}
