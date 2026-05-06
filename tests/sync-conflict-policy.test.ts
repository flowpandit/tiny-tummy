import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CAREGIVER_CONTACT_SYNC_POLICY,
  DEFAULT_SYNC_CONFLICT_POLICIES,
  chooseConflictAction,
  compareRecordVersions,
  mergeEpisodeEventsByStableId,
  resolveConflict,
  sanitizeSyncPayload,
  shouldSyncField,
  type SyncRecord,
} from "../src/lib/sync-conflict-policy.ts";
import { createSyncAwareRepositoryDesign, type AppRepositories } from "../src/lib/repositories/index.ts";

function record(overrides: SyncRecord = {}): SyncRecord {
  return {
    id: "record-1",
    child_id: "child-1",
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-01T08:00:00.000Z",
    deleted_at: null,
    sync_version: 1,
    created_by_caregiver_id: "caregiver-original",
    updated_by_caregiver_id: "caregiver-original",
    notes: "Original",
    ...overrides,
  };
}

test("last-write-wins chooses newer updated_at and preserves creation metadata", () => {
  const local = record({
    updated_at: "2026-05-01T08:00:00.000Z",
    created_at: "2026-04-30T08:00:00.000Z",
    created_by_caregiver_id: "caregiver-local-create",
    updated_by_caregiver_id: "caregiver-local-update",
    notes: "Local",
  });
  const remote = record({
    updated_at: "2026-05-01T09:00:00.000Z",
    created_at: "2026-05-01T07:00:00.000Z",
    created_by_caregiver_id: "caregiver-remote-create",
    updated_by_caregiver_id: "caregiver-remote-update",
    notes: "Remote",
  });

  const resolution = resolveConflict("poop_log", local, remote);

  assert.equal(resolution.action, "apply_remote");
  assert.equal(resolution.cause, "remote_newer");
  assert.equal(resolution.resolvedRecord?.notes, "Remote");
  assert.equal(resolution.resolvedRecord?.created_at, "2026-04-30T08:00:00.000Z");
  assert.equal(resolution.resolvedRecord?.created_by_caregiver_id, "caregiver-local-create");
  assert.equal(resolution.resolvedRecord?.updated_by_caregiver_id, "caregiver-remote-update");
});

test("equal updated_at chooses higher sync_version", () => {
  const comparison = compareRecordVersions(
    record({ sync_version: 2 }),
    record({ sync_version: 3 }),
  );
  const resolution = resolveConflict(
    "diet_log",
    record({ sync_version: 2, notes: "Local" }),
    record({ sync_version: 3, notes: "Remote" }),
  );

  assert.equal(comparison.winner, "remote");
  assert.equal(resolution.action, "apply_remote");
  assert.equal(resolution.resolvedRecord?.notes, "Remote");
});

test("equal timestamp and sync_version keeps local", () => {
  const resolution = resolveConflict(
    "sleep_log",
    record({ sync_version: 4, notes: "Local" }),
    record({ sync_version: 4, notes: "Remote" }),
  );

  assert.equal(resolution.action, "keep_local");
  assert.equal(resolution.cause, "both_changed");
  assert.equal(resolution.resolvedRecord?.notes, "Local");
});

test("local deleted versus remote updated lets the clearly newer remote edit win", () => {
  const resolution = resolveConflict(
    "symptom_log",
    record({
      deleted_at: "2026-05-01T10:00:00.000Z",
      updated_at: "2026-05-01T10:00:00.000Z",
      notes: "Deleted locally",
    }),
    record({
      updated_at: "2026-05-01T11:00:00.000Z",
      notes: "Remote edit after delete",
    }),
  );

  assert.equal(resolution.action, "apply_remote");
  assert.equal(resolution.cause, "remote_newer");
  assert.equal(resolution.resolvedRecord?.notes, "Remote edit after delete");
});

test("remote deleted versus local updated keeps the clearly newer local edit", () => {
  const resolution = resolveConflict(
    "growth_log",
    record({
      updated_at: "2026-05-01T11:00:00.000Z",
      notes: "Local edit after delete",
    }),
    record({
      deleted_at: "2026-05-01T10:00:00.000Z",
      updated_at: "2026-05-01T10:00:00.000Z",
      notes: "Deleted remotely",
    }),
  );

  assert.equal(resolution.action, "keep_local");
  assert.equal(resolution.cause, "local_newer");
  assert.equal(resolution.resolvedRecord?.notes, "Local edit after delete");
});

test("deleted wins rule applies to clinical logs when tombstone is newer", () => {
  const local = record({
    deleted_at: "2026-05-01T12:00:00.000Z",
    updated_at: "2026-05-01T12:00:00.000Z",
  });
  const remote = record({
    updated_at: "2026-05-01T11:00:00.000Z",
    notes: "Older remote edit",
  });

  const decision = chooseConflictAction("milestone_log", local, remote);
  const resolution = resolveConflict("milestone_log", local, remote);

  assert.equal(decision.action, "deleted_wins");
  assert.equal(decision.cause, "local_deleted_remote_changed");
  assert.equal(resolution.resolvedRecord?.deleted_at, "2026-05-01T12:00:00.000Z");
});

test("child deletion conflicts require manual review before future sync applies them", () => {
  const resolution = resolveConflict(
    "child",
    record({ id: "child-1", updated_at: "2026-05-01T11:00:00.000Z", name: "Local baby" }),
    record({
      id: "child-1",
      deleted_at: "2026-05-01T12:00:00.000Z",
      updated_at: "2026-05-01T12:00:00.000Z",
      name: "Remote baby",
    }),
    { hasLocalUnsyncedChildData: true },
  );

  assert.equal(resolution.action, "manual_review");
  assert.equal(resolution.cause, "remote_deleted_local_changed");
  assert.equal(resolution.resolvedRecord, null);
});

test("episode events merge by stable ID instead of replacing the whole history", () => {
  const localEvents = [
    record({ id: "event-1", logged_at: "2026-05-01T08:00:00.000Z", title: "Local only" }),
    record({ id: "event-2", logged_at: "2026-05-01T09:00:00.000Z", title: "Local old", sync_version: 1 }),
  ];
  const remoteEvents = [
    record({ id: "event-2", logged_at: "2026-05-01T09:00:00.000Z", title: "Remote newer", sync_version: 2 }),
    record({ id: "event-3", logged_at: "2026-05-01T10:00:00.000Z", title: "Remote only" }),
  ];

  const merged = mergeEpisodeEventsByStableId(localEvents, remoteEvents);

  assert.equal(merged.action, "merge_fields");
  assert.deepEqual(merged.records.map((event) => event.id), ["event-1", "event-2", "event-3"]);
  assert.equal(merged.records.find((event) => event.id === "event-2")?.title, "Remote newer");
});

test("caregiver delete keeps a soft tombstone that can preserve historical attribution", () => {
  const policy = DEFAULT_SYNC_CONFLICT_POLICIES.caregiver;
  const resolution = resolveConflict(
    "caregiver",
    {
      id: "caregiver-1",
      display_name: "Mum",
      role: "parent",
      relationship: "parent",
      created_at: "2026-05-01T08:00:00.000Z",
      updated_at: "2026-05-01T09:00:00.000Z",
      deleted_at: null,
      sync_version: 1,
    },
    {
      id: "caregiver-1",
      display_name: "Mum",
      role: "parent",
      relationship: "parent",
      created_at: "2026-05-01T08:00:00.000Z",
      updated_at: "2026-05-01T10:00:00.000Z",
      deleted_at: "2026-05-01T10:00:00.000Z",
      sync_version: 2,
    },
  );

  assert.equal(policy.preserveHistoricalAttribution, true);
  assert.equal(resolution.action, "deleted_wins");
  assert.equal(resolution.resolvedRecord?.id, "caregiver-1");
  assert.equal(resolution.resolvedRecord?.deleted_at, "2026-05-01T10:00:00.000Z");
});

test("attachments marked local_only are ignored by conflict resolution and payload sync", () => {
  const attachment = {
    id: "attachment-1",
    owner_table: "poop_logs",
    owner_id: "poop-1",
    child_id: "child-1",
    local_path: "/Users/example/private/photo.jpg",
    mime_type: "image/jpeg",
    file_size: 12345,
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-01T08:00:00.000Z",
    deleted_at: null,
    local_only: 1,
    attachment_sync_policy: "local_only",
  };

  const decision = chooseConflictAction("attachment", attachment, { ...attachment, local_only: 0 });

  assert.equal(decision.action, "ignore_remote");
  assert.equal(decision.cause, "attachment_local_only");
  assert.equal(sanitizeSyncPayload("attachment", attachment), null);
});

test("sanitizeSyncPayload excludes photo bytes and absolute file paths", () => {
  const poopPayload = sanitizeSyncPayload("poop_log", {
    ...record(),
    logged_at: "2026-05-01T08:00:00.000Z",
    photo_path: "/Users/example/private/poop.jpg",
    file_bytes: "base64-photo",
  });
  const attachmentPayload = sanitizeSyncPayload("attachment", {
    id: "attachment-2",
    owner_table: "poop_logs",
    owner_id: "poop-1",
    child_id: "child-1",
    local_path: "/Users/example/private/poop.jpg",
    mime_type: "image/jpeg",
    file_size: 123,
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-01T08:00:00.000Z",
    deleted_at: null,
    local_only: 0,
    attachment_sync_policy: "metadata_only",
    bytes: "raw-bytes",
  });

  assert.equal(poopPayload?.photo_path, undefined);
  assert.equal(poopPayload?.file_bytes, undefined);
  assert.equal(attachmentPayload?.local_path, undefined);
  assert.equal(attachmentPayload?.bytes, undefined);
  assert.equal(attachmentPayload?.mime_type, "image/jpeg");
});

test("sanitizeSyncPayload excludes settings, payment data, and outbox data", () => {
  const payload = sanitizeSyncPayload("child", {
    id: "child-1",
    name: "Mila",
    date_of_birth: "2026-04-01",
    sex: null,
    feeding_type: "mixed",
    avatar_color: "#2563EB",
    is_active: 1,
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-01T08:00:00.000Z",
    deleted_at: null,
    sync_version: 1,
    app_settings: [{ key: "theme", value: "light" }],
    sync_outbox: [{ id: "outbox-1" }],
    premium_unlocked: "1",
    premium_product_id: "debug",
  });

  assert.equal(payload?.name, "Mila");
  assert.equal(payload?.app_settings, undefined);
  assert.equal(payload?.sync_outbox, undefined);
  assert.equal(payload?.premium_unlocked, undefined);
  assert.equal(payload?.premium_product_id, undefined);
});

test("caregiver phone and email are local-only until a future explicit consent policy exists", () => {
  const payload = sanitizeSyncPayload("caregiver", {
    id: "caregiver-1",
    display_name: "Dad",
    role: "parent",
    relationship: "parent",
    email: "dad@example.test",
    phone: "+15555550123",
    avatar_color: "#2563EB",
    is_primary: 0,
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-01T08:00:00.000Z",
    deleted_at: null,
    sync_version: 1,
  });

  assert.equal(DEFAULT_CAREGIVER_CONTACT_SYNC_POLICY, "local_only_without_explicit_future_consent");
  assert.equal(shouldSyncField("caregiver", "email"), false);
  assert.equal(shouldSyncField("caregiver", "phone"), false);
  assert.equal(payload?.email, undefined);
  assert.equal(payload?.phone, undefined);
  assert.equal(payload?.display_name, "Dad");
});

test("shouldSyncField follows entity allowlists", () => {
  assert.equal(shouldSyncField("diaper_log", "linked_poop_log_id"), true);
  assert.equal(shouldSyncField("diaper_log", "photo_path"), false);
  assert.equal(shouldSyncField("attachment", "mime_type"), true);
  assert.equal(shouldSyncField("attachment", "local_path"), false);
  assert.equal(shouldSyncField("quick_preset", "draft_json"), true);
  assert.equal(shouldSyncField("quick_preset", "sync_outbox"), false);
});

test("conflict utilities and sync-aware repository design do not make network calls", () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("network should not be used");
  }) as typeof fetch;

  try {
    const design = createSyncAwareRepositoryDesign({
      local: {} as AppRepositories,
      runtimeMode: "private_mode",
      remoteAdapter: {
        id: "future-adapter",
        mode: "remote_sync_adapter",
        pushPendingChanges: async () => {
          throw new Error("adapter should not run");
        },
      },
    });
    const resolution = design.resolveConflict(
      "quick_preset",
      record({ label: "Local", updated_at: "2026-05-01T09:00:00.000Z" }),
      record({ label: "Remote", updated_at: "2026-05-01T08:00:00.000Z" }),
    );

    assert.equal(design.remoteAdapterAvailable, true);
    assert.equal(design.remoteAdapterCanRun, false);
    assert.equal(resolution.action, "keep_local");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
