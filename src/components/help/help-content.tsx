import { marked } from "marked";

interface HelpContentProps {
  content: string;
  locale: string;
}

export function HelpContent({ content, locale }: HelpContentProps) {
  // Rewrite bare image refs like `![alt](foo.jpg)` to locale-aware paths.
  // Light images are served by default; dark mode uses CSS to swap via
  // a <picture> element with prefers-color-scheme media query.
  const lightBase = `/help/screenshots/${locale}/light`;
  const darkBase = `/help/screenshots/${locale}/dark`;

  const html = marked.parse(content, { async: false }) as string;

  // Replace <img> tags with <picture> for dark mode support
  const withDarkMode = html.replace(
    /<img\s+src="([^"]+\.jpg)"\s+alt="([^"]*)"\s*\/?>/g,
    (_, src, alt) => {
      // If src is already absolute, leave it
      if (src.startsWith("/") || src.startsWith("http")) return `<img src="${src}" alt="${alt}" />`;
      return `<picture>
        <source srcset="${darkBase}/${src}" media="(prefers-color-scheme: dark)" />
        <img src="${lightBase}/${src}" alt="${alt}" loading="lazy" />
      </picture>`;
    }
  );

  // Safe to render — content is from our own markdown files, not user input.
  return (
    <article
      className="prose prose-neutral dark:prose-invert max-w-none
        prose-headings:font-headline prose-headings:tracking-tight
        prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-base prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-muted-foreground
        prose-li:text-[15px] prose-li:leading-relaxed prose-li:text-muted-foreground prose-li:my-1
        prose-strong:text-foreground prose-strong:font-semibold
        prose-img:rounded-xl prose-img:border prose-img:border-border/50 prose-img:shadow-sm prose-img:my-6
        prose-table:text-sm
        prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-th:py-2 prose-th:px-3 prose-th:bg-muted/50
        prose-td:py-2 prose-td:px-3 prose-td:text-muted-foreground
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-hr:my-8 prose-hr:border-border/50
        prose-ol:my-4 prose-ul:my-4"
      dangerouslySetInnerHTML={{ __html: withDarkMode }}
    />
  );
}
