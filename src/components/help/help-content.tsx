import { marked } from "marked";

interface HelpContentProps {
  content: string;
}

export function HelpContent({ content }: HelpContentProps) {
  // Rewrite image paths: relative refs like `en/foo.jpg` → `/help/screenshots/en/foo.jpg`
  const rewritten = content.replace(
    /!\[([^\]]*)\]\((?!\/|https?:\/\/)([^)]+)\)/g,
    "![$1](/help/screenshots/$2)"
  );

  // Safe to use dangerouslySetInnerHTML here — content is from our own
  // markdown files in src/content/help/, not from user input.
  const html = marked.parse(rewritten, { async: false }) as string;

  return (
    <article
      className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-headline prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-img:rounded-xl prose-img:border prose-img:border-border/50 prose-img:shadow-sm prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
