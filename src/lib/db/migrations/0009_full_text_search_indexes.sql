-- GIN indexes for full-text search
-- Enables fast tsvector-based search on action items, talking points, and session answers

CREATE INDEX IF NOT EXISTS action_item_search_idx ON action_item
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS talking_point_search_idx ON talking_point
  USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS session_answer_text_search_idx ON session_answer
  USING gin(to_tsvector('english', coalesce(answer_text, '')));

-- Note: shared_notes is JSONB so GIN indexing on extracted text is complex.
-- At v1 data volumes, on-the-fly extraction for shared_notes search queries is acceptable.
