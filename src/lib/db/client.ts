import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { z } from "zod";
import { getDatabasePath, ensureDataDirWritable } from "@/lib/server-config";
import * as schema from "@/lib/db/schema";
import { runMigrations } from "@/lib/db/migrate";

type Sqlite = Database.Database;

let sqlite: Sqlite | null = null;
let migratedPath: string | null = null;
let dbLock: { fd: number; path: string } | null = null;
let exitHandlersRegistered = false;
let initializing = false;

const LockFileSchema = z.object({
  pid: z.number().int().optional(),
  startedAt: z.string().optional(),
  databasePath: z.string().optional()
});

function isDbLockEnabled(): boolean {
  return process.env.CC_DASHBOARD_ENABLE_DB_LOCK === "1";
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
    return code === "EPERM";
  }
}

function releaseDbLock(): void {
  if (!dbLock) {
    return;
  }

  const current = dbLock;
  dbLock = null;
  try {
    fs.closeSync(current.fd);
  } catch {
    // The process is exiting or the descriptor was already closed.
  }

  try {
    const raw = fs.readFileSync(/* turbopackIgnore: true */ current.path, "utf8");
    const parsed = LockFileSchema.safeParse(JSON.parse(raw));
    const ownerPid = parsed.success ? parsed.data.pid : undefined;
    if (ownerPid === process.pid) {
      fs.unlinkSync(/* turbopackIgnore: true */ current.path);
    }
  } catch {
    // Stale or already removed lock files are cleaned up on the next startup.
  }
}

function registerExitHandlers(): void {
  if (exitHandlersRegistered) {
    return;
  }

  exitHandlersRegistered = true;
  process.once("exit", releaseDbLock);
  process.once("SIGINT", () => {
    releaseDbLock();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    releaseDbLock();
    process.exit(143);
  });
}

function sleepSync(ms: number): void {
  // Busy-wait during DB lock acquisition — acceptable: runs once at startup only.
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin */
  }
}

function acquireDbLock(databasePath: string): void {
  const lockPath = `${databasePath}.lock`;
  if (dbLock?.path === lockPath) {
    return;
  }

  releaseDbLock();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const fd = fs.openSync(/* turbopackIgnore: true */ lockPath, "wx");
      fs.writeFileSync(
        fd,
        JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), databasePath }, null, 2)
      );
      dbLock = { fd, path: lockPath };
      registerExitHandlers();
      return;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "EEXIST") {
        throw error;
      }

      try {
        const raw = fs.readFileSync(/* turbopackIgnore: true */ lockPath, "utf8");
        const parsed = LockFileSchema.safeParse(JSON.parse(raw));
        // Treat an unparseable lock file as stale — take ownership.
        const ownerPid = parsed.success ? parsed.data.pid : undefined;
        if (!ownerPid || !isProcessRunning(ownerPid)) {
          fs.unlinkSync(/* turbopackIgnore: true */ lockPath);
          continue; // stale lock removed — retry immediately
        }
      } catch {
        fs.unlinkSync(/* turbopackIgnore: true */ lockPath);
        continue;
      }

      // Live process holds the lock — give it 50ms before retrying
      if (attempt < 2) {
        sleepSync(50);
        continue;
      }
      throw new Error(`Dashboard database is already in use by another process. Lock file: ${lockPath}`);
    }
  }
}

export function getSqlite(): Sqlite {
  const databasePath = getDatabasePath();
  if (sqlite && migratedPath === databasePath) {
    return sqlite;
  }

  // Re-entry guard: detects if a future async refactor lets two callers race
  // through migration. better-sqlite3 is synchronous so today this code path
  // is atomic from the JS event-loop perspective, but the flag documents the
  // invariant and fails loudly if it's ever broken.
  if (initializing) {
    throw new Error("getSqlite re-entered during initialization");
  }

  initializing = true;
  try {
    sqlite?.close();
    sqlite = null;
    ensureDataDirWritable();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    if (isDbLockEnabled()) {
      acquireDbLock(databasePath);
    } else {
      releaseDbLock();
    }

    // Open the database ONCE and run migrations on the same instance.
    // This eliminates the open→close→reopen window that existed when
    // migrateDatabase() opened its own separate Database handle (#005).
    const next = new Database(databasePath);
    next.pragma("journal_mode = WAL");
    next.pragma("foreign_keys = ON");
    next.pragma("busy_timeout = 5000");
    runMigrations(next);

    sqlite = next;
    migratedPath = databasePath;

    return next;
  } finally {
    initializing = false;
  }
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}

export function closeDbForTests(): void {
  sqlite?.close();
  sqlite = null;
  migratedPath = null;
  releaseDbLock();
}
