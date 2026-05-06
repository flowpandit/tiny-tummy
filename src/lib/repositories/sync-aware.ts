import type {
  ConflictDecision,
  ResolveConflictOptions,
  SyncConflictPolicy,
  SyncConflictResolution,
  SyncEntityType,
  SyncRecord,
} from "../sync-conflict-policy";
import {
  DEFAULT_SYNC_CONFLICT_POLICIES,
  chooseConflictAction,
  resolveConflict,
} from "../sync-conflict-policy";
import type { AppRepositories } from "./types";

export type SyncRuntimeMode = "private_mode" | "family_sync_ready";

export interface RemoteSyncAdapter {
  readonly id: string;
  readonly mode: "remote_sync_adapter";
  pushPendingChanges?(): Promise<void>;
  pullRemoteChanges?(): Promise<readonly SyncRecord[]>;
}

export interface SyncAwareRepositoryOptions {
  local: AppRepositories;
  runtimeMode: SyncRuntimeMode;
  remoteAdapter?: RemoteSyncAdapter | null;
  conflictPolicies?: Partial<Record<SyncEntityType, SyncConflictPolicy>>;
}

export interface SyncAwareRepositoryDesign {
  readonly runtimeMode: SyncRuntimeMode;
  readonly remoteAdapterAvailable: boolean;
  readonly remoteAdapterCanRun: boolean;
  readonly conflictPolicies: Record<SyncEntityType, SyncConflictPolicy>;
  chooseConflictAction(
    entityType: SyncEntityType,
    localRecord: SyncRecord | null,
    remoteRecord: SyncRecord | null,
    options?: ResolveConflictOptions,
  ): ConflictDecision;
  resolveConflict(
    entityType: SyncEntityType,
    localRecord: SyncRecord | null,
    remoteRecord: SyncRecord | null,
    options?: ResolveConflictOptions,
  ): SyncConflictResolution;
}

export type SyncAwareRepositories = AppRepositories & {
  readonly sync: SyncAwareRepositoryDesign;
};

function mergePolicies(
  overrides: Partial<Record<SyncEntityType, SyncConflictPolicy>> | undefined,
): Record<SyncEntityType, SyncConflictPolicy> {
  return {
    ...DEFAULT_SYNC_CONFLICT_POLICIES,
    ...overrides,
  };
}

export function createSyncAwareRepositoryDesign(options: SyncAwareRepositoryOptions): SyncAwareRepositoryDesign {
  const conflictPolicies = mergePolicies(options.conflictPolicies);
  const remoteAdapterAvailable = Boolean(options.remoteAdapter);
  const remoteAdapterCanRun = options.runtimeMode === "family_sync_ready" && remoteAdapterAvailable;

  return {
    runtimeMode: options.runtimeMode,
    remoteAdapterAvailable,
    remoteAdapterCanRun,
    conflictPolicies,
    chooseConflictAction(entityType, localRecord, remoteRecord, resolveOptions = {}) {
      return chooseConflictAction(
        entityType,
        localRecord,
        remoteRecord,
        resolveOptions.policy ?? conflictPolicies[entityType],
        resolveOptions,
      );
    },
    resolveConflict(entityType, localRecord, remoteRecord, resolveOptions = {}) {
      return resolveConflict(entityType, localRecord, remoteRecord, {
        ...resolveOptions,
        policy: resolveOptions.policy ?? conflictPolicies[entityType],
      });
    },
  };
}

export function createSyncAwareRepositories(options: SyncAwareRepositoryOptions): SyncAwareRepositories {
  return {
    ...options.local,
    sync: createSyncAwareRepositoryDesign(options),
  };
}
