import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ seed: string }> }
) {
  const { seed } = await params;

  const avatar = createAvatar(notionists, {
    seed: decodeURIComponent(seed),
    backgroundColor: ["transparent"],
  });

  const svg = avatar.toString();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
