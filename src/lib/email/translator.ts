// src/lib/email/translator.ts
import { createTranslator } from "use-intl/core";
import { readFile } from "fs/promises";
import { join } from "path";

const SUPPORTED_LOCALES = ["en", "ro"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export async function createEmailTranslator(locale: string) {
  const safeLocale = isValidLocale(locale) ? locale : "en";
  const filePath = join(process.cwd(), "messages", safeLocale, "emails.json");
  const raw = await readFile(filePath, "utf-8");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = JSON.parse(raw) as Record<string, any>;
  return createTranslator({ locale: safeLocale, messages });
}
