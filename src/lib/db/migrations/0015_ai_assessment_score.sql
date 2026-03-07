ALTER TABLE "session" ADD COLUMN IF NOT EXISTS ai_assessment_score integer;
UPDATE "session" SET ai_assessment_score = ROUND(session_score::numeric * 20) WHERE session_score IS NOT NULL AND ai_assessment_score IS NULL;
