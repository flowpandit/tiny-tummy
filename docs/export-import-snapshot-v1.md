# Tiny Tummy Snapshot V1

Tiny Tummy snapshot v1 is a local-first data portability contract. It is not
cloud sync, account sync, Supabase integration, caregiver invitation logic, or a
paid backup feature.

## Scope

Snapshots are JSON documents with `schema_version: 1`, `app_name: "Tiny Tummy"`,
an `export_id`, `exported_at`, export kind, inclusion flags, child profile data,
caregiver/link rows, logs, optional safe preferences, and optional local-only
attachment metadata.

The v1 log payload includes:

- `poop_logs`
- `diaper_logs`
- `diet_logs`
- `sleep_logs`
- `symptoms`
- `health_episodes`
- `episode_events`
- `growth_logs`
- `milestone_logs`
- `quick_presets`
- `alerts`

## Attachment Policy

Snapshot v1 does not embed photo or file bytes. When attachment metadata is
requested, the snapshot may include `attachments` rows and log-level
`photo_path` values. Those paths are local app-sandbox references and may not
exist on another device. Imported attachment metadata is treated as local-only.

Future archive support should add a new explicit attachment policy rather than
changing the meaning of v1 `local_paths_only` snapshots.

## Settings Policy

Only non-sensitive preferences are portable in v1:

- theme and night-mode preferences
- unit and temperature-unit preferences
- child-scoped elimination view preferences

Payment, trial, entitlement, store product, account, backend, timer-session, and
other sensitive or ephemeral settings are excluded from generated snapshots and
ignored on import.

## Import Policy

The service validates snapshots before import. Dry-run imports summarize
stable-ID merge behavior for `skip_existing`, `replace_if_newer`, and
`keep_local`.

Write import is intentionally narrow in v1: it is supported only for an empty
Tiny Tummy local data set. General merge writes into non-empty databases are
deferred until conflict UX, attachment archives, and user-facing review flows are
designed.
