/**
 * Returns an avatar URL: the user's uploaded avatar if available,
 * otherwise a locally-generated DiceBear avatar via /api/avatar/[seed].
 *
 * If avatarSeed is provided, it's used as the seed (for regenerated avatars).
 * Otherwise, the user's name is used as a deterministic seed.
 */
export function getAvatarUrl(
  name: string,
  uploadedUrl?: string | null,
  avatarSeed?: string | null
): string {
  if (uploadedUrl) return uploadedUrl;
  const seed = encodeURIComponent((avatarSeed || name).trim() || "unknown");
  return `/api/avatar/${seed}`;
}
