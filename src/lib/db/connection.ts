import Database from "@tauri-apps/plugin-sql";
import { withTimeout } from "../async";

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }

  if (!dbPromise) {
    // App startup mounts multiple providers that all touch the DB at once.
    // Share a single in-flight load so mobile does not race multiple SQLite opens.
    dbPromise = withTimeout(
      Database.load("sqlite:tinytummy.db"),
      15000,
      "Database connection",
    )
      .then(async (conn) => {
        // WAL mode is much faster for concurrent access and prevents many locking issues
        await conn.execute("PRAGMA journal_mode = WAL;");
        // Set a busy timeout so SQLite waits if another write is in progress
        await conn.execute("PRAGMA busy_timeout = 5000;");
        db = conn;
        return conn;
      })
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
  }

  return dbPromise;
}
