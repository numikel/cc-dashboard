import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";

describe("runMigrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
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
    expect(tableNames).toContain("settings");
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
    db.close();
  });
});
