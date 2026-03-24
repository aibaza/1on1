/**
 * Subtle background colors per role — work on both light and dark mode.
 * Muted pastels that don't compete with the avatar illustration.
 */
const ROLE_BG: Record<string, string> = {
  admin: "8b1a1a",    // dark scarlet red
  manager: "fde8cd",  // soft orange (warm peach)
  member: "e6e8e9",   // soft gray (surface-container-high)
};

// Bump this when changing avatar style or colors to bust browser cache
const AVATAR_VERSION = 2;

/**
 * Returns an avatar URL: the user's uploaded avatar if available,
 * otherwise a locally-generated DiceBear avatar via /api/avatar/[seed].
 *
 * If avatarSeed is provided, it's used as the seed (for regenerated avatars).
 * Otherwise, the user's name is used as a deterministic seed.
 *
 * If role is provided, a subtle background color is applied per role.
 */
export function getAvatarUrl(
  name: string,
  uploadedUrl?: string | null,
  avatarSeed?: string | null,
  role?: string | null
): string {
  const bg = role ? ROLE_BG[role] ?? ROLE_BG.member : ROLE_BG.member;

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
