import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { adminDb } from "@/lib/db";

export async function sessionCallback({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}) {
  session.user.id = token.userId;
  session.user.tenantId = token.tenantId;
  session.user.level = token.level;
  session.user.emailVerified = token.emailVerified;
  session.user.uiLanguage = token.uiLanguage;
  session.user.contentLanguage = token.contentLanguage;
  session.user.image = (token.picture as string) ?? null;

  // Overlay session with impersonated user when admin has set the cookie
  if (token.level === "admin") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const impersonateCookie = cookieStore.get("1on1_impersonate");
      if (impersonateCookie?.value) {
        const targetUser = await adminDb.query.users.findFirst({
          where: (u, { eq, and }) =>
            and(
              eq(u.id, impersonateCookie.value),
              eq(u.tenantId, token.tenantId),
              eq(u.isActive, true)
            ),
        });
        if (targetUser && targetUser.level !== "admin") {
          session.user.impersonatedBy = {
            id: token.userId,
            name: (token.name as string) ?? "",
          };
          session.user.id = targetUser.id;
          session.user.level = targetUser.level;
          session.user.emailVerified = targetUser.emailVerified;
          session.user.uiLanguage = targetUser.language ?? "en";
          session.user.name = `${targetUser.firstName} ${targetUser.lastName}`;
          session.user.email = targetUser.email ?? "";
        }
      }
    } catch {
      // cookies() unavailable in this context (e.g. static generation) — skip
    }
  }

  return session;
}
