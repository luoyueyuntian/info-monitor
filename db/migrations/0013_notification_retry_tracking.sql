-- Add retry tracking columns to notifications table
ALTER TABLE notifications
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN last_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN next_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 3;

-- Index for finding notifications due for retry
CREATE INDEX idx_notifications_next_retry ON notifications (next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;
