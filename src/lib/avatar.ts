/**
 * Background colors per role, split by theme.
 */
const ROLE_BG: Record<string, { light: string; dark: string }> = {
  admin:   { light: "c45c5c", dark: "8b1a1a" },   // scarlet red
  manager: { light: "d4652a", dark: "8b4513" },    // orange
  member:  { light: "93c572", dark: "4a6b2a" },    // pistachio green
};

// Bump this when changing avatar style or colors to bust browser cache
const AVATAR_VERSION = 3;

/**
 * Returns an avatar URL: the user's uploaded avatar if available,
 * otherwise a locally-generated DiceBear avatar via /api/avatar/[seed].
 *
 * If avatarSeed is provided, it's used as the seed (for regenerated avatars).
 * Otherwise, the user's name is used as a deterministic seed.
 *
 * If role is provided, a role-specific background color is applied.
 * If dark is provided, uses the dark-mode palette; otherwise light.
 */
export function getAvatarUrl(
  name: string,
  uploadedUrl?: string | null,
  avatarSeed?: string | null,
  role?: string | null,
  dark?: boolean
): string {
  const theme = dark ? "dark" : "light";
  const colors = role ? ROLE_BG[role] ?? ROLE_BG.member : ROLE_BG.member;
  const bg = colors[theme];

  // If uploadedUrl is an internal avatar path, rebuild with current bg color + version
  if (uploadedUrl?.startsWith("/api/avatar/")) {
    const seed = uploadedUrl.split("?")[0].replace("/api/avatar/", "");
    return `/api/avatar/${seed}?bg=${bg}&v=${AVATAR_VERSION}`;
  }

  // External uploaded URL (e.g. S3) — use as-is
  if (uploadedUrl) return uploadedUrl;

  const seed = encodeURIComponent((avatarSeed || name).trim() || "unknown");
  return `/api/avatar/${seed}?bg=${bg}&v=${AVATAR_VERSION}`;
}
