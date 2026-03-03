import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { canManageTemplates } from "@/lib/auth/rbac";
import { TemplateEditor } from "@/components/templates/template-editor";

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canManageTemplates(session.user.role)) {
    redirect("/templates");
  }

  return (
    <TemplateEditor
      template={null}
      userRole={session.user.role}
    />
  );
}
