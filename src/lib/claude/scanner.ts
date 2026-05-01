import fs from "node:fs/promises";
import path from "node:path";
import { getClaudeDataDir } from "@/lib/server-config";
import type { ScannedFile } from "@/lib/claude/types";

async function exists(dir: string): Promise<boolean> {
  try {
    await fs.access(dir);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir: string, predicate: (filePath: string) => boolean): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, predicate)));
      continue;
    }

    if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function scanClaudeJsonlFiles(rootDir = getClaudeDataDir()): Promise<ScannedFile[]> {
  const projectsDir = path.join(rootDir, "projects");
  if (!(await exists(projectsDir))) {
    return [];
  }

  const files = await walk(projectsDir, (filePath) => filePath.endsWith(".jsonl"));
  const scanned = await Promise.all(
    files.map(async (filePath) => {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        mtimeMs: stats.mtimeMs,
        sizeBytes: stats.size
      };
    })
  );

  return scanned.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export async function scanFacetFiles(rootDir = getClaudeDataDir()): Promise<ScannedFile[]> {
  const facetsDir = path.join(rootDir, "usage-data", "facets");
  if (!(await exists(facetsDir))) {
    return [];
  }

  const files = await walk(facetsDir, (filePath) => filePath.endsWith(".json"));
  return Promise.all(
    files.map(async (filePath) => {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        mtimeMs: stats.mtimeMs,
        sizeBytes: stats.size
      };
    })
  );
}
