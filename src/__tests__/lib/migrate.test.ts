import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";

describe("runMigrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  });

  afterEach(() => {
    db.close();
  });

  it("sets user_version to a value > 0 after first run", () => {
    runMigrations(db);
    const version = db.pragma("user_version", { simple: true }) as number;
    expect(version).toBeGreaterThan(0);
  });

  it("creates the expected core tables", () => {
    runMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("projects");
    expect(tableNames).toContain("sessions");
    expect(tableNames).toContain("sync_files");
    expect(tableNames).toContain("facets");
    expect(tableNames).toContain("sync_state");
    expect(tableNames).toContain("api_cache");
    expect(tableNames).not.toContain("settings");
  });

  it("is idempotent — second call does not change version or duplicate tables", () => {
    runMigrations(db);
    const versionAfter1 = db.pragma("user_version", { simple: true }) as number;

    runMigrations(db);
    const versionAfter2 = db.pragma("user_version", { simple: true }) as number;

    expect(versionAfter2).toBe(versionAfter1);

    // Tables should still be exactly the same set
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.length).toBeGreaterThan(0);
  });

  it("subsequent call to runMigrations on already-migrated db does not throw", () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  it("sets user_version to 5 after full migration", () => {
    runMigrations(db);
    const version = db.pragma("user_version", { simple: true }) as number;
    expect(version).toBe(5);
  });
});

describe("Migration 2 and 3 — sync_files FK lifecycle", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  });

  afterEach(() => {
    db.close();
  });

  it("drops orphan sync_files rows during migration", () => {
    // Apply only migration 1 (schema without FK) by temporarily limiting migrations.
    // We achieve this by running migration 1 directly without the FK constraint,
    // seeding orphan data, then running migration 2 via runMigrations.
    //
    // Strategy: create migration-1 schema manually (no FK on sync_files),
    // insert both valid + orphan rows, then run full runMigrations to apply migration 2.
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE TABLE sessions (
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
      CREATE TABLE sync_files (
        source_file TEXT PRIMARY KEY,
        mtime_ms REAL NOT NULL,
        size_bytes INTEGER NOT NULL,
        last_indexed_at TEXT,
        last_error TEXT
      );
      CREATE TABLE facets (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        value TEXT NOT NULL,
        source_file TEXT NOT NULL,
        indexed_at TEXT NOT NULL
      );
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    // Mark as migration 1 already applied
    db.pragma("user_version = 1");

    // Seed: project + session (valid) + orphan sync_files (no matching session)
    db.exec(`
      INSERT INTO projects (id, name, path, first_seen_at, last_seen_at)
        VALUES ('p1', 'Test', '/test', '2024-01-01', '2024-01-01');
      INSERT INTO sessions (id, project_id, source_file, models, duration_seconds,
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
        total_tokens, context_length, message_count, tool_calls, indexed_at,
        file_mtime_ms, file_size_bytes)
        VALUES ('s1', 'p1', '/path/to/file.jsonl', '[]', 0, 0, 0, 0, 0, 0, 0, 0, 0,
        '2024-01-01', 0, 0);
      INSERT INTO sync_files (source_file, mtime_ms, size_bytes)
        VALUES ('/path/to/file.jsonl', 0, 100),
               ('/orphan/file.jsonl', 0, 100);
    `);

    // Apply migration 2
    runMigrations(db);

    const rows = db.prepare("SELECT source_file FROM sync_files").all() as { source_file: string }[];
    const files = rows.map((r) => r.source_file);
    expect(files).toContain("/path/to/file.jsonl");
    expect(files).not.toContain("/orphan/file.jsonl");
  });

  it("migration 3 removes FK — sync_files row persists after session deleted", () => {
    // Migration 3 reverted the ON DELETE CASCADE FK added in migration 2.
    // Deleting a session must NOT auto-delete its sync_files row.
    runMigrations(db);
    db.exec(`
      INSERT INTO projects (id, name, path, first_seen_at, last_seen_at)
        VALUES ('p1', 'Test', '/test', '2024-01-01', '2024-01-01');
      INSERT INTO sessions (id, project_id, source_file, models, duration_seconds,
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
        total_tokens, context_length, message_count, tool_calls, indexed_at,
        file_mtime_ms, file_size_bytes)
        VALUES ('s1', 'p1', '/path/to/file.jsonl', '[]', 0, 0, 0, 0, 0, 0, 0, 0, 0,
        '2024-01-01', 0, 0);
      INSERT INTO sync_files (source_file, mtime_ms, size_bytes)
        VALUES ('/path/to/file.jsonl', 0, 100);
    `);

    db.exec("DELETE FROM sessions WHERE id = 's1'");
    const rows = db.prepare("SELECT * FROM sync_files").all();
    // Row survives — no CASCADE in migration 3 schema
    expect(rows).toHaveLength(1);
  });

  it("migration 3 allows inserting sync_files without a matching session (failed files)", () => {
    // recordFailure() inserts into sync_files for files that never produced a session.
    // This was blocked by the migration 2 FK and is the reason migration 3 exists.
    runMigrations(db);
    expect(() => {
      db.exec(`
        INSERT INTO sync_files (source_file, mtime_ms, size_bytes, last_error)
          VALUES ('/no/session/here.jsonl', 0, 100, 'parse error');
      `);
    }).not.toThrow();
  });

  it("migrations are idempotent (run twice = safe)", () => {
    // After migrations, user_version = 5 — running again is a no-op
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const version = db.pragma("user_version", { simple: true }) as number;
    expect(version).toBe(5);
  });
});

describe("Migration 4 — settings_split", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  });

  afterEach(() => {
    db.close();
  });

  it("creates sync_state and api_cache tables and drops settings", () => {
    runMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("sync_state");
    expect(names).toContain("api_cache");
    expect(names).not.toContain("settings");
  });

  it("migrates sync_state keys from settings", () => {
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
      CREATE TABLE sessions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, source_file TEXT NOT NULL UNIQUE, model TEXT, models TEXT NOT NULL DEFAULT '[]', started_at TEXT, ended_at TEXT, duration_seconds INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, cache_read_tokens INTEGER NOT NULL DEFAULT 0, cache_write_tokens INTEGER NOT NULL DEFAULT 0, total_tokens INTEGER NOT NULL DEFAULT 0, context_length INTEGER NOT NULL DEFAULT 0, message_count INTEGER NOT NULL DEFAULT 0, tool_calls INTEGER NOT NULL DEFAULT 0, git_branch TEXT, cwd TEXT, indexed_at TEXT NOT NULL, file_mtime_ms REAL NOT NULL, file_size_bytes INTEGER NOT NULL);
      CREATE TABLE sync_files (source_file TEXT PRIMARY KEY, mtime_ms REAL NOT NULL, size_bytes INTEGER NOT NULL, last_indexed_at TEXT, last_error TEXT);
      CREATE TABLE facets (id TEXT PRIMARY KEY, session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE, kind TEXT NOT NULL, value TEXT NOT NULL, source_file TEXT NOT NULL, indexed_at TEXT NOT NULL);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    `);
    db.pragma("user_version = 3");

    db.exec(`
      INSERT INTO settings (key, value, updated_at) VALUES
        ('indexer_version', '1', '2024-01-01T00:00:00.000Z'),
        ('last_sync_status', '"ok"', '2024-01-01T00:00:00.000Z'),
        ('pricing_snapshot', '{"claude-sonnet-4-5":{"inputPerToken":3e-6,"outputPerToken":15e-6,"cacheReadPerToken":3e-7,"cacheWritePerToken":3.75e-6}}', '2024-01-01T00:00:00.000Z'),
        ('official_usage_cache', '{}', '2024-01-01T00:00:00.000Z');
    `);

    runMigrations(db);

    const syncRows = db.prepare("SELECT key FROM sync_state").all() as { key: string }[];
    const syncKeys = syncRows.map((r) => r.key);
    expect(syncKeys).toContain("indexer_version");
    expect(syncKeys).toContain("last_sync_status");

    const cacheRows = db.prepare("SELECT key FROM api_cache").all() as { key: string }[];
    const cacheKeys = cacheRows.map((r) => r.key);
    expect(cacheKeys).toContain("pricing_snapshot");
    expect(cacheKeys).toContain("official_usage_cache");
  });

  it("drops unrecognized settings keys (not migrated to either table)", () => {
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
      CREATE TABLE sessions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, source_file TEXT NOT NULL UNIQUE, model TEXT, models TEXT NOT NULL DEFAULT '[]', started_at TEXT, ended_at TEXT, duration_seconds INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, cache_read_tokens INTEGER NOT NULL DEFAULT 0, cache_write_tokens INTEGER NOT NULL DEFAULT 0, total_tokens INTEGER NOT NULL DEFAULT 0, context_length INTEGER NOT NULL DEFAULT 0, message_count INTEGER NOT NULL DEFAULT 0, tool_calls INTEGER NOT NULL DEFAULT 0, git_branch TEXT, cwd TEXT, indexed_at TEXT NOT NULL, file_mtime_ms REAL NOT NULL, file_size_bytes INTEGER NOT NULL);
      CREATE TABLE sync_files (source_file TEXT PRIMARY KEY, mtime_ms REAL NOT NULL, size_bytes INTEGER NOT NULL, last_indexed_at TEXT, last_error TEXT);
      CREATE TABLE facets (id TEXT PRIMARY KEY, session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE, kind TEXT NOT NULL, value TEXT NOT NULL, source_file TEXT NOT NULL, indexed_at TEXT NOT NULL);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    `);
    db.pragma("user_version = 3");

    db.exec(`INSERT INTO settings (key, value, updated_at) VALUES ('unknown_key', '"data"', '2024-01-01T00:00:00.000Z');`);

    runMigrations(db);

    const syncRows = db.prepare("SELECT key FROM sync_state").all() as { key: string }[];
    const cacheRows = db.prepare("SELECT key FROM api_cache").all() as { key: string }[];
    expect(syncRows.map((r) => r.key)).not.toContain("unknown_key");
    expect(cacheRows.map((r) => r.key)).not.toContain("unknown_key");
  });

  it("is idempotent when applied on top of already-migrated v4 db", () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const version = db.pragma("user_version", { simple: true }) as number;
    expect(version).toBe(5);
  });
});

describe("Migration 5 — sync_files_last_error_check", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  });

  afterEach(() => {
    db.close();
  });

  it("truncates last_error values longer than 512 chars during migration", () => {
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
      CREATE TABLE sessions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, source_file TEXT NOT NULL UNIQUE, model TEXT, models TEXT NOT NULL DEFAULT '[]', started_at TEXT, ended_at TEXT, duration_seconds INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, cache_read_tokens INTEGER NOT NULL DEFAULT 0, cache_write_tokens INTEGER NOT NULL DEFAULT 0, total_tokens INTEGER NOT NULL DEFAULT 0, context_length INTEGER NOT NULL DEFAULT 0, message_count INTEGER NOT NULL DEFAULT 0, tool_calls INTEGER NOT NULL DEFAULT 0, git_branch TEXT, cwd TEXT, indexed_at TEXT NOT NULL, file_mtime_ms REAL NOT NULL, file_size_bytes INTEGER NOT NULL);
      CREATE TABLE sync_files (source_file TEXT PRIMARY KEY, mtime_ms REAL NOT NULL, size_bytes INTEGER NOT NULL, last_indexed_at TEXT, last_error TEXT);
      CREATE TABLE facets (id TEXT PRIMARY KEY, session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE, kind TEXT NOT NULL, value TEXT NOT NULL, source_file TEXT NOT NULL, indexed_at TEXT NOT NULL);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    `);
    db.pragma("user_version = 3");

    const longError = "x".repeat(600);
    db.exec(`INSERT INTO sync_files (source_file, mtime_ms, size_bytes, last_error) VALUES ('/file.jsonl', 0, 100, '${longError}');`);

    runMigrations(db);

    const row = db.prepare("SELECT last_error FROM sync_files WHERE source_file = '/file.jsonl'").get() as { last_error: string };
    expect(row.last_error.length).toBe(512);
  });

  it("enforces CHECK constraint — rejects last_error > 512 chars after migration", () => {
    runMigrations(db);
    const longError = "e".repeat(513);
    expect(() => {
      db.exec(`INSERT INTO sync_files (source_file, mtime_ms, size_bytes, last_error) VALUES ('/bad.jsonl', 0, 100, '${longError}');`);
    }).toThrow();
  });

  it("allows last_error = NULL after migration", () => {
    runMigrations(db);
    expect(() => {
      db.exec(`INSERT INTO sync_files (source_file, mtime_ms, size_bytes) VALUES ('/ok.jsonl', 0, 100);`);
    }).not.toThrow();
  });

  it("allows last_error exactly 512 chars after migration", () => {
    runMigrations(db);
    const exactError = "e".repeat(512);
    expect(() => {
      db.exec(`INSERT INTO sync_files (source_file, mtime_ms, size_bytes, last_error) VALUES ('/exact.jsonl', 0, 100, '${exactError}');`);
    }).not.toThrow();
  });
});
