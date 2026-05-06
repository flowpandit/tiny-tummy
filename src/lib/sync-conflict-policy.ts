export const SYNC_ENTITY_TYPES = [
  "child",
  "caregiver",
  "child_caregiver",
  "poop_log",
  "diaper_log",
  "diet_log",
  "sleep_log",
  "symptom_log",
  "episode",
  "episode_event",
  "growth_log",
  "milestone_log",
  "quick_preset",
  "attachment",
] as const;

export type SyncEntityType = typeof SYNC_ENTITY_TYPES[number];

export const CONFLICT_ACTIONS = [
  "apply_remote",
  "keep_local",
  "merge_fields",
  "deleted_wins",
  "manual_review",
  "ignore_remote",
] as const;

export type ConflictAction = typeof CONFLICT_ACTIONS[number];

export const CONFLICT_CAUSES = [
  "local_newer",
  "remote_newer",
  "both_changed",
  "local_deleted_remote_changed",
  "remote_deleted_local_changed",
  "attachment_local_only",
  "invalid_reference",
  "unsupported_entity",
] as const;

export type ConflictCause = typeof CONFLICT_CAUSES[number];

export type VersionWinner = "local" | "remote" | "tie";
export type SyncSide = "local" | "remote" | "merged" | "manual_review" | "none";
export type SyncRecord = Record<string, unknown>;

export interface RecordVersionComparison {
  winner: VersionWinner;
  cause: Exclude<ConflictCause, "attachment_local_only" | "invalid_reference" | "unsupported_entity">;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  localSyncVersion: number;
  remoteSyncVersion: number;
}

export interface SyncConflictPolicy {
  entityType: SyncEntityType;
  fields: readonly string[];
  localOnlyFields?: readonly string[];
  preserveFields?: readonly string[];
  deletion: "deleted_wins_if_not_newer" | "manual_review_for_child" | "relationship_delete" | "soft_delete_preserve_attribution" | "last_write_wins";
  defaultAction: ConflictAction;
  equalVersionAction: ConflictAction;
  contactPolicy?: "local_only_without_explicit_future_consent";
  attachmentPolicy?: "local_only_bytes_metadata_optional";
  mergeByStableId?: boolean;
  preserveHistoricalAttribution?: boolean;
}

export interface ConflictDecision {
  entityType: SyncEntityType;
  action: ConflictAction;
  cause: ConflictCause;
  winner: SyncSide;
  policy: SyncConflictPolicy;
  notes: string[];
}

export interface SyncConflictResolution extends ConflictDecision {
  resolvedRecord: SyncRecord | null;
}

export interface ResolveConflictOptions {
  policy?: SyncConflictPolicy;
  hasLocalUnsyncedChildData?: boolean;
}

export interface MergeEpisodeEventsResult {
  entityType: "episode_event";
  action: "merge_fields";
  cause: "both_changed";
  records: SyncRecord[];
  notes: string[];
}

const SYNC_METADATA_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "sync_version",
] as const;

const ATTRIBUTION_FIELDS = [
  "created_by_caregiver_id",
  "updated_by_caregiver_id",
] as const;

const CLINICAL_LOG_FIELDS = [
  ...SYNC_METADATA_FIELDS,
  "child_id",
  ...ATTRIBUTION_FIELDS,
] as const;

const PHOTO_FIELD_DENYLIST = [
  "photo_path",
  "local_path",
  "file_path",
  "absolute_path",
  "file_bytes",
  "bytes",
  "base64",
  "blob",
  "data_url",
] as const;

const NEVER_SYNC_FIELDS = new Set<string>([
  ...PHOTO_FIELD_DENYLIST,
  "sync_status",
  "app_settings",
  "settings",
  "sync_outbox",
  "payload_json",
  "premium_unlocked",
  "premium_platform",
  "premium_product_id",
  "trial_started_at",
  "trial_last_seen_at",
  "developer_feature_entitlements",
  "app_is_premium",
  "app_first_launched_at",
  "email",
  "phone",
]);

export const DEFAULT_CAREGIVER_CONTACT_SYNC_POLICY = "local_only_without_explicit_future_consent" as const;

export const SYNC_FIELDS_BY_ENTITY = {
  child: [
    ...SYNC_METADATA_FIELDS,
    "name",
    "date_of_birth",
    "sex",
    "feeding_type",
    "avatar_color",
    "is_active",
  ],
  caregiver: [
    ...SYNC_METADATA_FIELDS,
    "display_name",
    "role",
    "relationship",
    "avatar_color",
    "is_primary",
  ],
  child_caregiver: [
    ...SYNC_METADATA_FIELDS,
    "child_id",
    "caregiver_id",
    "relationship_to_child",
    "permissions",
  ],
  poop_log: [
    ...CLINICAL_LOG_FIELDS,
    "logged_at",
    "stool_type",
    "color",
    "size",
    "is_no_poop",
    "notes",
  ],
  diaper_log: [
    ...CLINICAL_LOG_FIELDS,
    "logged_at",
    "diaper_type",
    "urine_color",
    "stool_type",
    "color",
    "size",
    "notes",
    "linked_poop_log_id",
  ],
  diet_log: [
    ...CLINICAL_LOG_FIELDS,
    "logged_at",
    "food_type",
    "food_name",
    "notes",
    "amount_ml",
    "duration_minutes",
    "breast_side",
    "bottle_content",
    "reaction_notes",
    "is_constipation_support",
  ],
  sleep_log: [
    ...CLINICAL_LOG_FIELDS,
    "sleep_type",
    "started_at",
    "ended_at",
    "notes",
  ],
  symptom_log: [
    ...CLINICAL_LOG_FIELDS,
    "episode_id",
    "symptom_type",
    "severity",
    "temperature_c",
    "temperature_method",
    "logged_at",
    "notes",
  ],
  episode: [
    ...CLINICAL_LOG_FIELDS,
    "episode_type",
    "status",
    "started_at",
    "ended_at",
    "summary",
    "outcome",
  ],
  episode_event: [
    ...CLINICAL_LOG_FIELDS,
    "episode_id",
    "event_type",
    "title",
    "notes",
    "logged_at",
    "source_kind",
    "source_id",
  ],
  growth_log: [
    ...CLINICAL_LOG_FIELDS,
    "measured_at",
    "weight_kg",
    "height_cm",
    "head_circumference_cm",
    "notes",
  ],
  milestone_log: [
    ...CLINICAL_LOG_FIELDS,
    "milestone_type",
    "logged_at",
    "notes",
  ],
  quick_preset: [
    ...SYNC_METADATA_FIELDS,
    "child_id",
    "kind",
    "label",
    "description",
    "draft_json",
    "sort_order",
    "is_enabled",
  ],
  attachment: [
    ...SYNC_METADATA_FIELDS,
    "owner_table",
    "owner_id",
    "child_id",
    "mime_type",
    "file_size",
    "attachment_sync_policy",
  ],
} as const satisfies Record<SyncEntityType, readonly string[]>;

const CLINICAL_LOG_ENTITY_TYPES = new Set<SyncEntityType>([
  "poop_log",
  "diaper_log",
  "diet_log",
  "sleep_log",
  "symptom_log",
  "growth_log",
  "milestone_log",
]);

export const DEFAULT_SYNC_CONFLICT_POLICIES: Record<SyncEntityType, SyncConflictPolicy> = {
  child: {
    entityType: "child",
    fields: SYNC_FIELDS_BY_ENTITY.child,
    preserveFields: ["created_at"],
    deletion: "manual_review_for_child",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  caregiver: {
    entityType: "caregiver",
    fields: SYNC_FIELDS_BY_ENTITY.caregiver,
    localOnlyFields: ["email", "phone"],
    preserveFields: ["created_at"],
    deletion: "soft_delete_preserve_attribution",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
    contactPolicy: DEFAULT_CAREGIVER_CONTACT_SYNC_POLICY,
    preserveHistoricalAttribution: true,
  },
  child_caregiver: {
    entityType: "child_caregiver",
    fields: SYNC_FIELDS_BY_ENTITY.child_caregiver,
    preserveFields: ["created_at"],
    deletion: "relationship_delete",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  poop_log: {
    entityType: "poop_log",
    fields: SYNC_FIELDS_BY_ENTITY.poop_log,
    localOnlyFields: ["photo_path"],
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  diaper_log: {
    entityType: "diaper_log",
    fields: SYNC_FIELDS_BY_ENTITY.diaper_log,
    localOnlyFields: ["photo_path"],
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  diet_log: {
    entityType: "diet_log",
    fields: SYNC_FIELDS_BY_ENTITY.diet_log,
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  sleep_log: {
    entityType: "sleep_log",
    fields: SYNC_FIELDS_BY_ENTITY.sleep_log,
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  symptom_log: {
    entityType: "symptom_log",
    fields: SYNC_FIELDS_BY_ENTITY.symptom_log,
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  episode: {
    entityType: "episode",
    fields: SYNC_FIELDS_BY_ENTITY.episode,
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "last_write_wins",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  episode_event: {
    entityType: "episode_event",
    fields: SYNC_FIELDS_BY_ENTITY.episode_event,
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
    mergeByStableId: true,
  },
  growth_log: {
    entityType: "growth_log",
    fields: SYNC_FIELDS_BY_ENTITY.growth_log,
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  milestone_log: {
    entityType: "milestone_log",
    fields: SYNC_FIELDS_BY_ENTITY.milestone_log,
    preserveFields: ["created_at", "created_by_caregiver_id"],
    deletion: "deleted_wins_if_not_newer",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  quick_preset: {
    entityType: "quick_preset",
    fields: SYNC_FIELDS_BY_ENTITY.quick_preset,
    preserveFields: ["created_at"],
    deletion: "last_write_wins",
    defaultAction: "apply_remote",
    equalVersionAction: "keep_local",
  },
  attachment: {
    entityType: "attachment",
    fields: SYNC_FIELDS_BY_ENTITY.attachment,
    localOnlyFields: PHOTO_FIELD_DENYLIST,
    preserveFields: ["created_at"],
    deletion: "last_write_wins",
    defaultAction: "ignore_remote",
    equalVersionAction: "ignore_remote",
    attachmentPolicy: "local_only_bytes_metadata_optional",
  },
};

function isDeleted(record: SyncRecord | null | undefined): boolean {
  return typeof record?.deleted_at === "string" && record.deleted_at.length > 0;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function timestampString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function syncVersion(record: SyncRecord | null | undefined): number {
  return typeof record?.sync_version === "number" && Number.isFinite(record.sync_version)
    ? record.sync_version
    : 0;
}

function changeTime(record: SyncRecord | null | undefined): number | null {
  if (!record) return null;
  return parseTimestamp(isDeleted(record) ? record.deleted_at : record.updated_at);
}

function getPolicy(entityType: SyncEntityType, policy?: SyncConflictPolicy): SyncConflictPolicy {
  return policy ?? DEFAULT_SYNC_CONFLICT_POLICIES[entityType];
}

function attachmentIsLocalOnly(record: SyncRecord | null | undefined): boolean {
  if (!record) return false;
  return record.local_only === 1
    || record.local_only === true
    || record.attachment_sync_policy === "local_only";
}

function isLocalOnlyRecord(record: SyncRecord | null | undefined): boolean {
  return record?.local_only === 1 || record?.local_only === true;
}

function buildDecision(
  entityType: SyncEntityType,
  action: ConflictAction,
  cause: ConflictCause,
  winner: SyncSide,
  policy: SyncConflictPolicy,
  notes: string[],
): ConflictDecision {
  return {
    entityType,
    action,
    cause,
    winner,
    policy,
    notes,
  };
}

function isClinicalLog(entityType: SyncEntityType): boolean {
  return CLINICAL_LOG_ENTITY_TYPES.has(entityType);
}

function decideByVersion(
  entityType: SyncEntityType,
  localRecord: SyncRecord,
  remoteRecord: SyncRecord,
  policy: SyncConflictPolicy,
): ConflictDecision {
  const comparison = compareRecordVersions(localRecord, remoteRecord);

  if (comparison.winner === "remote") {
    return buildDecision(entityType, "apply_remote", comparison.cause, "remote", policy, [
      "Remote row has the newer updated_at timestamp or higher sync_version.",
    ]);
  }

  if (comparison.winner === "local") {
    return buildDecision(entityType, "keep_local", comparison.cause, "local", policy, [
      "Local row has the newer updated_at timestamp or higher sync_version.",
    ]);
  }

  return buildDecision(entityType, policy.equalVersionAction, "both_changed", "local", policy, [
    "updated_at and sync_version are tied; local wins to avoid an unexpected overwrite.",
  ]);
}

function decideDeletionConflict(
  entityType: SyncEntityType,
  localRecord: SyncRecord,
  remoteRecord: SyncRecord,
  policy: SyncConflictPolicy,
  options: ResolveConflictOptions,
): ConflictDecision | null {
  const localDeleted = isDeleted(localRecord);
  const remoteDeleted = isDeleted(remoteRecord);

  if (!localDeleted && !remoteDeleted) return null;

  if (entityType === "attachment" && (attachmentIsLocalOnly(localRecord) || attachmentIsLocalOnly(remoteRecord))) {
    return buildDecision(entityType, "ignore_remote", "attachment_local_only", "local", policy, [
      "Attachment is marked local_only; file bytes and local photo paths are not sync inputs.",
    ]);
  }

  if (entityType === "child" && localDeleted !== remoteDeleted) {
    return buildDecision(entityType, "manual_review", localDeleted ? "local_deleted_remote_changed" : "remote_deleted_local_changed", "manual_review", policy, [
      options.hasLocalUnsyncedChildData
        ? "Child delete conflicts with local unsynced child-scoped data and needs a future review UI."
        : "Child deletion is destructive enough to require future review instead of silent conflict resolution.",
    ]);
  }

  if (localDeleted && remoteDeleted) {
    const comparison = compareRecordVersions(localRecord, remoteRecord);
    return buildDecision(
      entityType,
      "deleted_wins",
      comparison.winner === "remote" ? "remote_newer" : "local_newer",
      comparison.winner === "remote" ? "remote" : "local",
      policy,
      ["Both sides are deleted; keep the newest tombstone metadata."],
    );
  }

  const deletedRecord = localDeleted ? localRecord : remoteRecord;
  const changedRecord = localDeleted ? remoteRecord : localRecord;
  const deletedTime = changeTime(deletedRecord);
  const changedTime = parseTimestamp(changedRecord.updated_at);
  const changedSide: SyncSide = localDeleted ? "remote" : "local";
  const deletedSide: SyncSide = localDeleted ? "local" : "remote";
  const cause: ConflictCause = localDeleted ? "local_deleted_remote_changed" : "remote_deleted_local_changed";

  if (policy.deletion === "manual_review_for_child") {
    return buildDecision(entityType, "manual_review", cause, "manual_review", policy, [
      "Entity deletion policy requires future review before applying destructive changes.",
    ]);
  }

  if (
    policy.deletion === "deleted_wins_if_not_newer"
    && changedTime !== null
    && deletedTime !== null
    && changedTime > deletedTime
  ) {
    return buildDecision(
      entityType,
      changedSide === "remote" ? "apply_remote" : "keep_local",
      changedSide === "remote" ? "remote_newer" : "local_newer",
      changedSide,
      policy,
      ["The non-deleted row changed after the tombstone, so the newer edit wins."],
    );
  }

  return buildDecision(entityType, "deleted_wins", cause, deletedSide, policy, [
    isClinicalLog(entityType)
      ? "Clinical log tombstone wins unless the other side is clearly newer."
      : "Soft delete wins for this conflict.",
  ]);
}

function copyAllowedFields(source: SyncRecord, fields: readonly string[]): SyncRecord {
  const result: SyncRecord = {};

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  }

  return result;
}

function applyPreservedFields(
  target: SyncRecord,
  localRecord: SyncRecord | null,
  policy: SyncConflictPolicy,
): SyncRecord {
  if (!localRecord || !policy.preserveFields) return target;

  const result = { ...target };
  for (const field of policy.preserveFields) {
    if (Object.prototype.hasOwnProperty.call(localRecord, field)) {
      result[field] = localRecord[field];
    }
  }

  return result;
}

export function compareRecordVersions(
  localRecord: SyncRecord | null,
  remoteRecord: SyncRecord | null,
): RecordVersionComparison {
  const localUpdatedAt = timestampString(localRecord?.updated_at);
  const remoteUpdatedAt = timestampString(remoteRecord?.updated_at);
  const localTime = parseTimestamp(localUpdatedAt);
  const remoteTime = parseTimestamp(remoteUpdatedAt);
  const localSyncVersion = syncVersion(localRecord);
  const remoteSyncVersion = syncVersion(remoteRecord);

  if (localTime !== null && remoteTime !== null) {
    if (localTime > remoteTime) {
      return { winner: "local", cause: "local_newer", localUpdatedAt, remoteUpdatedAt, localSyncVersion, remoteSyncVersion };
    }
    if (remoteTime > localTime) {
      return { winner: "remote", cause: "remote_newer", localUpdatedAt, remoteUpdatedAt, localSyncVersion, remoteSyncVersion };
    }
  }

  if (localTime !== null && remoteTime === null) {
    return { winner: "local", cause: "local_newer", localUpdatedAt, remoteUpdatedAt, localSyncVersion, remoteSyncVersion };
  }

  if (remoteTime !== null && localTime === null) {
    return { winner: "remote", cause: "remote_newer", localUpdatedAt, remoteUpdatedAt, localSyncVersion, remoteSyncVersion };
  }

  if (localSyncVersion > remoteSyncVersion) {
    return { winner: "local", cause: "local_newer", localUpdatedAt, remoteUpdatedAt, localSyncVersion, remoteSyncVersion };
  }

  if (remoteSyncVersion > localSyncVersion) {
    return { winner: "remote", cause: "remote_newer", localUpdatedAt, remoteUpdatedAt, localSyncVersion, remoteSyncVersion };
  }

  return { winner: "tie", cause: "both_changed", localUpdatedAt, remoteUpdatedAt, localSyncVersion, remoteSyncVersion };
}

export function chooseConflictAction(
  entityType: SyncEntityType,
  localRecord: SyncRecord | null,
  remoteRecord: SyncRecord | null,
  policy: SyncConflictPolicy = DEFAULT_SYNC_CONFLICT_POLICIES[entityType],
  options: ResolveConflictOptions = {},
): ConflictDecision {
  if (!remoteRecord) {
    return buildDecision(entityType, "keep_local", "local_newer", "local", policy, [
      "No remote row was provided; keep local.",
    ]);
  }

  if (!localRecord) {
    if (entityType === "attachment" && attachmentIsLocalOnly(remoteRecord)) {
      return buildDecision(entityType, "ignore_remote", "attachment_local_only", "none", policy, [
        "Remote attachment metadata is local_only and cannot hydrate local file bytes.",
      ]);
    }

    return buildDecision(entityType, "apply_remote", "remote_newer", "remote", policy, [
      "No local row exists; remote row can be inserted by a future sync adapter.",
    ]);
  }

  if (entityType === "attachment" && (attachmentIsLocalOnly(localRecord) || attachmentIsLocalOnly(remoteRecord))) {
    return buildDecision(entityType, "ignore_remote", "attachment_local_only", "local", policy, [
      "Attachment is marked local_only; conflict resolution never expects photo bytes.",
    ]);
  }

  if (isLocalOnlyRecord(localRecord)) {
    return buildDecision(entityType, "keep_local", "local_newer", "local", policy, [
      "Local row is marked local_only and should not be overwritten by remote data.",
    ]);
  }

  const deletionDecision = decideDeletionConflict(entityType, localRecord, remoteRecord, policy, options);
  if (deletionDecision) return deletionDecision;

  return decideByVersion(entityType, localRecord, remoteRecord, policy);
}

export function resolveConflict(
  entityType: SyncEntityType,
  localRecord: SyncRecord | null,
  remoteRecord: SyncRecord | null,
  options: ResolveConflictOptions = {},
): SyncConflictResolution {
  const policy = getPolicy(entityType, options.policy);
  const decision = chooseConflictAction(entityType, localRecord, remoteRecord, policy, options);

  if (decision.action === "manual_review" || decision.action === "ignore_remote") {
    return { ...decision, resolvedRecord: decision.winner === "local" ? localRecord : null };
  }

  if (decision.action === "keep_local") {
    return { ...decision, resolvedRecord: localRecord ? copyAllowedFields(localRecord, policy.fields) : null };
  }

  if (decision.action === "apply_remote") {
    const remotePayload = remoteRecord ? copyAllowedFields(remoteRecord, policy.fields) : null;
    return {
      ...decision,
      resolvedRecord: remotePayload ? applyPreservedFields(remotePayload, localRecord, policy) : null,
    };
  }

  if (decision.action === "deleted_wins") {
    const deletedRecord = decision.winner === "remote" ? remoteRecord : localRecord;
    const payload = deletedRecord ? copyAllowedFields(deletedRecord, policy.fields) : null;
    return {
      ...decision,
      resolvedRecord: payload ? applyPreservedFields(payload, localRecord, policy) : null,
    };
  }

  return {
    ...decision,
    resolvedRecord: localRecord ? copyAllowedFields(localRecord, policy.fields) : null,
  };
}

export function shouldSyncField(entityType: SyncEntityType, fieldName: string): boolean {
  if (NEVER_SYNC_FIELDS.has(fieldName)) return false;
  return (SYNC_FIELDS_BY_ENTITY[entityType] as readonly string[]).includes(fieldName);
}

export function sanitizeSyncPayload(
  entityType: SyncEntityType,
  record: SyncRecord | null | undefined,
): SyncRecord | null {
  if (!record) return null;

  if (isLocalOnlyRecord(record)) return null;

  if (entityType === "attachment" && attachmentIsLocalOnly(record)) return null;

  const payload: SyncRecord = {};
  for (const field of SYNC_FIELDS_BY_ENTITY[entityType]) {
    if (!shouldSyncField(entityType, field)) continue;
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      payload[field] = record[field];
    }
  }

  return payload;
}

export function mergeEpisodeEventsByStableId(
  localEvents: readonly SyncRecord[],
  remoteEvents: readonly SyncRecord[],
  options: ResolveConflictOptions = {},
): MergeEpisodeEventsResult {
  const byId = new Map<string, SyncRecord>();

  for (const event of localEvents) {
    if (typeof event.id === "string" && event.id) byId.set(event.id, event);
  }

  for (const remoteEvent of remoteEvents) {
    if (typeof remoteEvent.id !== "string" || remoteEvent.id === "") continue;
    const localEvent = byId.get(remoteEvent.id);
    if (!localEvent) {
      const sanitized = sanitizeSyncPayload("episode_event", remoteEvent);
      if (sanitized) byId.set(remoteEvent.id, sanitized);
      continue;
    }

    const resolution = resolveConflict("episode_event", localEvent, remoteEvent, options);
    if (resolution.resolvedRecord) byId.set(remoteEvent.id, resolution.resolvedRecord);
  }

  return {
    entityType: "episode_event",
    action: "merge_fields",
    cause: "both_changed",
    records: [...byId.values()].sort((left, right) => {
      const leftTime = parseTimestamp(left.logged_at) ?? parseTimestamp(left.created_at) ?? 0;
      const rightTime = parseTimestamp(right.logged_at) ?? parseTimestamp(right.created_at) ?? 0;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return String(left.id ?? "").localeCompare(String(right.id ?? ""));
    }),
    notes: ["Episode events are append-like: merge by stable id, resolve only rows with matching ids."],
  };
}
