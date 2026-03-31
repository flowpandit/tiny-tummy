CREATE TABLE IF NOT EXISTS sleep_logs (
    id              TEXT PRIMARY KEY,
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    sleep_type      TEXT NOT NULL,
    started_at      TEXT NOT NULL,
    ended_at        TEXT NOT NULL,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_child_start ON sleep_logs(child_id, started_at DESC);
