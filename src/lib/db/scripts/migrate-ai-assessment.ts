import { adminDb } from "../index";
import { sql } from "drizzle-orm";
async function run() {
  await adminDb.execute(sql`ALTER TABLE "session" ADD COLUMN IF NOT EXISTS ai_assessment_score integer`);
  const r = await adminDb.execute(sql`UPDATE "session" SET ai_assessment_score = ROUND(session_score::numeric * 20) WHERE session_score IS NOT NULL AND ai_assessment_score IS NULL`);
  console.log("Done. Rows updated:", r.rowCount);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
