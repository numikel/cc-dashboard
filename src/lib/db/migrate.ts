import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getDatabasePath } from "@/lib/config";

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: (db) => {
      db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS projects_path_idx ON projects(path);

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source_file TEXT NOT NULL UNIQUE,
        model TEXT,
        models TEXT NOT NULL DEFAULT '[]',
        started_at TEXT,
        ended_at TEXT,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        cache_write_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        context_length INTEGER NOT NULL DEFAULT 0,
        message_count INTEGER NOT NULL DEFAULT 0,
        tool_calls INTEGER NOT NULL DEFAULT 0,
        git_branch TEXT,
        cwd TEXT,
        indexed_at TEXT NOT NULL,
        file_mtime_ms REAL NOT NULL,
        file_size_bytes INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS sessions_project_started_idx ON sessions(project_id, started_at);
      CREATE INDEX IF NOT EXISTS sessions_started_idx ON sessions(started_at);
      CREATE INDEX IF NOT EXISTS sessions_model_idx ON sessions(model);

      CREATE TABLE IF NOT EXISTS sync_files (
        source_file TEXT PRIMARY KEY,
        mtime_ms REAL NOT NULL,
        size_bytes INTEGER NOT NULL,
        last_indexed_at TEXT,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS facets (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        value TEXT NOT NULL,
        source_file TEXT NOT NULL,
        indexed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS facets_session_idx ON facets(session_id);
      CREATE INDEX IF NOT EXISTS facets_kind_idx ON facets(kind);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    }
  }
  // Future migrations append here, e.g.:
  // {
  //   version: 2,
  //   name: "add_foo_column",
  //   up: (db) => { db.exec(`ALTER TABLE sessions ADD COLUMN foo TEXT`); }
  // }
];

/**
 * Run pending migrations against an already-open Database instance.
 * Uses `pragma user_version` to track which migrations have been applied.
 * Each migration is wrapped in a transaction so failures roll back the
 * schema change AND the version bump atomically.
 */
export function runMigrations(db: Database.Database): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (const m of migrations) {
    if (m.version > current) {
      const applyMigration = db.transaction(() => {
        m.up(db);
        db.pragma(`user_version = ${m.version}`);
      });
      applyMigration();
    }
  }
}

/**
 * Standalone entry point: opens a Database, runs migrations, then closes it.
 * Used when you need to migrate without keeping the connection open
 * (e.g. the old CLI invocation below).
 */
export function migrateDatabase(databasePath = getDatabasePath()): void {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  try {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    runMigrations(db);
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  migrateDatabase();
}
