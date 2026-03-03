import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AuditLogClient } from "./audit-log-client";

export default async function AuditLogPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          Settings &gt; Audit Log
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          View all organizational changes and events
        </p>
      </div>

      <AuditLogClient />
    </div>
  );
}
