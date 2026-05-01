import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getDatabasePath } from "@/lib/server-config";

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
  },
  {
    version: 2,
    name: "sync_files_session_fk_cascade",
    up: (db) => {
      db.exec(`
        CREATE TABLE sync_files_new (
          source_file TEXT PRIMARY KEY REFERENCES sessions(source_file) ON DELETE CASCADE,
          mtime_ms REAL NOT NULL,
          size_bytes INTEGER NOT NULL,
          last_indexed_at TEXT,
          last_error TEXT
        );
        INSERT INTO sync_files_new
          SELECT * FROM sync_files
          WHERE source_file IN (SELECT source_file FROM sessions);
        DROP TABLE sync_files;
        ALTER TABLE sync_files_new RENAME TO sync_files;
      `);
    }
  },
  {
    // Migration 2 FK was too strict: sync_files also tracks failed files that
    // never produce a session row, causing FOREIGN KEY constraint failures in
    // recordFailure(). Revert to no FK; session-cascade cleanup stays explicit
    // in the delete path (v0.4 candidate).
    version: 3,
    name: "sync_files_remove_session_fk",
    up: (db) => {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE sync_files_new (
          source_file TEXT PRIMARY KEY,
          mtime_ms REAL NOT NULL,
          size_bytes INTEGER NOT NULL,
          last_indexed_at TEXT,
          last_error TEXT
        );
        INSERT INTO sync_files_new SELECT * FROM sync_files;
        DROP TABLE sync_files;
        ALTER TABLE sync_files_new RENAME TO sync_files;
        PRAGMA foreign_keys = ON;
      `);
    }
  },
  {
    version: 4,
    name: "settings_split",
    up: (db) => {
      db.exec(`
        PRAGMA foreign_keys = OFF;

        CREATE TABLE sync_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE api_cache (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO sync_state (key, value, updated_at)
          SELECT key, value, updated_at FROM settings
          WHERE key IN ('indexer_version', 'last_sync_status');

        INSERT INTO api_cache (key, value, expires_at, updated_at)
          SELECT
            key,
            value,
            datetime(updated_at,
              CASE key
                WHEN 'pricing_snapshot'      THEN '+86400 seconds'
                WHEN 'official_usage_cache'  THEN '+180 seconds'
                ELSE '+0 seconds'
              END
            ),
            updated_at
          FROM settings
          WHERE key IN ('pricing_snapshot', 'official_usage_cache');

        DROP TABLE settings;

        PRAGMA foreign_keys = ON;
      `);
    }
  },
  {
    version: 5,
    name: "sync_files_last_error_check",
    up: (db) => {
      db.exec(`
        PRAGMA foreign_keys = OFF;

        CREATE TABLE sync_files_new (
          source_file     TEXT PRIMARY KEY,
          mtime_ms        REAL NOT NULL,
          size_bytes      INTEGER NOT NULL,
          last_indexed_at TEXT,
          last_error      TEXT CHECK (last_error IS NULL OR length(last_error) <= 512)
        );

        INSERT INTO sync_files_new (source_file, mtime_ms, size_bytes, last_indexed_at, last_error)
          SELECT source_file, mtime_ms, size_bytes, last_indexed_at,
                 CASE WHEN last_error IS NULL THEN NULL ELSE substr(last_error, 1, 512) END
          FROM sync_files;

        DROP TABLE sync_files;
        ALTER TABLE sync_files_new RENAME TO sync_files;

        PRAGMA foreign_keys = ON;
      `);
    }
  }
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
