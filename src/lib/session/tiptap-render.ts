import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

const TIPTAP_EXTENSIONS = [StarterKit, Link.configure({ openOnClick: false })];

/**
 * Converts a Tiptap note content value to an HTML string.
 * Handles two formats stored in the DB:
 *   - HTML string (new sessions — from editor.getHTML())
 *   - Tiptap JSON document object (older sessions saved as JSON)
 * Returns empty string for null/undefined/malformed input.
 */
export function contentToHtml(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object") {
    try {
      return generateHTML(
        content as Parameters<typeof generateHTML>[0],
        TIPTAP_EXTENSIONS
      );
    } catch {
      return "";
    }
  }
  return "";
}
