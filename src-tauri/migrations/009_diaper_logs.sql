CREATE TABLE IF NOT EXISTS diaper_logs (
    id                  TEXT PRIMARY KEY,
    child_id            TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    logged_at           TEXT NOT NULL,
    diaper_type         TEXT NOT NULL,
    urine_color         TEXT,
    stool_type          INTEGER,
    color               TEXT,
    size                TEXT,
    notes               TEXT,
    photo_path          TEXT,
    linked_poop_log_id  TEXT REFERENCES poop_logs(id) ON DELETE SET NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_diaper_logs_child_date ON diaper_logs(child_id, logged_at);
