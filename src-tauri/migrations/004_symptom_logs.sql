CREATE TABLE IF NOT EXISTS symptom_logs (
    id            TEXT PRIMARY KEY,
    child_id      TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    episode_id    TEXT REFERENCES episodes(id) ON DELETE SET NULL,
    symptom_type  TEXT NOT NULL,
    severity      TEXT NOT NULL,
    logged_at     TEXT NOT NULL,
    notes         TEXT,
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_symptom_logs_child_date ON symptom_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_episode ON symptom_logs(episode_id, logged_at DESC);
