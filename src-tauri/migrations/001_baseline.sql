CREATE TABLE IF NOT EXISTS children (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    date_of_birth   TEXT NOT NULL,
    sex             TEXT,
    feeding_type    TEXT NOT NULL DEFAULT 'breast',
    avatar_color    TEXT NOT NULL DEFAULT '#2563EB',
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at      TEXT,
    device_id       TEXT,
    sync_status     TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version    INTEGER NOT NULL DEFAULT 1,
    local_only      INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_children_active_created
    ON children(is_active, deleted_at, created_at);
CREATE INDEX IF NOT EXISTS idx_children_updated_at
    ON children(updated_at);
CREATE INDEX IF NOT EXISTS idx_children_sync
    ON children(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS caregivers (
    id              TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    role            TEXT NOT NULL,
    relationship    TEXT,
    email           TEXT,
    phone           TEXT,
    avatar_color    TEXT,
    is_primary      INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at      TEXT,
    device_id       TEXT,
    sync_status     TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version    INTEGER NOT NULL DEFAULT 1,
    local_only      INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_caregivers_deleted
    ON caregivers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_caregivers_sync
    ON caregivers(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS child_caregivers (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    caregiver_id            TEXT NOT NULL,
    relationship_to_child   TEXT,
    permissions             TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (caregiver_id) REFERENCES caregivers(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_caregivers_active_unique
    ON child_caregivers(child_id, caregiver_id)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_child_caregivers_child
    ON child_caregivers(child_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_child_caregivers_caregiver
    ON child_caregivers(caregiver_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_child_caregivers_sync
    ON child_caregivers(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS poop_logs (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    logged_at               TEXT NOT NULL,
    stool_type              INTEGER,
    color                   TEXT,
    size                    TEXT,
    is_no_poop              INTEGER NOT NULL DEFAULT 0 CHECK (is_no_poop IN (0, 1)),
    notes                   TEXT,
    photo_path              TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_poop_logs_child_date
    ON poop_logs(child_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_poop_logs_child_real_date
    ON poop_logs(child_id, is_no_poop, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_poop_logs_updated_at
    ON poop_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_poop_logs_sync
    ON poop_logs(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS diet_logs (
    id                          TEXT PRIMARY KEY,
    child_id                    TEXT NOT NULL,
    logged_at                   TEXT NOT NULL,
    food_type                   TEXT NOT NULL,
    food_name                   TEXT,
    notes                       TEXT,
    amount_ml                   INTEGER,
    duration_minutes            INTEGER,
    breast_side                 TEXT,
    bottle_content              TEXT,
    reaction_notes              TEXT,
    is_constipation_support     INTEGER NOT NULL DEFAULT 0 CHECK (is_constipation_support IN (0, 1)),
    created_by_caregiver_id     TEXT,
    updated_by_caregiver_id     TEXT,
    created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at                  TEXT,
    device_id                   TEXT,
    sync_status                 TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version                INTEGER NOT NULL DEFAULT 1,
    local_only                  INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_diet_logs_child_date
    ON diet_logs(child_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_diet_logs_updated_at
    ON diet_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_diet_logs_sync
    ON diet_logs(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS episodes (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    episode_type            TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'active',
    started_at              TEXT NOT NULL,
    ended_at                TEXT,
    summary                 TEXT,
    outcome                 TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_episodes_child_status
    ON episodes(child_id, status, deleted_at, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_child_range
    ON episodes(child_id, deleted_at, started_at, ended_at);
CREATE INDEX IF NOT EXISTS idx_episodes_updated_at
    ON episodes(updated_at);
CREATE INDEX IF NOT EXISTS idx_episodes_sync
    ON episodes(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS episode_events (
    id                      TEXT PRIMARY KEY,
    episode_id              TEXT NOT NULL,
    child_id                TEXT NOT NULL,
    event_type              TEXT NOT NULL,
    title                   TEXT NOT NULL,
    notes                   TEXT,
    logged_at               TEXT NOT NULL,
    source_kind             TEXT,
    source_id               TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (episode_id) REFERENCES episodes(id),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_episode_events_episode
    ON episode_events(episode_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_events_child_date
    ON episode_events(child_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_events_source
    ON episode_events(source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_episode_events_updated_at
    ON episode_events(updated_at);
CREATE INDEX IF NOT EXISTS idx_episode_events_sync
    ON episode_events(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS symptom_logs (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    episode_id              TEXT,
    symptom_type            TEXT NOT NULL,
    severity                TEXT NOT NULL,
    temperature_c           REAL,
    temperature_method      TEXT,
    logged_at               TEXT NOT NULL,
    notes                   TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_symptom_logs_child_date
    ON symptom_logs(child_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_episode
    ON symptom_logs(episode_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_updated_at
    ON symptom_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_sync
    ON symptom_logs(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS growth_logs (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    measured_at             TEXT NOT NULL,
    weight_kg               REAL,
    height_cm               REAL,
    head_circumference_cm   REAL,
    notes                   TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_growth_logs_child_date
    ON growth_logs(child_id, deleted_at, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_logs_updated_at
    ON growth_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_growth_logs_sync
    ON growth_logs(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS sleep_logs (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    sleep_type              TEXT NOT NULL,
    started_at              TEXT NOT NULL,
    ended_at                TEXT NOT NULL,
    notes                   TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_child_start
    ON sleep_logs(child_id, deleted_at, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_child_end
    ON sleep_logs(child_id, deleted_at, ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_updated_at
    ON sleep_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_sync
    ON sleep_logs(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS milestone_logs (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    milestone_type          TEXT NOT NULL,
    logged_at               TEXT NOT NULL,
    notes                   TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_milestone_logs_child_logged_at
    ON milestone_logs(child_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_logs_updated_at
    ON milestone_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_milestone_logs_sync
    ON milestone_logs(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS diaper_logs (
    id                      TEXT PRIMARY KEY,
    child_id                TEXT NOT NULL,
    logged_at               TEXT NOT NULL,
    diaper_type             TEXT NOT NULL,
    urine_color             TEXT,
    stool_type              INTEGER,
    color                   TEXT,
    size                    TEXT,
    notes                   TEXT,
    photo_path              TEXT,
    linked_poop_log_id      TEXT,
    created_by_caregiver_id TEXT,
    updated_by_caregiver_id TEXT,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    device_id               TEXT,
    sync_status             TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version            INTEGER NOT NULL DEFAULT 1,
    local_only              INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (linked_poop_log_id) REFERENCES poop_logs(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_caregiver_id) REFERENCES caregivers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_diaper_logs_child_date
    ON diaper_logs(child_id, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_diaper_logs_child_type_date
    ON diaper_logs(child_id, diaper_type, deleted_at, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_diaper_logs_linked_poop
    ON diaper_logs(linked_poop_log_id);
CREATE INDEX IF NOT EXISTS idx_diaper_logs_updated_at
    ON diaper_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_diaper_logs_sync
    ON diaper_logs(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS quick_presets (
    id              TEXT PRIMARY KEY,
    child_id        TEXT NOT NULL,
    kind            TEXT NOT NULL,
    label           TEXT NOT NULL,
    description     TEXT,
    draft_json      TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_enabled      INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at      TEXT,
    device_id       TEXT,
    sync_status     TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version    INTEGER NOT NULL DEFAULT 1,
    local_only      INTEGER NOT NULL DEFAULT 0 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id)
);

CREATE INDEX IF NOT EXISTS idx_quick_presets_child_kind_order
    ON quick_presets(child_id, kind, deleted_at, is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_quick_presets_updated_at
    ON quick_presets(updated_at);
CREATE INDEX IF NOT EXISTS idx_quick_presets_sync
    ON quick_presets(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS alerts (
    id              TEXT PRIMARY KEY,
    child_id        TEXT NOT NULL,
    alert_type      TEXT NOT NULL,
    severity        TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    is_dismissed    INTEGER NOT NULL DEFAULT 0 CHECK (is_dismissed IN (0, 1)),
    triggered_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    related_log_id  TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at      TEXT,
    device_id       TEXT,
    sync_status     TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending_sync', 'synced', 'sync_error')),
    sync_version    INTEGER NOT NULL DEFAULT 1,
    local_only      INTEGER NOT NULL DEFAULT 1 CHECK (local_only IN (0, 1)),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (related_log_id) REFERENCES poop_logs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_child
    ON alerts(child_id, is_dismissed, deleted_at, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_related_log
    ON alerts(related_log_id);
CREATE INDEX IF NOT EXISTS idx_alerts_updated_at
    ON alerts(updated_at);
CREATE INDEX IF NOT EXISTS idx_alerts_sync
    ON alerts(sync_status, updated_at);

CREATE TABLE IF NOT EXISTS attachments (
    id                      TEXT PRIMARY KEY,
    owner_table             TEXT NOT NULL,
    owner_id                TEXT NOT NULL,
    child_id                TEXT,
    local_path              TEXT NOT NULL,
    mime_type               TEXT,
    file_size               INTEGER,
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT,
    local_only              INTEGER NOT NULL DEFAULT 1 CHECK (local_only IN (0, 1)),
    attachment_sync_policy  TEXT NOT NULL DEFAULT 'local_only' CHECK (attachment_sync_policy IN ('local_only', 'metadata_only', 'sync')),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_owner
    ON attachments(owner_table, owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_attachments_child
    ON attachments(child_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_attachments_updated_at
    ON attachments(updated_at);

CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
