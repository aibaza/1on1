/**
 * Subtle background colors per role — work on both light and dark mode.
 * Muted pastels that don't compete with the avatar illustration.
 */
const ROLE_BG: Record<string, string> = {
  admin: "fddad6",    // soft red (error-container)
  manager: "fde8cd",  // soft orange (warm peach)
  member: "e6e8e9",   // soft gray (surface-container-high)
};

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
  if (uploadedUrl) return uploadedUrl;
  const seed = encodeURIComponent((avatarSeed || name).trim() || "unknown");
  const bg = role ? ROLE_BG[role] ?? ROLE_BG.member : ROLE_BG.member;
  return `/api/avatar/${seed}?bg=${bg}`;
}
