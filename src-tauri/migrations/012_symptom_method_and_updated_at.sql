ALTER TABLE symptom_logs ADD COLUMN temperature_method TEXT;
ALTER TABLE symptom_logs ADD COLUMN updated_at TEXT;
ALTER TABLE episode_events ADD COLUMN source_kind TEXT;
ALTER TABLE episode_events ADD COLUMN source_id TEXT;

UPDATE symptom_logs
SET updated_at = created_at
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_episode_events_source ON episode_events(source_kind, source_id);
