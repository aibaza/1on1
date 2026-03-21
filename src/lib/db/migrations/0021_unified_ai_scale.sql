-- Migrate ai_assessment_score from 1-100 scale to 1-5 scale
-- Old: AI generated 1-100, session_score * 20 populated missing values
-- New: AI generates 1-5 (objectiveRating), all values on same 1-5 scale
UPDATE "session"
SET ai_assessment_score = ROUND(ai_assessment_score / 20.0)
WHERE ai_assessment_score IS NOT NULL;
