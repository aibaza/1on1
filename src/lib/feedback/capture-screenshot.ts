/**
 * Client-only viewport screenshot helper.
 *
 * Uses html2canvas against `document.documentElement` to produce a PNG
 * data URL of the current viewport. Returns a string suitable for sending
 * to `POST /api/feedback` as `screenshotDataUrl`.
 *
 * Must only be called from a Client Component / browser context — importing
 * html2canvas lazily keeps it out of any server bundle that happens to
 * transitively import this file.
 */

export async function captureViewport(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("captureViewport() can only be called in the browser");
  }

  try {
    const html2canvas = (await import("html2canvas-pro")).default;

    const isDark = document.documentElement.classList.contains("dark");

    const canvas = await html2canvas(document.documentElement, {
      useCORS: true,
      logging: false,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: isDark ? "#0b0b0f" : "#ffffff",
    });

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("[feedback] captureViewport failed:", err);
    throw new Error("Could not capture screenshot");
  }
}
