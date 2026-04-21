import "server-only";
import { put } from "@vercel/blob";

/**
 * Upload a PNG data URL to Vercel Blob under `feedback/{reportId}.png`.
 * The store is private; the returned URL is stored as a reference and
 * served to authorized users through `/api/feedback/screenshots/[id]`.
 */
export async function uploadScreenshotFromDataUrl(
  dataUrl: string,
  reportId: string
): Promise<string> {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) {
    throw new Error("Invalid data URL: missing comma separator");
  }
  const base64 = dataUrl.slice(commaIdx + 1);
  const buffer = Buffer.from(base64, "base64");

  const result = await put(`feedback/${reportId}.png`, buffer, {
    access: "private",
    contentType: "image/png",
    allowOverwrite: true,
  });

  return result.url;
}

export async function fetchScreenshotBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Blob fetch failed: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get("content-type") ?? "image/png",
  };
}
