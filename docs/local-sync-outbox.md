# Local Sync Outbox

Tiny Tummy remains private-first and local-first. The `sync_outbox` table is local infrastructure only: it records local mutation intent inside SQLite so a future, optional Family Sync adapter can inspect pending changes after a user explicitly opts in.

The outbox does not send data anywhere, does not initialize a network client, does not create accounts, and does not change Private Mode. A future sync adapter must be opt-in and must treat this table as an on-device queue, not as data to sync itself.

## Current Scope

Sync-prepared entities:

- `children`
- `caregivers`
- `child_caregivers`
- `poop_logs`
- `diaper_logs`
- `diet_logs`
- `sleep_logs`
- `symptom_logs`
- `episodes`
- `episode_events`
- `growth_logs`
- `milestone_logs`
- `quick_presets`
- `attachments` metadata only

Local-only or derived data:

- `app_settings` remains device-local.
- `alerts` remain local derived records even though they carry sync metadata for soft-delete consistency.
- Photo and attachment file bytes are not placed in the outbox payload. Attachment rows are represented as metadata only.

## Mutation Boundary

Outbox rows are appended from local SQLite mutation helpers, using the same transaction where practical. Payloads are deliberately minimal because a future sync adapter can re-read the entity row by `entity_table` and `entity_id`.

Current `sync_status` behavior remains conservative: local mutations keep using the existing `"local"` convention while bumping `sync_version`. The pending work signal lives in `sync_outbox.status`, not in user-facing UI.

