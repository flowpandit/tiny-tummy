# Sync Conflict Policy Foundation

Tiny Tummy remains privacy-first and local-first. This document describes the conflict rules and sync-aware repository shape for a future opt-in Family Sync mode. It does not introduce accounts, Supabase, backend code, remote adapters, network calls, caregiver invitations, or user-facing sync UI.

## Current Sync-Prep Audit

Foundations that already exist:

- Stable IDs and soft deletes exist across child profiles, caregivers, child-caregiver links, clinical logs, episodes, episode events, growth, milestones, quick presets, alerts, and attachments.
- Sync metadata exists on sync-prepared tables: `device_id`, `sync_status`, `sync_version`, `local_only`, plus `created_at`, `updated_at`, and `deleted_at`.
- `sync_outbox` records local mutation intent for future optional sync. Outbox rows are local infrastructure only and are not data to sync.
- Local mutations enqueue outbox rows transactionally where practical, and updates keep the existing `sync_status = 'local'` compatibility convention while bumping `sync_version`.
- Repository boundaries exist through `AppRepositories` and `createLocalRepositories`, with route-level code kept away from raw SQLite.
- Export/import snapshots provide a stable data contract, safe settings filtering, local-only attachment metadata, and empty-database import writes.
- Backup/Restore dry-runs non-empty imports and blocks general merge writes until conflict UX and merge application are designed.
- Attachment metadata exists, but file bytes and local photo paths are treated as local-only.
- Caregiver and `child_caregivers` tables separate caregiver identity from child relationship links, which lets future sync unlink a relationship without erasing historical log attribution.

Still missing before a backend spike:

- Remote identity/account model, device membership model, and explicit user consent flow.
- Remote schema, auth, encryption/key management, and storage policy.
- Sync adapter interface implementation, network transport, retry/backoff, and background execution policy.
- Conflict application writes for non-empty imports or remote changes.
- Manual-review UX for destructive child conflicts and invalid references.
- Attachment archive/blob strategy if photos ever become syncable.
- A clear consent policy before caregiver phone/email can sync.

Tables that need table-specific rules:

- `children`: child deletion must not silently destroy local unsynced child-scoped data.
- `caregivers`: deletion is a soft tombstone and must preserve historical attribution by stable ID.
- `child_caregivers`: unlink is relationship deletion, not caregiver destruction.
- `episodes`: status and end-date conflicts can use last-write-wins, but episode history should not be replaced wholesale.
- `episode_events`: append-like, merge by stable event ID.
- `attachments`: metadata may sync later; bytes and local paths remain local-only by default.
- `app_settings`, `sync_outbox`, and `alerts`: local-only or derived; not part of Family Sync payloads by default.

Tables that can share a generic clinical-log rule:

- `poop_logs`
- `diaper_logs`
- `diet_logs`
- `sleep_logs`
- `symptom_logs`
- `growth_logs`
- `milestone_logs`

## Default Conflict Rules

Clinical logs use last-write-wins based on `updated_at`. If `updated_at` is equal, the higher `sync_version` wins. If still tied, local wins to avoid an unexpected overwrite. `created_at` and `created_by_caregiver_id` are preserved, while `updated_by_caregiver_id` comes from the winning side.

For clinical log deletion conflicts, a tombstone wins unless the non-deleted side has a clearly newer `updated_at` than the tombstone time. This supports accidental offline edits without making soft deletes meaningless.

Child profile fields use last-write-wins for basic profile edits. Any one-sided child delete is `manual_review` by default because a remote delete could hide local unsynced logs, attachments, or caregiver relationships.

Caregivers use last-write-wins for display fields. Caregiver phone and email are local-only until a future consent policy exists. Deleting a caregiver creates a soft tombstone; historical `created_by_caregiver_id` and `updated_by_caregiver_id` references must remain meaningful.

`child_caregivers` uses relationship semantics. Unlinking a caregiver from a child deletes the relationship row, not the caregiver row.

Episodes use last-write-wins for status, start, end, summary, and outcome. Episode events are append-like and should be merged by stable ID so one device cannot overwrite the entire episode timeline.

Quick presets are low risk and use last-write-wins with local tie preference.

Attachments default to local-only. Conflict logic never expects photo bytes. `attachment_sync_policy = 'local_only'` causes remote attachment payloads to be ignored. Future metadata-only sync can include owner, child, MIME type, size, timestamps, deletion metadata, and policy, but not local paths.

## Payload Sanitization

`sanitizeSyncPayload` only emits allowlisted fields per entity. It excludes:

- Photo and file byte fields: `photo_path`, `local_path`, `file_path`, `absolute_path`, `file_bytes`, `bytes`, `base64`, `blob`, and `data_url`.
- Local runtime metadata such as `sync_status`.
- App settings, outbox rows, payment keys, trial keys, developer entitlements, and store product IDs.
- Local-only records.
- Caregiver `email` and `phone` by default.

`app_settings` remains local-only. Export/import snapshots may include a small safe preference allowlist for backup portability, but Family Sync payloads should not sync settings by default.

## Repository Design

Future sync should use a decorator shape:

```text
UI/services
-> repository interface
-> SyncAwareRepository decorator
-> LocalSQLiteRepository
-> Future RemoteSyncAdapter
```

Private Mode keeps using local SQLite behavior. The `SyncAwareRepository` scaffold is design-only in this PR and is not wired into production runtime.

Future `SyncAwareRepository` responsibilities:

- Write locally first.
- Enqueue outbox changes locally.
- Optionally trigger background sync only after explicit opt-in.
- Use the pure conflict resolver when remote changes arrive.
- Respect Private Mode and `local_only` records.
- Never initialize or run a remote adapter unless Family Sync is enabled by the user.

## Why No Network Calls Exist

This PR defines the local policy foundation only. No remote adapter, account system, backend, Supabase client, invitation flow, subscription change, or live sync loop exists yet. That keeps Private Mode unchanged and makes the next backend spike a bounded adapter exercise rather than an app-wide rewrite.
