# Supabase Family Sync Feasibility Spike

Status: planning/design only  
Date: 2026-05-06  
Scope: optional Family Sync backend feasibility. No runtime backend code, Supabase client, accounts, auth UI, migrations, network calls, payment changes, or user-facing sync UI are implemented by this document.

## 1. Executive Summary

Tiny Tummy can support a future optional Family Sync mode on Supabase without rewriting the local-first app, but the backend must be treated as an opt-in sync service, not as the app's source of truth.

Recommended direction:

- Keep Private Mode as the default: no account, no cloud, local SQLite only, offline forever.
- Add Family Sync later as an explicit mode switch gated by future entitlement and consent.
- Use Supabase Auth plus Postgres tables with strict Row Level Security.
- Store text/log data and attachment metadata only.
- Do not upload photo bytes or absolute local paths by default.
- Preserve current stable UUIDs as remote primary keys where possible.
- Use `family_id` as the remote tenancy boundary.
- Use existing `sync_outbox`, `sync_version`, `deleted_at`, `local_only`, and `SyncConflictPolicy` for the adapter algorithm.
- Keep caregiver display identities separate from auth users so historical attribution survives member removal or account deletion.

Supabase is a feasible first backend for a spike because it provides Auth, Postgres, RLS, indexes, SQL migrations, and optional Edge Functions in one platform. The main risk is not schema complexity; it is authorization correctness and user trust. RLS tests and a privacy-first onboarding UX are non-negotiable before production.

## 2. Recommended Backend Approach

Use Supabase as the first backend candidate for Family Sync:

- Supabase Auth for identity.
- Supabase Postgres for text/log sync state.
- Supabase Row Level Security for per-family isolation.
- Optional Edge Functions only for operations that should not run directly from the client, such as invitations, account deletion orchestration, admin support tooling, or entitlement verification.
- No Supabase Storage for photos in v1.
- No Realtime in v1 unless needed after polling/cursor sync proves insufficient.

Mode separation:

```text
Private Mode
  UI/services
  -> Local repositories
  -> Local SQLite
  -> No auth, no network, no remote adapter

Family Sync Mode, future opt-in only
  UI/services
  -> SyncAwareRepository decorator
  -> Local SQLite first
  -> sync_outbox
  -> RemoteSyncAdapter
  -> Supabase Auth + RLS protected tables
```

The future adapter should be initialized only after all of these are true:

- User explicitly enables Family Sync.
- User has authenticated.
- User is a member of a family.
- Device is registered for that family.
- Feature gate says the sync entitlement is active, if product decides to make it paid.
- Private Mode setting is not active.

## 3. Current Local Model Audit

### Local foundations already present

- Stable UUID primary keys via `crypto.randomUUID()`.
- `created_at`, `updated_at`, `deleted_at`, `sync_version`, `local_only`, and `sync_status` on sync-ready tables.
- Soft deletes instead of hard deletes for user data tables.
- `sync_outbox` records local mutation intent but is local-only infrastructure.
- `SyncConflictPolicy` defines entity types, field allowlists, conflict actions, deletion behavior, attachment local-only policy, and caregiver contact policy.
- `SyncAwareRepository` design exists but is not wired into runtime.
- `ExportImportService` defines a portable local snapshot format and blocks general non-empty merge writes.
- `FeatureGateService` already has future sync feature IDs: `family_sync`, `caregiver_invites`, `multi_device_sync`, `cloud_backup`, `shared_live_today`, and `sync_subscription`, all requiring `sync_addon`.

### Local tables that should map to Supabase

| Local table | Remote table | Sync direction | Notes |
| --- | --- | --- | --- |
| `children` | `children` | Two-way | Add remote `family_id`; child delete needs manual review if local unsynced data exists. |
| `caregivers` | `caregivers` | Two-way, display fields only | Phone/email excluded by default. Preserve tombstones for attribution. |
| `child_caregivers` | `child_caregivers` | Two-way | Relationship rows, not auth membership. |
| `poop_logs` | `poop_logs` | Two-way | Exclude `photo_path`. |
| `diaper_logs` | `diaper_logs` | Two-way | Exclude `photo_path`; keep `linked_poop_log_id`. |
| `diet_logs` | `diet_logs` | Two-way | Text/log fields only. |
| `sleep_logs` | `sleep_logs` | Two-way | Text/log fields only. |
| `symptom_logs` | `symptom_logs` | Two-way | Text/log fields only. |
| `episodes` | `episodes` | Two-way | Episode status/end date use conflict policy. |
| `episode_events` | `episode_events` | Two-way | Merge by stable ID. |
| `growth_logs` | `growth_logs` | Two-way | Text/numeric health data. |
| `milestone_logs` | `milestone_logs` | Two-way | Text/log fields only. |
| `quick_presets` | `quick_presets` | Two-way | Low-risk preference-like child data. |
| `attachments` | `attachments_metadata` | Metadata only | Do not include bytes or local paths. |

### Local tables that should remain local-only

| Local table/data | Why local-only |
| --- | --- |
| `app_settings` | Device-specific preferences, premium/trial state, current caregiver selection, debug/developer values. |
| `sync_outbox` | Per-device queue; syncing it would duplicate transport state and leak implementation detail. |
| `alerts` | Derived local nudges. Recompute locally from logs; do not sync by default. |
| Photo/file bytes | High privacy and cost risk; keep local unless a later explicit photo-sync product exists. |
| Absolute paths such as `photo_path` and `local_path` | Device-private and useless on another device. |
| Payment/store entitlement keys | Must remain outside health sync tables. |
| Caregiver `email` and `phone` | Local-only until a future explicit consent policy exists. |
| Local notification/reminder scheduler state | Device capability and OS permission dependent. |

### Safe fields to sync

Safe means acceptable for the future Family Sync payload after explicit opt-in, not safe for Private Mode network use.

- Stable IDs: `id`, foreign IDs, `created_by_caregiver_id`, `updated_by_caregiver_id`.
- Sync metadata: `created_at`, `updated_at`, `deleted_at`, `sync_version`, `device_id` where useful.
- Child profile basics: name, date of birth, sex, feeding type, avatar color, active state.
- Caregiver display fields: display name, role, relationship, avatar color, primary flag.
- Relationship fields: child ID, caregiver ID, relationship-to-child, permissions.
- Log fields: timestamps, categories, notes, numeric values, links to episodes/events, linked poop IDs.
- Attachment metadata only: owner table, owner ID, child ID, MIME type, file size, timestamps, policy.

### Fields that should stay local-only

- `sync_status`: local adapter state.
- `local_only` rows: excluded from remote writes.
- `photo_path`, `local_path`, `file_path`, absolute paths, file bytes, base64 blobs, data URLs.
- `app_settings` values, especially premium/trial/developer keys.
- `sync_outbox` rows and payload JSON.
- Caregiver email and phone until future consent.
- Any future access tokens, refresh tokens, auth provider metadata, or device secrets.

### Local assumptions that need remote concepts later

- Local child ownership is implicit; remote needs `families`, `family_members`, and roles.
- Local caregiver records are display identities; remote needs separate auth users and membership records.
- Local device ID is currently optional; remote needs device registration and revocation.
- Local `current_caregiver` is a setting; remote attribution needs mapping between auth user, family member, and caregiver display identity.
- Local import blocks non-empty merge writes; remote sync needs conflict application and manual review.
- Local backups include safe settings for portability; remote sync should not sync settings by default.

## 4. Proposed Supabase Schema

These are proposed SQL shapes for a future dev-only schema file. Do not run them in production as part of this PR.

Common columns for syncable tables:

```sql
id uuid primary key,
family_id uuid not null references families(id),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz,
created_by_user_id uuid references auth.users(id),
updated_by_user_id uuid references auth.users(id),
origin_device_id uuid references devices(id),
sync_version integer not null default 1,
local_only boolean not null default false
```

Remote tables should reject `local_only = true` inserts from normal clients. The field can exist to support defensive checks and future debugging, but local-only records should be filtered before upload.

### `profiles`

Purpose: public app profile for an authenticated user, not a child/caregiver identity.

Key fields:

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `avatar_color text`
- `created_at`, `updated_at`, `deleted_at`

Relationship to local: no direct local table today. It is an account wrapper for Family Sync.

Sync direction: remote-only account metadata; local app may cache it after auth.

Indexes:

- Primary key on `id`.
- Optional `updated_at` if profile sync/caching is needed.

Privacy:

- Keep minimal. Do not store child health data here.
- Do not rely on `raw_user_meta_data` for authorization.

### `families`

Purpose: tenant/care circle boundary.

Key fields:

- `id uuid primary key`
- `name text`
- `created_by_user_id uuid not null references auth.users(id)`
- `created_at`, `updated_at`, `deleted_at`
- `default_timezone text`

Relationship to local: remote-only. A local data set maps to one family during opt-in.

Sync direction: remote to local metadata only.

Indexes:

- `created_by_user_id`
- `updated_at`
- `deleted_at`

Privacy:

- Family name should be optional or generic because it can reveal household identity.

### `family_members`

Purpose: auth-user membership and authorization role within a family.

Key fields:

- `id uuid primary key`
- `family_id uuid not null references families(id)`
- `user_id uuid not null references auth.users(id)`
- `role text not null check (role in ('owner','parent','caregiver','viewer','daycare','clinician_viewer'))`
- `status text not null check (status in ('active','invited','removed'))`
- `caregiver_id uuid references caregivers(id)`
- `created_at`, `updated_at`, `removed_at`

Relationship to local: maps remote auth users to local caregiver display identities when possible.

Sync direction: remote to local for membership/caregiver mapping. Local caregiver records are not membership by themselves.

Indexes:

- Unique active membership: `(family_id, user_id)` where `status = 'active'`.
- `user_id, status`
- `family_id, role, status`
- `caregiver_id`

Privacy:

- Do not expose all auth profile details to all members by default.
- Removed members should not read future sync data.

### `devices`

Purpose: registered sync clients and revocation boundary.

Key fields:

- `id uuid primary key`
- `family_id uuid not null references families(id)`
- `user_id uuid not null references auth.users(id)`
- `device_label text`
- `platform text`
- `app_version text`
- `last_seen_at timestamptz`
- `revoked_at timestamptz`
- `created_at`, `updated_at`

Relationship to local: maps local `device_id` to a remote registered device.

Sync direction: local creates/updates its own device row; remote can revoke.

Indexes:

- `family_id, user_id`
- `user_id, revoked_at`
- `last_seen_at`

Privacy:

- Avoid storing precise device identifiers. Use app-generated UUID and a user-editable label.

### `children`

Purpose: synced child profile.

Key fields:

- Common sync columns.
- `name text not null`
- `date_of_birth date not null`
- `sex text`
- `feeding_type text not null`
- `avatar_color text not null`
- `is_active boolean not null default true`

Relationship to local: maps to `children`.

Sync direction: two-way after opt-in.

Indexes:

- `family_id, deleted_at, created_at`
- `family_id, updated_at, id`
- `family_id, is_active, deleted_at`

Privacy:

- Child profile is sensitive health-adjacent data. Only active family members can read it.
- Remote destructive delete should be soft delete first and may require owner/parent role.

### `caregivers`

Purpose: display attribution identity. This is not the auth account itself.

Key fields:

- Common sync columns.
- `display_name text not null`
- `role text not null`
- `relationship text`
- `avatar_color text`
- `is_primary boolean not null default false`
- Optional future, consent-gated `contact_policy text`, but no email/phone in v1.

Relationship to local: maps to `caregivers`.

Sync direction: two-way for display fields.

Indexes:

- `family_id, deleted_at`
- `family_id, updated_at, id`
- Partial unique primary if needed: `(family_id) where is_primary and deleted_at is null`

Privacy:

- Do not sync local caregiver email or phone by default.
- Soft-deleted caregiver rows remain visible to authorized members for attribution reconciliation.

### `child_caregivers`

Purpose: relationship between child and caregiver display identity.

Key fields:

- Common sync columns.
- `child_id uuid not null references children(id)`
- `caregiver_id uuid not null references caregivers(id)`
- `relationship_to_child text`
- `permissions jsonb`

Relationship to local: maps to `child_caregivers`.

Sync direction: two-way.

Indexes:

- Unique active link: `(family_id, child_id, caregiver_id) where deleted_at is null`
- `family_id, child_id, deleted_at`
- `family_id, caregiver_id, deleted_at`
- `family_id, updated_at, id`

Privacy:

- Unlink means relationship deletion, not caregiver deletion.

### Clinical log tables

Remote tables:

- `poop_logs`
- `diaper_logs`
- `diet_logs`
- `sleep_logs`
- `symptom_logs`
- `growth_logs`
- `milestone_logs`

Purpose: text/numeric child health logs.

Relationship to local: one-to-one table mapping.

Sync direction: two-way.

Shared key fields:

- Common sync columns.
- `child_id uuid not null references children(id)`
- `created_by_caregiver_id uuid references caregivers(id)`
- `updated_by_caregiver_id uuid references caregivers(id)`
- Table-specific fields from SQLite, excluding local-only photo/path fields.

Table-specific fields:

- `poop_logs`: `logged_at`, `stool_type`, `color`, `size`, `is_no_poop`, `notes`.
- `diaper_logs`: `logged_at`, `diaper_type`, `urine_color`, `stool_type`, `color`, `size`, `notes`, `linked_poop_log_id`.
- `diet_logs`: `logged_at`, `food_type`, `food_name`, `notes`, `amount_ml`, `duration_minutes`, `breast_side`, `bottle_content`, `reaction_notes`, `is_constipation_support`.
- `sleep_logs`: `sleep_type`, `started_at`, `ended_at`, `notes`.
- `symptom_logs`: `episode_id`, `symptom_type`, `severity`, `temperature_c`, `temperature_method`, `logged_at`, `notes`.
- `growth_logs`: `measured_at`, `weight_kg`, `height_cm`, `head_circumference_cm`, `notes`.
- `milestone_logs`: `milestone_type`, `logged_at`, `notes`.

Indexes:

- `family_id, child_id, deleted_at, <event_time> desc`
- `family_id, updated_at, id`
- Foreign-key lookup indexes for linked IDs: `episode_id`, `linked_poop_log_id`.

Privacy:

- These are sensitive child health records.
- Do not expose to non-members.
- Keep soft-deleted rows readable to authorized members for sync reconciliation.

### `episodes`

Purpose: health episode aggregate.

Key fields:

- Common sync columns.
- `child_id`
- `episode_type`
- `status`
- `started_at`
- `ended_at`
- `summary`
- `outcome`
- caregiver attribution IDs.

Relationship to local: maps to `episodes`.

Sync direction: two-way.

Indexes:

- `family_id, child_id, status, deleted_at, started_at desc`
- `family_id, child_id, deleted_at, started_at, ended_at`
- `family_id, updated_at, id`

Privacy:

- Episode text may contain medical details. Same protections as logs.

### `episode_events`

Purpose: append-like episode timeline rows.

Key fields:

- Common sync columns.
- `episode_id`
- `child_id`
- `event_type`
- `title`
- `notes`
- `logged_at`
- `source_kind`
- `source_id`
- caregiver attribution IDs.

Relationship to local: maps to `episode_events`.

Sync direction: two-way, merge by stable ID.

Indexes:

- `family_id, episode_id, deleted_at, logged_at desc`
- `family_id, child_id, deleted_at, logged_at desc`
- `family_id, source_kind, source_id`
- `family_id, updated_at, id`

Privacy:

- Do not overwrite whole event history on conflict.

### `quick_presets`

Purpose: child-scoped quick log templates.

Key fields:

- Common sync columns.
- `child_id`
- `kind`
- `label`
- `description`
- `draft_json`
- `sort_order`
- `is_enabled`

Relationship to local: maps to `quick_presets`.

Sync direction: two-way, low-risk last-write-wins.

Indexes:

- `family_id, child_id, kind, deleted_at, is_enabled, sort_order`
- `family_id, updated_at, id`

Privacy:

- `draft_json` can contain notes or food names, so treat as family-private.

### `attachments_metadata`

Purpose: optional metadata-only representation of local attachments.

Key fields:

- `id uuid primary key`
- `family_id`
- `owner_table text not null`
- `owner_id uuid not null`
- `child_id uuid`
- `mime_type text`
- `file_size bigint`
- `attachment_sync_policy text not null check (attachment_sync_policy in ('local_only','metadata_only','sync'))`
- `created_at`, `updated_at`, `deleted_at`
- `origin_device_id`
- `sync_version`

Relationship to local: maps to `attachments` without `local_path`.

Sync direction: v1 should upload only rows with future `metadata_only` policy. Current `local_only` attachments should not sync.

Indexes:

- `family_id, owner_table, owner_id, deleted_at`
- `family_id, child_id, deleted_at`
- `family_id, updated_at, id`

Privacy:

- No file bytes.
- No absolute paths.
- MIME type and file size can still reveal information; make metadata sync optional.

### `sync_state`

Purpose: per-device cursor state for pull synchronization.

Key fields:

- `id uuid primary key`
- `family_id`
- `device_id`
- `entity_table text`
- `last_pulled_updated_at timestamptz`
- `last_pulled_id uuid`
- `last_push_completed_at timestamptz`
- `created_at`, `updated_at`

Relationship to local: remote mirror of per-device sync cursors. Local should also persist cursors.

Sync direction: device writes its own state.

Indexes:

- Unique `(family_id, device_id, entity_table)`.
- `device_id, updated_at`.

Privacy:

- Contains operational metadata only. Still family-private.

### `invitations` (future)

Purpose: invite a user into a family.

Key fields:

- `id uuid primary key`
- `family_id`
- `invited_by_user_id`
- `role`
- `token_hash text not null`
- `invitee_email_hash text`
- `expires_at`
- `accepted_at`
- `revoked_at`
- `created_at`

Relationship to local: no local table until invitation UI exists.

Sync direction: remote-only workflow.

Indexes:

- `token_hash`
- `family_id, expires_at`
- `invitee_email_hash`

Privacy:

- Store token hashes, not raw invite tokens.
- Avoid storing invitee email unless needed; prefer hash plus email provider logs if possible.

### `sync_changes` or audit log (optional)

Purpose: durable change feed if `updated_at` cursor sync is not enough.

Key fields:

- `id bigserial primary key`
- `family_id`
- `entity_table`
- `entity_id`
- `operation`
- `changed_at`
- `changed_by_user_id`
- `origin_device_id`

Use only if needed. A pure `updated_at, id` cursor may be enough for the first spike.

Privacy:

- Avoid storing full row snapshots in audit logs unless required.
- Audit tables need the same family RLS and retention policy.

## 5. RLS Policy Design

Supabase documentation emphasizes enabling RLS for exposed tables and creating explicit policies before data is accessible via client APIs. For Tiny Tummy, every public sync table must have RLS enabled before any client can use it.

### Roles

Application roles stored in `family_members.role`:

- `owner`: full family management, member management, child management, logs.
- `parent`: manage children and logs, invite/manage caregivers if product allows.
- `caregiver`: add/edit own or family logs, read shared family data, cannot manage billing/family.
- `viewer`: read-only.
- `daycare`: future constrained caregiver role, likely child/log window-limited.
- `clinician_viewer`: future read-only, time-limited, report-focused role if ever needed.

First version should implement only `owner`, `parent`, `caregiver`, and `viewer`.

### Helper functions

Use helper functions to avoid repeated complex joins in every policy. Put security-definer helpers in a non-exposed schema, for example `app_private`, and test them heavily.

Pseudo-SQL:

```sql
create schema if not exists app_private;

create or replace function app_private.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
  );
$$;

create or replace function app_private.has_family_role(target_family_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
      and fm.role = any(allowed_roles)
  );
$$;
```

RLS testing requirement:

- Test anonymous user cannot read anything.
- Test user from family A cannot read family B.
- Test removed member loses access.
- Test viewer cannot insert/update/delete.
- Test caregiver can insert logs but cannot manage family tables.
- Test soft-deleted rows remain visible to active members for sync reconciliation.

### Policy matrix

| Table | Select | Insert | Update | Soft delete |
| --- | --- | --- | --- | --- |
| `profiles` | Own profile; optional family members via narrow view later | Self only | Self only | Self/account deletion flow |
| `families` | Active members | Auth user can create a family | Owner/parent for metadata | Owner only, usually via account/family deletion flow |
| `family_members` | Active members can read membership for their family | Owner/parent or invitation accept flow | Owner/parent; self can update limited profile link fields | Owner/parent can mark removed; self can leave if not sole owner |
| `devices` | Own devices and owner/parent family view | Auth user can register own device in family | Own device heartbeat; owner/parent can revoke | Owner/parent revoke or self revoke |
| `children` | Active members | Owner/parent | Owner/parent | Owner/parent; child delete may require product-level confirmation |
| `caregivers` | Active members | Owner/parent/caregiver | Owner/parent/caregiver | Owner/parent; caregiver self-delete only for own display identity if allowed |
| `child_caregivers` | Active members | Owner/parent | Owner/parent | Owner/parent unlink |
| Clinical logs | Active members | Owner/parent/caregiver | Owner/parent/caregiver | Owner/parent/caregiver soft delete |
| `episodes` | Active members | Owner/parent/caregiver | Owner/parent/caregiver | Owner/parent/caregiver soft delete |
| `episode_events` | Active members | Owner/parent/caregiver | Owner/parent/caregiver | Owner/parent/caregiver soft delete |
| `quick_presets` | Active members | Owner/parent/caregiver | Owner/parent/caregiver | Owner/parent/caregiver soft delete |
| `attachments_metadata` | Active members | Owner/parent/caregiver, metadata only | Owner/parent/caregiver | Owner/parent/caregiver soft delete |
| `sync_state` | Own device row; owner/parent optional debug view | Own device only | Own device only | Own device or owner/parent revoke cleanup |
| `invitations` | Owner/parent; invite token lookup through RPC | Owner/parent | Owner/parent; accept RPC | Owner/parent revoke |

### Example table policies

Family-scoped read:

```sql
create policy "family members can read poop logs"
on poop_logs
for select
to authenticated
using (app_private.is_family_member(family_id));
```

Family-scoped log insert:

```sql
create policy "care roles can insert poop logs"
on poop_logs
for insert
to authenticated
with check (
  app_private.has_family_role(family_id, array['owner','parent','caregiver'])
  and local_only is false
);
```

Family-scoped update and soft delete:

```sql
create policy "care roles can update poop logs"
on poop_logs
for update
to authenticated
using (app_private.has_family_role(family_id, array['owner','parent','caregiver']))
with check (
  app_private.has_family_role(family_id, array['owner','parent','caregiver'])
  and local_only is false
);
```

Do not grant client-side hard delete on sync tables. Client "delete" means `UPDATE ... SET deleted_at = now()`.

### Cross-family prevention rules

- Every syncable table has `family_id`.
- Every child-scoped table has both `family_id` and `child_id`.
- Inserts must check that referenced children, caregivers, episodes, and logs belong to the same family.
- Foreign keys alone are not enough for tenant isolation because a malicious client could submit a valid UUID from another family if RLS/policies allow it.
- Add database triggers or `with check` constraints to verify same-family references.

Pseudo-trigger idea:

```sql
-- For each child-scoped table, assert new.family_id equals the referenced child's family_id.
-- For caregiver attribution, assert caregiver.family_id equals new.family_id when not null.
```

### Soft-deleted rows

RLS should not hide `deleted_at is not null` rows from active authorized members, because sync reconciliation needs tombstones. Application queries can filter active rows; sync queries can include tombstones.

### RLS review checklist

- RLS enabled on every exposed table.
- No policy grants access to `anon`.
- No production client uses service role or secret keys.
- Policies specify `to authenticated`.
- Policy helper functions are in a non-exposed schema.
- Indexes exist for columns used by policies.
- RLS tests run in CI against seeded family A/family B data.

## 6. Auth and Identity Model

### Options evaluated

| Option | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| Email magic link/OTP | Low friction, no password, supported by Supabase Auth | Email deliverability, caregivers need inbox access | Best first version. |
| Apple/Google OAuth | Familiar, Apple-friendly for iOS, fast sign-in | Provider setup, account linking edge cases | Add soon after email; include Apple before iOS Family Sync launch if using third-party sign-in. |
| Passkeys | Strong UX/security later | More implementation complexity and cross-device testing | Later. |
| Anonymous auth upgraded later | No PII initially, can link identity later | Easy to confuse with Private Mode; account deletion burden still applies for auto-created accounts | Avoid for v1 Family Sync; maybe dev prototype only. |
| Invite-based onboarding | Natural for caregivers | Requires robust invitation security and abuse controls | Add after owner/parent account flow works. |

### Recommended first version

Start with email magic link or email OTP for Family Sync. Keep Private Mode completely accountless.

Why:

- Parents who do not want accounts can keep using Private Mode.
- Family Sync requires durable identity for access control and revocation.
- Passwordless auth avoids password storage UX and support burden.
- Supabase supports passwordless email flows with redirect allowlists and default rate limits.

Add Apple/Google OAuth as a second auth PR, not the first. If the iOS/macOS app supports third-party sign-in, Sign in with Apple expectations should be reviewed before release.

Avoid anonymous auth for production Family Sync v1. Supabase supports anonymous users that can later link identities, but anonymous users still create backend accounts and can create account deletion, abuse, and user-confusion problems. Tiny Tummy's product promise is clearer if "no account" means truly no Supabase account.

### Account deletion

Apple says apps that support account creation must let users initiate account deletion in-app. Family Sync production launch must include account deletion or a clearly linked deletion flow.

Deletion policy:

- User can leave a family unless they are the sole owner.
- Sole owner must transfer ownership or delete the family.
- Account deletion should remove or anonymize profile/member records and revoke devices.
- Child health data deletion must be explicit: delete just account, leave shared family data, or delete family data if sole owner.
- Server-side deletion uses admin credentials only on trusted backend/Edge Function, never in the client.

## 7. Sync Algorithm

This section describes future implementation only.

### Initial opt-in upload from Private Mode

1. User taps "Enable Family Sync" in a future UI.
2. App explains mode change: data will be stored in Tiny Tummy's sync service/Supabase; photos stay local by default.
3. User authenticates.
4. App creates `profiles` row if missing.
5. App creates `families` row and owner `family_members` row.
6. App registers current device in `devices`.
7. App scans local tables using `sanitizeSyncPayload`.
8. App excludes `local_only` rows, `app_settings`, `sync_outbox`, alerts, photo bytes, local paths, payment keys, caregiver phone/email.
9. App uploads rows in dependency order: children, caregivers, child_caregivers, logs, episodes/events, quick presets, attachment metadata if policy permits.
10. Remote keeps local UUIDs as primary keys to avoid duplicate records.
11. App stores remote family ID and device ID locally.
12. Local rows remain the source of immediate UI state.

### Initial download to a second device

1. User installs app and chooses Family Sync.
2. User authenticates and joins/selects a family.
3. Device registers in `devices`.
4. App pulls all non-local-only rows visible to that family, including tombstones needed for consistency.
5. App inserts into empty local SQLite using stable IDs.
6. Current caregiver display identity is selected or created locally based on membership mapping.
7. App starts cursor-based incremental sync.

### Ongoing local-first writes

1. UI writes to local repository.
2. Local SQLite transaction updates row, bumps `sync_version`, sets `sync_status = 'local'`, enqueues `sync_outbox`.
3. UI updates immediately from local data.
4. Adapter later drains pending outbox rows if Family Sync is enabled.
5. Adapter sanitizes payload, rejects local-only rows, and upserts remote row.
6. On success, local row can transition to `synced` or keep current compatibility behavior until the app is ready for visible sync status.
7. On failure, outbox row records retry/error state; local data remains valid.

### Remote pull by cursor

Use per-table cursor:

```text
cursor = (last_pulled_updated_at, last_pulled_id)
query = where family_id = current_family
        and (updated_at, id) > cursor
        order by updated_at asc, id asc
        limit batch_size
```

Pull should include rows with `deleted_at` for tombstone reconciliation.

### Conflict handling

For each remote row:

1. Load local row by stable ID.
2. If absent, insert remote row unless invalid reference or attachment local-only policy.
3. If present, call `resolveConflict(entityType, local, remote)`.
4. Apply resolved row locally inside transaction.
5. Preserve `created_at` and `created_by_caregiver_id` for clinical logs.
6. For episode events, merge by stable ID.
7. If child delete conflict returns `manual_review`, pause application for that child and surface future review UX.
8. If invalid reference, defer row and retry after dependencies; if still invalid, mark sync error/manual review.

### Deletes and tombstones

- Local delete means set `deleted_at`, update `updated_at`, bump `sync_version`, enqueue delete.
- Remote delete means tombstone, not hard delete.
- Tombstones should be retained long enough for offline devices to reconcile. Initial recommendation: 180 days after all registered devices have synced beyond tombstone time, then compact only if no pending cursors need it.

### Attachments/photos

- `photo_path` and `local_path` never upload.
- Attachment bytes never upload in v1.
- Attachment metadata can be skipped entirely, or uploaded only if `attachment_sync_policy = 'metadata_only'`.
- If another device receives metadata, it should show no photo rather than a broken path.

### Offline and retry behavior

- Offline writes continue locally.
- Outbox processes when network and auth session are available.
- Retry with exponential backoff and jitter.
- Treat auth failures as paused sync until user reauthenticates.
- Treat RLS denial as a hard sync error requiring investigation, not silent data loss.
- Use idempotent upserts by stable ID.

### Device IDs

- Local `device_id` should become required for sync-enabled devices.
- Remote `devices.id` should be app-generated UUID, not OS advertising ID or hardware serial.
- Revoked devices can keep local Private Mode data but must stop pulling/pushing Family Sync.

### `sync_version` and `sync_status`

- `sync_version` remains per-row logical version for tie-breaking.
- Remote should store `sync_version` from the winning write.
- `sync_status` remains local-only adapter state.
- Future statuses can be: local, pending_sync, synced, sync_error, paused_auth, paused_revoked.

## 8. Conflict Handling Summary

The existing `SyncConflictPolicy` is suitable for a first remote adapter:

- Clinical logs: last-write-wins by `updated_at`, then `sync_version`, then local tie.
- Deleted clinical rows: tombstone wins unless the non-deleted edit is clearly newer.
- Child deletion: manual review.
- Caregiver deletion: soft tombstone, preserve historical attribution.
- `child_caregivers`: unlink relationship, do not destroy caregiver identity.
- Episodes: last-write-wins for status/end/summary/outcome.
- Episode events: merge by stable ID.
- Attachments: local-only by default; never expect photo bytes.
- Quick presets: last-write-wins, local tie.

Backend implications:

- Do not use Postgres `ON CONFLICT DO UPDATE` blindly for remote writes if it can bypass app conflict decisions.
- For direct client upserts, remote RLS only authorizes access; client adapter still decides conflict semantics.
- For server-side sync RPCs, implement conflict policy in SQL or a trusted function and test parity with TypeScript utilities.

## 9. Privacy Model

Future user-facing promise:

- Private Mode: no account, no cloud, data stays on device.
- Family Sync: selected data is encrypted in transit and stored in Tiny Tummy's sync service/Supabase so approved family members/devices can share it.
- Photos remain local by default.
- Users can choose what to sync.
- Users can turn off sync.
- Users can export/delete data.

Data that syncs by default in Family Sync v1:

- Child profiles.
- Caregiver display identities.
- Child-caregiver relationships.
- Text/numeric logs.
- Episodes and episode events.
- Growth and milestone logs.
- Quick presets.
- Sync metadata and tombstones.

Data that never syncs by default:

- Photo/file bytes.
- Absolute local file paths.
- `app_settings`.
- `sync_outbox`.
- Alerts/derived nudges.
- Payment, trial, developer, store entitlement keys.
- Local notification state.

Data requiring explicit future consent:

- Caregiver phone/email.
- Photo upload/blob backup.
- Clinician sharing.
- Analytics or crash reports containing health context.
- Any export to third-party systems.

Child health data sensitivity:

- Treat all child logs as sensitive personal/health-adjacent data.
- Minimize server logs.
- Avoid analytics event payloads containing child names, notes, symptoms, or dates of birth.
- Redact request/response bodies in error reporting.

## 10. Security Model

### RLS correctness

- RLS is the main security boundary for direct Supabase client access.
- Every table in exposed schemas must enable RLS.
- Every policy should specify `to authenticated`.
- No `anon` access to family data.
- Same-family foreign key checks must be enforced.

### Least privilege

- Mobile/desktop clients use publishable/anon-equivalent keys plus user JWT only.
- Service role/secret keys are never included in Tauri/mobile bundles.
- Admin functions use Edge Functions or backend services with explicit authorization checks.

### Auth token storage

- Tauri desktop and mobile should use OS-backed secure storage where available.
- Refresh tokens must not be logged.
- Sign-out should clear tokens and pause sync.
- Device revocation should invalidate sync even if local token remains until expiry.

### Member and device revocation

- Removing a family member sets `family_members.status = 'removed'`.
- Revoked members immediately lose RLS access on next request.
- Revoking a device sets `devices.revoked_at`; adapter stops push/pull after detecting it.
- Local Private Mode data remains on the device unless user chooses to delete local data.

### Account/family deletion

- Client can initiate, but server performs destructive auth/admin operations.
- Delete/revoke storage objects before deleting auth user if storage is ever used.
- Support export before deletion.
- Deletion must be reflected in App Store privacy/account settings if account creation ships.

### Backups

- Supabase project backups protect operational recovery, not user-facing export.
- User-facing export remains local JSON/PDF backup/report flow.
- Avoid storing backup files in Supabase Storage by default.

### Logs and analytics avoidance

- Do not log full row payloads.
- Do not send notes, child names, or symptom details to analytics.
- Redact Supabase errors before showing support diagnostics.

### Abuse and invites

- Invitation creation should be rate-limited.
- Store token hashes, not raw tokens.
- Consider CAPTCHA/Turnstile only for web invite acceptance if abuse appears.
- Limit family/member counts for early versions.

### Data retention

- Active family data retained until user deletes/exports/disables Family Sync according to product policy.
- Tombstones retained at least 180 days or until all active devices have synced past them.
- Invitation tokens expire quickly, for example 7 days.
- Removed device/member records retained for audit for a limited period, for example 1 year, then compacted/anonymized.

## 11. Cost Model

Pricing references checked on 2026-05-06. Supabase pricing changes, so treat this as a formula and early estimate, not a commitment.

Current relevant Supabase published quotas/prices:

- Pro/Team includes 100,000 monthly active users, then $0.00325 per MAU.
- Pro/Team includes 8 GB database disk per project, then $0.125 per GB.
- Pro/Team includes 250 GB egress, then $0.09 per GB uncached.
- Pro/Team includes 100 GB storage, then $0.021 per GB.
- Pro/Team includes 2 million Edge Function invocations, then $2 per million.
- Pro/Team includes 5 million Realtime messages, then $2.50 per million.

Supabase plan subscription and compute add-on cost should be checked on the pricing page before purchase. The billing docs show paid plans have fixed subscription fees and project compute costs; compute size will be the main unknown after row count and query shape are measured.

### Modeling assumptions

Use these for first spreadsheet sizing:

- Text/log sync only. No photo upload.
- Average 1.8 active sync users per family.
- Average 1.3 children per family.
- Realistic case: 8 log rows per child per day.
- Best case: 4 log rows per child per day.
- Risk case: 20 log rows per child per day plus heavier pull churn.
- Average persisted row plus indexes: 1.5 KB realistic, 1.0 KB best, 3.0 KB risk.
- Retention for active child data: 36 months.
- Tombstone retention: 180 days.
- Egress per changed row, including headers/JSON overhead: 2 KB realistic, 1 KB best, 6 KB risk.
- Initial device download is a spike; ongoing monthly egress mostly follows changed rows and conflict pulls.

Formula:

```text
families = active_users / 1.8
children = families * 1.3
rows_per_day = children * logs_per_child_per_day
db_gb = rows_per_day * retention_days * row_kb / 1024 / 1024
monthly_egress_gb = rows_per_day * 30 * egress_kb / 1024 / 1024
db_overage = max(db_gb - 8, 0) * 0.125
egress_overage = max(monthly_egress_gb - 250, 0) * 0.09
mau_overage = max(active_users - 100000, 0) * 0.00325
```

### Scenario estimates

| Active sync users | Best-case db/egress | Realistic db/egress | Risk db/egress | Cost signal |
| --- | --- | --- | --- | --- |
| 500 | ~0.3 GB / <1 GB-mo | ~1.2 GB / <1 GB-mo | ~11 GB / ~1 GB-mo | Free technically possible by quota, but production should use paid plan for reliability/backups. |
| 5,000 | ~3 GB / <1 GB-mo | ~12 GB / ~2 GB-mo | ~112 GB / ~6 GB-mo | Pro likely enough; realistic DB overage roughly `(12 - 8) * 0.125 = $0.50/mo` plus compute. |
| 25,000 | ~30 GB / ~2 GB-mo | ~61 GB / ~9 GB-mo | ~558 GB / ~36 GB-mo | Storage overage realistic roughly $6.60/mo; risk roughly $68.75/mo; compute benchmarking needed. |
| 50,000 | ~59 GB / ~4 GB-mo | ~122 GB / ~18 GB-mo | ~1.1 TB / ~73 GB-mo | Database size and indexes become meaningful; likely need larger compute and partitioning. |
| 100,000 | ~119 GB / ~9 GB-mo | ~245 GB / ~36 GB-mo | ~2.2 TB / ~145 GB-mo | MAU still within included quota; DB realistic overage roughly $29.60/mo, but compute/ops dominate. |

Interpretation:

- Text-only sync is unlikely to be egress-expensive at these scales unless clients repeatedly full-resync or Realtime is overused.
- Database size grows steadily with retention and indexing. The numbers are manageable in storage dollars but may require query/index tuning and larger compute.
- Photos would change the model completely. Even one 2 MB photo per child per day creates storage and egress pressure quickly. Keep photos local by default.
- If users frequently reinstall or add devices, initial full downloads can dominate monthly egress. Add pagination, compression where available, and avoid full resync loops.

Best-case cost:

- One paid Supabase project with text-only sync, no Edge Functions beyond invites/account deletion, no Realtime.
- Storage overage modest; compute remains the main variable.

Realistic cost:

- Paid plan plus database overage plus larger compute as active users approach 25k to 100k.
- Need query benchmarks at 1M, 10M, 100M, and 500M log rows.

Risk case:

- High log volume, long retention, poor cursor queries, repeated full downloads, or photo upload.
- Mitigation: table partitioning by family/time or child/time, server-side batch RPCs, capped tombstones, no photo sync, and sync health metrics.

## 12. Migration Path From Current Local App

### Existing local user opts into Family Sync

1. User keeps using Private Mode until explicit opt-in.
2. Future UI explains privacy difference.
3. User authenticates.
4. App creates family and owner membership.
5. App registers device.
6. App uploads sanitized existing local records in dependency order.
7. App marks upload complete and starts incremental outbox sync.

### Avoiding duplicates

- Use current local UUIDs as remote primary keys.
- Use idempotent upsert by `id`.
- Never generate new remote IDs for existing local rows.
- Preserve local `created_at`.
- Use `device_id` and outbox IDs for retry idempotency if needed.

### Mapping caregiver attribution

- Local `caregivers` become remote `caregivers` display identities.
- Owner's current caregiver can link to `family_members.caregiver_id`.
- Invited users can either map to an existing caregiver display identity or create a new one.
- Historical logs keep `created_by_caregiver_id` even if the user account is removed later.

### Creating families

- First opt-in device creates one family per local data set.
- If multiple children exist locally, they join the same family unless user chooses otherwise.
- Family name can default to "My family" and be editable.

### Second caregiver joins

Future flow:

1. Owner/parent creates invitation.
2. Invitee authenticates.
3. Server validates token hash and expiry.
4. Server creates `family_members` row.
5. Invitee maps to a caregiver display identity.
6. Invitee device downloads current family data.

### Private Mode remains available

- Users can decline Family Sync forever.
- Users can disable sync later and keep a local copy.
- Removing remote sync should not require deleting local records.
- Account deletion should offer export and explain what happens to shared family data.

## 13. Implementation Roadmap

Small future PRs:

1. Add dev-only remote schema SQL files/docs. No runtime code.
2. Add `SyncSettings` model and UI concept docs. No network.
3. Add Supabase client behind disabled dev flag. Verify no initialization in Private Mode.
4. Add auth prototype behind dev flag with email magic link/OTP.
5. Add family/device registration behind dev flag.
6. Add one-table sync prototype, probably `children` or `poop_logs`.
7. Add conflict application tests against the existing `SyncConflictPolicy`.
8. Add full text/log sync behind dev flag.
9. Add RLS test harness with family A/family B fixtures.
10. Add caregiver invitation flow.
11. Add paid sync entitlement enforcement if product confirms paid add-on.
12. Add account deletion, export, revocation, and production privacy flows.
13. Production hardening: monitoring, rate limits, support diagnostics, security review.
14. Consider photo metadata-only UX; defer photo bytes unless users explicitly demand it and costs are modeled.

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Privacy trust loss | Users chose Tiny Tummy because it is local-first. | Keep Private Mode default, clear opt-in copy, no forced accounts, no surprise network calls. |
| User confusion between modes | Accidental cloud use or fear of losing local data. | Use distinct setup language, mode badge/settings, and confirmation before upload. |
| RLS mistakes | Cross-family data exposure. | RLS test suite, security review, no anon policies, helper functions, family A/B fixtures. |
| Sync conflicts | Lost edits or surprising deletes. | Use existing conflict policy, manual review for child deletion, stable IDs, tombstones. |
| Account deletion complexity | App Store/privacy compliance risk. | Build deletion before production Family Sync, define shared-family deletion semantics. |
| Caregiver revocation | Removed caregiver keeps access. | RLS checks active membership on every request, device revocation, token refresh handling. |
| Device theft | Local and remote data exposed. | OS secure token storage, device revocation, local app lock later if needed. |
| App Store privacy disclosures | Rejection or user distrust. | Update privacy policy and data safety labels only when sync ships. |
| Server cost if photos sync | Costs can jump by orders of magnitude. | Do not sync photo bytes by default; require explicit product/cost spike. |
| Support burden | Families, invites, conflicts, deletion are complex. | Stage rollout, logs without health payloads, self-serve export/delete, clear diagnostics. |
| Service role exposure | Total backend data compromise. | Never ship secret/service keys in client; use Edge Functions/server only. |
| Repeated full resync | Egress and database load. | Cursor sync, local cursors, batching, idempotency, sync health alerts. |
| Invalid references | Partial uploads fail or orphan records. | Dependency-ordered batches, same-family FK checks, deferred retry queue. |

## 15. Open Questions

- Is Family Sync a per-family subscription, per-account add-on, or included in a future family lifetime purchase?
- Should Family Sync support multiple families per account in v1?
- Should child deletion in Family Sync require remote owner approval or local manual review only?
- What is the minimum viable caregiver invitation flow: email link, code, QR, or local share sheet?
- Do daycare and clinician roles belong in v1 or later?
- How long should tombstones remain for families with inactive devices?
- Should sync support end-to-end encryption beyond Supabase-managed encryption in transit/at rest?
- What exact account deletion semantics should apply to shared family data?
- Should remote rows be partitioned by family, by time, or only indexed until scale requires partitioning?
- What support/debug metadata can be collected without storing child health payloads?

## Sources Checked

- Supabase billing and usage quotas: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase Row Level Security guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase passwordless email auth: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase anonymous sign-ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase API key/security guidance: https://supabase.com/docs/guides/getting-started/api-keys
- Apple account deletion guidance: https://developer.apple.com/support/offering-account-deletion-in-your-app
