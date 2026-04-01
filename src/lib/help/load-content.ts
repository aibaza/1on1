import { readFile } from "fs/promises";
import { join } from "path";

const CONTENT_DIR = join(process.cwd(), "src/content/help");

/**
 * Load markdown content for a help page.
 * Tries locale-specific file first, falls back to English.
 */
export async function loadHelpContent(
  slug: string,
  locale: string
): Promise<string | null> {
  const paths = [
    join(CONTENT_DIR, locale, `${slug}.md`),
    join(CONTENT_DIR, "en", `${slug}.md`), // fallback
  ];

  for (const path of paths) {
    try {
      return await readFile(path, "utf-8");
    } catch {
      continue;
    }
  }

  return null;
}
