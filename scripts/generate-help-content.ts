/**
 * Generates src/lib/help/content-registry.ts from markdown files.
 * Run: npx tsx scripts/generate-help-content.ts
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const CONTENT_DIR = join(process.cwd(), "src/content/help");
const OUTPUT = join(process.cwd(), "src/lib/help/content-registry.ts");

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectMdFiles(full));
    } else if (entry.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

const locales = ["en", "ro"];
const entries: string[] = [];

for (const locale of locales) {
  const localeDir = join(CONTENT_DIR, locale);
  const files = collectMdFiles(localeDir);
  for (const file of files) {
    const rel = relative(localeDir, file).replace(/\.md$/, "").replace(/\\/g, "/");
    const content = readFileSync(file, "utf-8");
    // Escape backticks and ${} in template literals
    const escaped = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    entries.push(`  "${locale}/${rel}": \`${escaped}\`,`);
  }
}

const output = `// AUTO-GENERATED — do not edit. Run: npx tsx scripts/generate-help-content.ts
export const helpContent: Record<string, string> = {
${entries.join("\n")}
};
`;

writeFileSync(OUTPUT, output);
console.log(`Generated ${OUTPUT} with ${entries.length} entries`);
