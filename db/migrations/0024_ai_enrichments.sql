-- AI enrichments table for storing LLM-generated metadata on normalized records.
-- Each row represents one enrichment attempt (success or failure).

CREATE TABLE IF NOT EXISTS ai_enrichments (
  id            TEXT PRIMARY KEY,
  record_id     TEXT NOT NULL REFERENCES normalized_records(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,            -- 'claude', 'openai', 'local'
  model         TEXT NOT NULL DEFAULT '',
  summary       TEXT,
  sentiment     TEXT,                     -- 'bullish', 'bearish', 'neutral'
  impact        TEXT,                     -- 'high', 'medium', 'low'
  entities      JSONB DEFAULT '[]',
  raw_response  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_enrichments_record_id ON ai_enrichments(record_id);
CREATE INDEX IF NOT EXISTS idx_ai_enrichments_created_at ON ai_enrichments(created_at DESC);
