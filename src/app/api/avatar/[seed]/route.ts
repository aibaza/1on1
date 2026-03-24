import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ seed: string }> }
) {
  const { seed } = await params;
  const url = new URL(req.url);
  const bg = url.searchParams.get("bg") || "transparent";

  const avatar = createAvatar(lorelei, {
    seed: decodeURIComponent(seed),
    backgroundColor: [bg],
  });

  const svg = avatar.toString();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
