CREATE TABLE IF NOT EXISTS quick_presets (
    id          TEXT PRIMARY KEY,
    child_id    TEXT NOT NULL,
    kind        TEXT NOT NULL,
    label       TEXT NOT NULL,
    description TEXT,
    draft_json  TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_enabled  INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quick_presets_child_kind_order
    ON quick_presets(child_id, kind, sort_order);
