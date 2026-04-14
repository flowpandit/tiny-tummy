import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }

  if (!dbPromise) {
    // App startup mounts multiple providers that all touch the DB at once.
    // Share a single in-flight load so mobile does not race multiple SQLite opens.
    dbPromise = Database.load("sqlite:tinytummy.db")
      .then((conn) => {
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
