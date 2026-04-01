import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ListChecks,
  BarChart3,
  Users,
  Settings,
  FileText,
  UserCircle,
} from "lucide-react";
import { helpNavigation, filterByRole } from "@/content/help/navigation";

const SECTION_ICONS: Record<string, typeof BookOpen> = {
  "getting-started": BookOpen,
  sessions: CalendarDays,
  "action-items": ListChecks,
  templates: FileText,
  analytics: BarChart3,
  people: Users,
  teams: Users,
  settings: Settings,
  account: UserCircle,
};

export default async function HelpPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.level as "admin" | "manager" | "member";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- help namespace added at runtime
  const t = (await getTranslations("help" as any)) as any;
  const sections = filterByRole(helpNavigation, role);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = SECTION_ICONS[section.slug] ?? BookOpen;
          const firstChild = section.children?.[0];
          const href = firstChild
            ? `/help/${firstChild.slug}`
            : `/help/${section.slug}`;

          return (
            <Link
              key={section.slug}
              href={href}
              className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-base font-bold font-headline group-hover:text-primary transition-colors">
                  {t(section.titleKey)}
                </h2>
              </div>
              {section.children && section.children.length > 0 && (
                <ul className="space-y-1">
                  {section.children.slice(0, 4).map((child) => (
                    <li
                      key={child.slug}
                      className="text-sm text-muted-foreground"
                    >
                      {t(child.titleKey)}
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
