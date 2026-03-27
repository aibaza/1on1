"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#methodology", label: "Methodology" },
  { href: "#pricing", label: "Pricing" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-foreground"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="absolute top-20 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border/50 shadow-lg z-50">
          <div className="flex flex-col px-8 py-6 gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-[family-name:var(--font-manrope)] text-sm font-medium text-foreground/80 hover:text-foreground transition-colors py-2"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-border/30" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="font-[family-name:var(--font-manrope)] text-sm font-medium text-foreground/80 hover:text-foreground transition-colors py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="editorial-gradient text-white px-6 py-3 rounded-lg font-[family-name:var(--font-manrope)] text-sm font-medium text-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
