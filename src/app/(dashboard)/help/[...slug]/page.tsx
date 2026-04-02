import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { loadHelpContent } from "@/lib/help/load-content";
import { HelpSidebar } from "@/components/help/help-sidebar";
import { HelpContent } from "@/components/help/help-content";
import { getAllHelpPages } from "@/content/help/navigation";

interface HelpArticlePageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function HelpArticlePage({ params }: HelpArticlePageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const slugPath = slug.join("/");
  const role = session.user.level as "admin" | "manager" | "member";
  const locale = await getLocale();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- help namespace added at runtime
  const t = (await getTranslations("help" as any)) as any;

  // Verify this page exists and the role has access
  const allPages = getAllHelpPages();
  const page = allPages.find((p) => p.slug === slugPath);
  if (!page) notFound();
  if (page.roles && !page.roles.includes(role)) notFound();

  // Load markdown content (synchronous — pre-bundled at build time)
  const content = loadHelpContent(slugPath, locale);
  if (!content) notFound();

  return (
    <div className="flex gap-10">
      <HelpSidebar role={role} />

      <div className="flex-1 min-w-0 max-w-3xl">
        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          {t("backToHelp")}
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight font-headline mt-4 mb-8">
          {t(page.titleKey)}
        </h1>

        <HelpContent content={content} />
      </div>
    </div>
  );
}
