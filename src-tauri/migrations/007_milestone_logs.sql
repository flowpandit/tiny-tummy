CREATE TABLE IF NOT EXISTS milestone_logs (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_milestone_logs_child_logged_at
ON milestone_logs(child_id, logged_at DESC);
