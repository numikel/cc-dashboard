import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function getDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  // Docker canonical mount — detected at runtime so the image works without env vars
  if (fs.existsSync("/data")) return "/data";
  // Native fallback: Windows / Linux / Mac developer run
  return path.join(os.homedir(), ".cc-dashboard");
}

export function ensureDataDirWritable(): void {
  const dir = getDataDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    console.warn(
      `[cc-dashboard] Data directory "${dir}" is not writable. ` +
        `Set DATA_DIR or DATABASE_PATH environment variable. ` +
        `See docs/decisions/0007-data-directory-resolution.md`
    );
  }
}

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(getDataDir(), "dashboard.db");
}

export function getClaudeDataDir(): string {
  return (
    process.env.CLAUDE_CONFIG_DIR ??
    process.env.CLAUDE_DATA_DIR ??
    process.env.CLAUDE_DATA_PATH ??
    "/claude-data"
  );
}
