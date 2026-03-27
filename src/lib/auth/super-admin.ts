const SUPERADMIN_EMAILS = (
  process.env.SUPERADMIN_EMAILS || "ciprian.dobrea@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase());

/**
 * Check if the given email belongs to a platform super-admin.
 * Super-admins can access cross-tenant billing administration.
 */
export function isSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email.toLowerCase());
}
