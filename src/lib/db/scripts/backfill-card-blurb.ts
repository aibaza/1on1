/**
 * Backfill cardBlurb for sessions that have ai_summary but no cardBlurb.
 * Generates the blurb from existing summary data (keyTakeaways + discussionHighlights).
 * Does NOT re-run the full pipeline and does NOT send emails.
 */
import { adminDb } from "../index";
import { sessions, tenants } from "../schema";
import { sql, eq } from "drizzle-orm";
import { generateText } from "ai";
import { models } from "@/lib/ai/models";
import type { AISummary } from "@/lib/ai/schemas/summary";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ro: "Romanian",
  de: "German",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
};

async function generateBlurb(summary: AISummary, language = "English"): Promise<string> {
  const highlights = summary.discussionHighlights
    .map((h) => `[${h.category}] ${h.summary}`)
    .join("\n");
  const takeaways = summary.keyTakeaways.join("; ");

  const { text } = await generateText({
    model: models.nudges,
    system: `You write concise one-on-one meeting summaries. Write in ${language}.`,
    prompt: `Based on these session takeaways and highlights, write a single 1-2 sentence plain-language blurb (max 25 words) suitable for a card preview. Be concrete, not generic.\n\nTakeaways: ${takeaways}\n\nHighlights:\n${highlights}\n\nBlurb:`,
  });

  return text.trim().replace(/^["']|["']$/g, "");
}

async function run() {
  // Find completed sessions with ai_summary but missing cardBlurb
  const rows = await adminDb
    .select({
      id: sessions.id,
      aiSummary: sessions.aiSummary,
      contentLanguage: tenants.contentLanguage,
    })
    .from(sessions)
    .innerJoin(tenants, eq(sessions.tenantId, tenants.id))
    .where(
      sql`${sessions.aiSummary} IS NOT NULL AND ${sessions.aiSummary}->>'cardBlurb' IS NULL AND ${sessions.status} = 'completed'`
    );

  if (rows.length === 0) {
    console.log("No sessions missing cardBlurb.");
    process.exit(0);
  }

  console.log(`Found ${rows.length} session(s) missing cardBlurb.`);

  for (const row of rows) {
    const summary = row.aiSummary as AISummary;
    const languageName = LANGUAGE_NAMES[row.contentLanguage] ?? row.contentLanguage;
    console.log(`  Generating blurb for session ${row.id} (language: ${languageName})...`);
    try {
      const blurb = await generateBlurb(summary, languageName);
      const updated = { ...summary, cardBlurb: blurb };
      await adminDb
        .update(sessions)
        .set({ aiSummary: updated, updatedAt: new Date() })
        .where(eq(sessions.id, row.id));
      console.log(`  ✓ ${row.id}: "${blurb}"`);
    } catch (err) {
      console.error(`  ✗ ${row.id}: failed —`, err);
    }
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
