CREATE TABLE IF NOT EXISTS episodes (
    id              TEXT PRIMARY KEY,
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    episode_type    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',
    started_at      TEXT NOT NULL,
    ended_at        TEXT,
    summary         TEXT,
    outcome         TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_episodes_child_status ON episodes(child_id, status, started_at);

CREATE TABLE IF NOT EXISTS episode_events (
    id              TEXT PRIMARY KEY,
    episode_id      TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    title           TEXT NOT NULL,
    notes           TEXT,
    logged_at       TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_episode_events_episode ON episode_events(episode_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_episode_events_child_date ON episode_events(child_id, logged_at);
