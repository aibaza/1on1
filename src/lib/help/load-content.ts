import { helpContent } from "./content-registry";

/**
 * Load markdown content for a help page.
 * Content is pre-bundled at build time via content-registry.ts.
 * Tries locale-specific content first, falls back to English.
 */
export function loadHelpContent(
  slug: string,
  locale: string
): string | null {
  // Try requested locale first, then fall back to English
  return (
    helpContent[`${locale}/${slug}`] ??
    helpContent[`en/${slug}`] ??
    null
  );
}
