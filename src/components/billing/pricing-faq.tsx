"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS: Array<{ q: "q1" | "q2" | "q3" | "q4"; a: "a1" | "a2" | "a3" | "a4" }> = [
  { q: "q1", a: "a1" },
  { q: "q2", a: "a2" },
  { q: "q3", a: "a3" },
  { q: "q4", a: "a4" },
];

export function PricingFaq() {
  const t = useTranslations("billing.pricing.faq");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold text-center text-foreground mb-10">
        {t("title")}
      </h2>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.q}
              className="rounded-xl border border-border/50 transition-colors hover:border-border"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-foreground">
                  {t(item.q)}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(item.a)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
