import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { scanFacetFiles } from "@/lib/claude/scanner";
import { assertMetadataOnly, FORBIDDEN_METADATA_KEYS } from "@/lib/privacy/assert-metadata-only";

const SAFE_KEYS = new Set([
  "id",
  "session_id",
  "sessionId",
  "status",
  "label",
  "category",
  "score",
  "rating",
  "timestamp",
  "created_at",
  "updated_at"
]);

export interface SafeFacet {
  id: string;
  sessionId: string | null;
  kind: string;
  value: string;
  sourceFile: string;
}

function scalarToString(value: unknown): string | null {
  if (typeof value === "string") {
    return value.length <= 120 ? value : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function isUnsafeObject(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(isUnsafeObject);
  }

  return Object.entries(value).some(([key, nested]) => FORBIDDEN_METADATA_KEYS.has(key.toLowerCase()) || isUnsafeObject(nested));
}

export async function parseSafeFacetFile(sourceFile: string): Promise<SafeFacet[]> {
  const raw = await fs.readFile(sourceFile, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (isUnsafeObject(parsed)) {
    return [];
  }

  assertMetadataOnly(parsed);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }

  const entries = Object.entries(parsed);
  const sessionId =
    scalarToString((parsed as Record<string, unknown>).session_id) ??
    scalarToString((parsed as Record<string, unknown>).sessionId);

  return entries.flatMap(([key, value]) => {
    if (!SAFE_KEYS.has(key) || key === "id" || key === "session_id" || key === "sessionId") {
      return [];
    }

    const safeValue = scalarToString(value);
    if (!safeValue) {
      return [];
    }

    const id = createHash("sha256").update(`${sourceFile}:${key}:${safeValue}`).digest("hex").slice(0, 24);
    return {
      id,
      sessionId,
      kind: key,
      value: safeValue,
      sourceFile
    };
  });
}

export async function parseSafeFacets(rootDir?: string): Promise<SafeFacet[]> {
  const files = await scanFacetFiles(rootDir);
  const parsed = await Promise.all(
    files.map(async (file) => {
      try {
        return await parseSafeFacetFile(file.path);
      } catch {
        return [];
      }
    })
  );
  return parsed.flat().sort((a, b) => path.basename(a.sourceFile).localeCompare(path.basename(b.sourceFile)));
}
