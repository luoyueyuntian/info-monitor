-- Event feedback table for tracking user feedback on event usefulness
-- Supports three feedback states: useful, noise, watch

CREATE TABLE IF NOT EXISTS event_feedback (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL CHECK (feedback IN ('useful', 'noise', 'watch')),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id)
);

-- Index for faster lookups by event_id
CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id ON event_feedback(event_id);

-- Index for querying by feedback type
CREATE INDEX IF NOT EXISTS idx_event_feedback_type ON event_feedback(feedback);
