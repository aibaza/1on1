"use client";

import { useIsDarkMode } from "@/lib/hooks/use-dark-mode";
import { getAvatarUrl } from "@/lib/avatar";
import { AvatarImage } from "@/components/ui/avatar";

interface ThemedAvatarImageProps {
  name: string;
  uploadedUrl?: string | null;
  avatarSeed?: string | null;
  role?: string | null;
  alt?: string;
  className?: string;
}

/**
 * AvatarImage that automatically picks light/dark background color.
 * Drop-in replacement for <AvatarImage src={getAvatarUrl(...)} />.
 */
export function ThemedAvatarImage({
  name,
  uploadedUrl,
  avatarSeed,
  role,
  alt,
  className,
}: ThemedAvatarImageProps) {
  const isDark = useIsDarkMode();
  const src = getAvatarUrl(name, uploadedUrl, avatarSeed, role, isDark);

  return <AvatarImage src={src} alt={alt ?? name} className={className} />;
}
