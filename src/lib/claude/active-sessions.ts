import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getClaudeDataDir } from "@/lib/config";
import { sanitizeErrorMessage } from "@/lib/privacy/sanitize-error";
import type { ActiveSession } from "@/lib/claude/types";

const ActiveSessionFileSchema = z.object({
  id: z.string().optional(),
  session_id: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  pid: z.number().optional(),
  cwd: z.string().optional(),
  updated_at: z.string().optional(),
  updatedAt: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional()
});

export type ActiveSessionFile = z.infer<typeof ActiveSessionFileSchema>;

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function capName(name: string | null): string | null {
  if (name === null) return null;
  return name.length > 80 ? name.slice(0, 80) : name;
}

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

export async function getActiveSessions(rootDir = getClaudeDataDir()): Promise<ActiveSession[]> {
  const files = await listJsonFiles(path.join(rootDir, "sessions"));
  const sessions = await Promise.all(
    files.map(async (sourceFile) => {
      try {
        const raw = await fs.readFile(sourceFile, "utf8");
        const parsed = ActiveSessionFileSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          console.warn(
            `[active-sessions] Skipping malformed session file ${path.basename(sourceFile)}: ${sanitizeErrorMessage(parsed.error.message)}`
          );
          return null;
        }
        const data = parsed.data;
        const id = stringOrNull(data.id) ?? stringOrNull(data.session_id) ?? path.basename(sourceFile, ".json");

        return {
          id,
          name: capName(stringOrNull(data.name)),
          status: stringOrNull(data.status),
          pid: numberOrNull(data.pid),
          cwd: stringOrNull(data.cwd),
          updatedAt: stringOrNull(data.updated_at) ?? stringOrNull(data.updatedAt),
          sourceFile
        } satisfies ActiveSession;
      } catch {
        return null;
      }
    })
  );

  return sessions.filter((session): session is ActiveSession => session !== null);
}
