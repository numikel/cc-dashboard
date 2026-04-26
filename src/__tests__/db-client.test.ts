import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDbForTests, getSqlite } from "@/lib/db/client";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-db-client-"));
  process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
});

afterEach(() => {
  closeDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
});

describe("getSqlite singleton + migration mutex", () => {
  it("returns the same connection across many calls (cache hit)", () => {
    const a = getSqlite();
    const b = getSqlite();
    const c = getSqlite();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("creates the database file with WAL pragma after first call", () => {
    const sqlite = getSqlite();
    const journalMode = sqlite.pragma("journal_mode", { simple: true });
    expect(String(journalMode).toLowerCase()).toBe("wal");

    const fkPragma = sqlite.pragma("foreign_keys", { simple: true });
    expect(Number(fkPragma)).toBe(1);
  });

  it("re-initializes when the database path env var changes between calls", () => {
    const first = getSqlite();
    const initialMigratedPath = process.env.DATABASE_PATH;

    process.env.DATABASE_PATH = path.join(tempDir, "another.db");
    const second = getSqlite();

    expect(second).not.toBe(first);
    process.env.DATABASE_PATH = initialMigratedPath;
  });

  it("survives many concurrent getSqlite calls without throwing", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, async () => getSqlite()));
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});
