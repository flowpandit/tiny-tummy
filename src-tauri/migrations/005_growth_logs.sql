CREATE TABLE IF NOT EXISTS growth_logs (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    measured_at             TEXT NOT NULL,
    weight_kg               REAL,
    height_cm               REAL,
    head_circumference_cm   REAL,
    notes                   TEXT,
    created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_growth_logs_child_date ON growth_logs(child_id, measured_at DESC);
