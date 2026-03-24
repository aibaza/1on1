import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { canManageTemplates } from "@/lib/auth/rbac";
import { AiEditorShell } from "@/components/templates/ai-editor/ai-editor-shell";

export default async function NewTemplateAiEditorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManageTemplates(session.user.level)) redirect("/templates");

  return (
    <AiEditorShell
      contentLanguage={session.user.contentLanguage ?? "en"}
      userLevel={session.user.level}
    />
  );
}
