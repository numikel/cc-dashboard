import { type ZodSchema } from "zod";
import { getSqlite } from "@/lib/db/client";

export function readCache<T>(key: string, schema: ZodSchema<T>, now = Date.now()): T | null {
  const row = getSqlite()
    .prepare("SELECT value, expires_at AS expiresAt FROM api_cache WHERE key = ?")
    .get(key) as { value: string; expiresAt: string } | undefined;

  if (!row) return null;

  const expiresAtMs = Date.parse(row.expiresAt);
  if (Number.isNaN(expiresAtMs) || now > expiresAtMs) return null;

  try {
    const parsed = schema.safeParse(JSON.parse(row.value));
    if (!parsed.success) {
      console.warn(`[api-cache] ${key} failed schema validation — cache miss`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown, ttlSeconds: number): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const updatedAt = now.toISOString();
  getSqlite()
    .prepare(
      `INSERT INTO api_cache (key, value, expires_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`
    )
    .run(key, JSON.stringify(value), expiresAt, updatedAt);
}

export function purgeExpired(now = Date.now()): number {
  const expiresAt = new Date(now).toISOString();
  const result = getSqlite()
    .prepare("DELETE FROM api_cache WHERE expires_at <= ?")
    .run(expiresAt);
  return result.changes;
}

export function clearCache(key?: string): number {
  if (key !== undefined) {
    const result = getSqlite().prepare("DELETE FROM api_cache WHERE key = ?").run(key);
    return result.changes;
  }
  const result = getSqlite().prepare("DELETE FROM api_cache").run();
  return result.changes;
}
