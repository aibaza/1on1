"use client";

import { useEffect, useRef } from "react";
import Markdown from "react-markdown";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Hide from the chat UI (e.g. synthetic seed messages) */
  hidden?: boolean;
  /** Exclude from the messages array sent to the AI (e.g. UI-language greeting) */
  hiddenFromAI?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatPanel({ messages, isLoading }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.filter((msg) => !msg.hidden).map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-muted text-foreground"
                  : "bg-transparent text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="text-sm">
                <Markdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    h1: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                    h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                    h3: ({ children }) => <p className="font-medium mb-0.5">{children}</p>,
                    code: ({ children }) => <code className="bg-muted rounded px-1 text-xs font-mono">{children}</code>,
                  }}
                >
                  {msg.content}
                </Markdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
