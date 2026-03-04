"use client";

import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef } from "react";

interface TextWidgetProps {
  value: string | null;
  onChange: (value: { answerText: string }) => void;
  disabled?: boolean;
}

export function TextWidget({ value, onChange, disabled }: TextWidgetProps) {
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
    <Textarea
      ref={textareaRef}
      value={value ?? ""}
      onChange={(e) => onChange({ answerText: e.target.value })}
      placeholder="Type your response..."
      disabled={disabled}
      className="min-h-[100px] resize-none"
      rows={3}
    />
  );
}
