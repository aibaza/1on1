import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    tenantId: string;
    level: string;
    emailVerified: Date | null;
    uiLanguage: string;
    contentLanguage: string;
  }
  interface Session {
    user: User & {
      id: string;
      tenantId: string;
      level: string;
      emailVerified: Date | null;
      uiLanguage: string;
      contentLanguage: string;
      impersonatedBy?: { id: string; name: string };
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string;
    level: string;
    userId: string;
    emailVerified: Date | null;
    uiLanguage: string;
    contentLanguage: string;
  }
}
