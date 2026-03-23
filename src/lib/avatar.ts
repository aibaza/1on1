/**
 * Returns an avatar URL: the user's uploaded avatar if available,
 * otherwise a locally-generated DiceBear avatar via /api/avatar/[seed].
 */
export function getAvatarUrl(
  name: string,
  uploadedUrl?: string | null
): string {
  if (uploadedUrl) return uploadedUrl;
  const seed = encodeURIComponent(name.trim() || "unknown");
  return `/api/avatar/${seed}`;
}
