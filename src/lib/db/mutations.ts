import { invoke } from "@tauri-apps/api/core";
import { nowISO } from "../utils";
import { getDb } from "./connection";

export type DbExecutor = {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
};

export type SqlStatement = {
  query: string;
  values?: unknown[];
};

export type SyncableSoftDeleteTable =
  | "children"
  | "caregivers"
  | "child_caregivers"
  | "poop_logs"
  | "diaper_logs"
  | "diet_logs"
  | "sleep_logs"
  | "symptom_logs"
  | "episodes"
  | "episode_events"
  | "growth_logs"
  | "milestone_logs"
  | "quick_presets"
  | "alerts";

export type LocalOnlySoftDeleteTable = "attachments";

export type SoftDeleteTable = SyncableSoftDeleteTable | LocalOnlySoftDeleteTable;

export const CHILD_SCOPED_SOFT_DELETE_TABLES: readonly SoftDeleteTable[] = [
  "alerts",
  "symptom_logs",
  "episode_events",
  "episodes",
  "growth_logs",
  "sleep_logs",
  "milestone_logs",
  "quick_presets",
  "diet_logs",
  "diaper_logs",
  "poop_logs",
  "attachments",
  "child_caregivers",
];

const SYNCABLE_SOFT_DELETE_TABLES = new Set<SoftDeleteTable>([
  "children",
  "caregivers",
  "child_caregivers",
  "poop_logs",
  "diaper_logs",
  "diet_logs",
  "sleep_logs",
  "symptom_logs",
  "episodes",
  "episode_events",
  "growth_logs",
  "milestone_logs",
  "quick_presets",
  "alerts",
]);

const SOFT_DELETE_TABLES = new Set<SoftDeleteTable>([
  ...SYNCABLE_SOFT_DELETE_TABLES,
  "attachments",
]);

let activeTransactionStatements: SqlStatement[] | null = null;

function assertSoftDeleteTable(table: SoftDeleteTable): void {
  if (!SOFT_DELETE_TABLES.has(table)) {
    throw new Error(`Unsupported soft-delete table: ${table}`);
  }
}

function buildSoftDeleteAssignments(table: SoftDeleteTable, options?: { includeChildDeactivation?: boolean }): string {
  const assignments = ["deleted_at = ?", "updated_at = ?"];

  if (table === "children" && options?.includeChildDeactivation) {
    assignments.push("is_active = 0");
  }

  if (SYNCABLE_SOFT_DELETE_TABLES.has(table)) {
    assignments.push("sync_status = 'local'", "sync_version = sync_version + 1");
  }

  return assignments.join(", ");
}

export function buildSoftDeleteSql(
  table: SoftDeleteTable,
  whereClause: string,
  options?: { includeChildDeactivation?: boolean },
): string {
  assertSoftDeleteTable(table);
  return `UPDATE ${table} SET ${buildSoftDeleteAssignments(table, options)} WHERE ${whereClause} AND deleted_at IS NULL`;
}

export async function softDeleteWhere(
  conn: DbExecutor,
  table: SoftDeleteTable,
  whereClause: string,
  whereParams: unknown[],
  deletedAt = nowISO(),
  options?: { includeChildDeactivation?: boolean },
): Promise<void> {
  await executeMutation(
    conn,
    buildSoftDeleteSql(table, whereClause, options),
    [deletedAt, deletedAt, ...whereParams],
  );
}

export async function softDeleteById(
  conn: DbExecutor,
  table: SoftDeleteTable,
  id: string,
  deletedAt = nowISO(),
  options?: { includeChildDeactivation?: boolean },
): Promise<void> {
  await softDeleteWhere(conn, table, "id = ?", [id], deletedAt, options);
}

export async function softDeleteChildScopedRows(
  conn: DbExecutor,
  childId: string,
  deletedAt = nowISO(),
): Promise<void> {
  for (const table of CHILD_SCOPED_SOFT_DELETE_TABLES) {
    await softDeleteWhere(conn, table, "child_id = ?", [childId], deletedAt);
  }
}

export async function withTransaction<T>(
  conn: DbExecutor,
  action: () => Promise<T>,
): Promise<T> {
  if (activeTransactionStatements) {
    return action();
  }

  const statements: SqlStatement[] = [];
  activeTransactionStatements = statements;

  try {
    const result = await action();
    activeTransactionStatements = null;
    await executeQueuedTransaction(conn, statements);
    return result;
  } catch (error) {
    activeTransactionStatements = null;
    throw error;
  }
}

export async function runDbTransaction<T>(action: () => Promise<T>): Promise<T> {
  const conn = await getDb();
  return withTransaction(conn, action);
}

export async function executeMutation(
  conn: DbExecutor,
  query: string,
  bindValues: unknown[] = [],
): Promise<unknown> {
  if (activeTransactionStatements) {
    activeTransactionStatements.push({ query, values: bindValues });
    return { rowsAffected: 0 };
  }

  return conn.execute(query, bindValues);
}

function canUseNativeTransactionCommand(): boolean {
  return typeof window !== "undefined"
    && Boolean((window as typeof window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

async function executeQueuedTransaction(conn: DbExecutor, statements: SqlStatement[]): Promise<void> {
  if (statements.length === 0) return;

  if (canUseNativeTransactionCommand()) {
    await invoke("execute_sqlite_transaction", { statements });
    return;
  }

  await conn.execute("BEGIN IMMEDIATE");
  try {
    for (const statement of statements) {
      await conn.execute(statement.query, statement.values ?? []);
    }
    await conn.execute("COMMIT");
  } catch (error) {
    try {
      await conn.execute("ROLLBACK");
    } catch {
      // Preserve the original mutation error; rollback failures are secondary.
    }
    throw error;
  }
}
