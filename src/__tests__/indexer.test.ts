import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getOverviewStats } from "@/lib/api/queries";
import { closeDbForTests } from "@/lib/db/client";
import { runIncrementalSync } from "@/lib/sync/indexer";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-dashboard-"));
  process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
  process.env.CLAUDE_DATA_DIR = path.join(tempDir, ".claude");
  fs.mkdirSync(path.join(process.env.CLAUDE_DATA_DIR, "projects", "demo"), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), "src", "test", "fixtures", "claude-session.jsonl"),
    path.join(process.env.CLAUDE_DATA_DIR, "projects", "demo", "session.jsonl")
  );
});

afterEach(() => {
  closeDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
  delete process.env.CLAUDE_DATA_DIR;
});

describe("runIncrementalSync", () => {
  it("indexes new files and skips unchanged files on the second run", async () => {
    const first = await runIncrementalSync();
    const second = await runIncrementalSync();
    const stats = getOverviewStats();

    expect(first.indexedFiles).toBe(1);
    expect(second.skippedFiles).toBe(1);
    expect(stats.sessions).toBe(1);
    expect(stats.totalTokens).toBe(132);
  });
});
