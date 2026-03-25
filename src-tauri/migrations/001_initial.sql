CREATE TABLE IF NOT EXISTS children (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    date_of_birth   TEXT NOT NULL,
    feeding_type    TEXT NOT NULL DEFAULT 'breast',
    avatar_color    TEXT NOT NULL DEFAULT '#2563EB',
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poop_logs (
    id              TEXT PRIMARY KEY,
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    logged_at       TEXT NOT NULL,
    stool_type      INTEGER,
    color           TEXT,
    size            TEXT,
    is_no_poop      INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    photo_path      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_poop_logs_child_date ON poop_logs(child_id, logged_at);

CREATE TABLE IF NOT EXISTS diet_logs (
    id              TEXT PRIMARY KEY,
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    logged_at       TEXT NOT NULL,
    food_type       TEXT NOT NULL,
    food_name       TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diet_logs_child_date ON diet_logs(child_id, logged_at);

CREATE TABLE IF NOT EXISTS alerts (
    id              TEXT PRIMARY KEY,
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    alert_type      TEXT NOT NULL,
    severity        TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    is_dismissed    INTEGER NOT NULL DEFAULT 0,
    triggered_at    TEXT NOT NULL DEFAULT (datetime('now')),
    related_log_id  TEXT REFERENCES poop_logs(id)
);
CREATE INDEX IF NOT EXISTS idx_alerts_child ON alerts(child_id, is_dismissed, triggered_at);

CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
