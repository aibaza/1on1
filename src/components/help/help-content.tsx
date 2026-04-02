import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

interface HelpContentProps {
  content: string;
}

export function HelpContent({ content }: HelpContentProps) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-headline prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-img:rounded-xl prose-img:border prose-img:border-border/50 prose-img:shadow-sm prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") return null;
            const imgSrc = src.startsWith("/") ? src : `/help/screenshots/${src}`;
            return (
              <Image
                src={imgSrc}
                alt={alt ?? ""}
                width={800}
                height={450}
                className="rounded-xl border border-border/50 shadow-sm"
                unoptimized
              />
            );
          },
          // Wrap tables for horizontal scroll
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          // Add step numbering styling
          ol: ({ children }) => (
            <ol className="[counter-reset:step] [&>li]:relative [&>li]:pl-10 [&>li]:[counter-increment:step] [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-0.5 [&>li]:before:flex [&>li]:before:size-7 [&>li]:before:items-center [&>li]:before:justify-center [&>li]:before:rounded-full [&>li]:before:bg-primary/10 [&>li]:before:text-xs [&>li]:before:font-bold [&>li]:before:text-primary [&>li]:before:content-[counter(step)]">
              {children}
            </ol>
          ),
        }}
      />
    </article>
  );
}
