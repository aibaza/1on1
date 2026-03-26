import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { adminDb } from "@/lib/db";
import { signInSchema } from "@/lib/validations/auth";

export const credentialsProvider = Credentials({
  credentials: {
    email: { type: "email" },
    password: { type: "password" },
  },
  authorize: async (credentials) => {
    const { email, password } =
      await signInSchema.parseAsync(credentials);

    // Look up user by email (no tenant context during login)
    const user = await adminDb.query.users.findFirst({
      where: (u, { eq, and }) =>
        and(eq(u.email, email), eq(u.isActive, true)),
    });

    if (!user || !user.passwordHash) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    // Fetch tenant for content language (stored in settings.preferredLanguage JSONB)
    const tenant = await adminDb.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, user.tenantId),
      columns: { settings: true },
    });
    const tenantSettings = (tenant?.settings ?? {}) as Record<string, unknown>;

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      image: user.avatarUrl ?? null,
      tenantId: user.tenantId,
      level: user.level,
      emailVerified: user.emailVerified,
      uiLanguage: user.language ?? "en",
      contentLanguage: (tenantSettings.preferredLanguage as string | undefined) ?? "en",
    };
  },
});
