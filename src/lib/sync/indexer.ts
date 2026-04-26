import { createHash } from "node:crypto";
import { z } from "zod";
import { getSqlite } from "@/lib/db/client";
import { parseClaudeJsonlSession } from "@/lib/claude/jsonl-parser";
import { parseSafeFacets } from "@/lib/claude/facets-parser";
import { scanClaudeJsonlFiles } from "@/lib/claude/scanner";
import { sanitizeErrorMessage, sanitizeFileLabel } from "@/lib/privacy/sanitize-error";
import type { ParsedSession, ScannedFile } from "@/lib/claude/types";

// Bump when the indexer changes how it derives metadata from JSONL (e.g. schema
// of facets, computed fields on ParsedSession, or what counts as "skip-eligible").
// Files whose stored indexerVersion differs are re-indexed even if mtime/size match.
const INDEXER_VERSION = "2";

export interface SyncStatus {
  scannedFiles: number;
  indexedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  indexedFacets: number;
  startedAt: string;
  finishedAt: string;
  errors: Array<{ file: string; message: string }>;
}

const SyncStatusSchema = z.object({
  scannedFiles: z.number().optional().default(0),
  indexedFiles: z.number().optional().default(0),
  skippedFiles: z.number().optional().default(0),
  failedFiles: z.number().optional().default(0),
  indexedFacets: z.number().optional().default(0),
  startedAt: z.string().optional().default(""),
  finishedAt: z.string().optional().default(""),
  errors: z.array(z.object({ file: z.string(), message: z.string() })).optional().default([])
});

export { SyncStatusSchema };

function projectId(projectPath: string): string {
  return createHash("sha256").update(projectPath).digest("hex").slice(0, 16);
}

interface SyncFileRow {
  mtime_ms: number;
  size_bytes: number;
  last_error: string | null;
}

/**
 * Build a closure that checks whether a file should be skipped.
 * Prepare() calls and the indexer_version lookup are hoisted out of the
 * per-file hot loop so they are executed only once per sync run.
 */
function buildShouldSkip(): (file: ScannedFile) => boolean {
  const sqlite = getSqlite();

  const versionRow = sqlite
    .prepare("SELECT value FROM settings WHERE key = 'indexer_version'")
    .get() as { value: string } | undefined;

  if (versionRow?.value !== INDEXER_VERSION) {
    // Wrong indexer version — nothing can be skipped; return a no-op predicate.
    return () => false;
  }

  // Pre-load all known sync_files rows into a Map for O(1) per-file lookup.
  const syncRows = sqlite
    .prepare("SELECT source_file, mtime_ms, size_bytes, last_error FROM sync_files")
    .all() as Array<{ source_file: string } & SyncFileRow>;

  const rowMap = new Map<string, SyncFileRow>();
  for (const row of syncRows) {
    rowMap.set(row.source_file, { mtime_ms: row.mtime_ms, size_bytes: row.size_bytes, last_error: row.last_error });
  }

  return (file: ScannedFile): boolean => {
    const row = rowMap.get(file.path);
    return Boolean(row && row.mtime_ms === file.mtimeMs && row.size_bytes === file.sizeBytes && !row.last_error);
  };
}

function upsertSession(parsed: ParsedSession, file: ScannedFile, indexedAt: string): void {
  const sqlite = getSqlite();
  const id = projectId(parsed.projectPath);

  sqlite
    .prepare(
      `INSERT INTO projects (id, name, path, first_seen_at, last_seen_at)
       VALUES (@id, @name, @path, @seenAt, @seenAt)
       ON CONFLICT(path) DO UPDATE SET
         name = excluded.name,
         last_seen_at = excluded.last_seen_at`
    )
    .run({
      id,
      name: parsed.projectName,
      path: parsed.projectPath,
      seenAt: indexedAt
    });

  sqlite
    .prepare(
      `INSERT INTO sessions (
        id, project_id, source_file, model, models, started_at, ended_at, duration_seconds,
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_tokens,
        context_length, message_count, tool_calls, git_branch, cwd, indexed_at, file_mtime_ms, file_size_bytes
      ) VALUES (
        @id, @projectId, @sourceFile, @model, @models, @startedAt, @endedAt, @durationSeconds,
        @inputTokens, @outputTokens, @cacheReadTokens, @cacheWriteTokens, @totalTokens,
        @contextLength, @messageCount, @toolCalls, @gitBranch, @cwd, @indexedAt, @fileMtimeMs, @fileSizeBytes
      )
      ON CONFLICT(source_file) DO UPDATE SET
        id = excluded.id,
        project_id = excluded.project_id,
        source_file = excluded.source_file,
        model = excluded.model,
        models = excluded.models,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        duration_seconds = excluded.duration_seconds,
        input_tokens = excluded.input_tokens,
        output_tokens = excluded.output_tokens,
        cache_read_tokens = excluded.cache_read_tokens,
        cache_write_tokens = excluded.cache_write_tokens,
        total_tokens = excluded.total_tokens,
        context_length = excluded.context_length,
        message_count = excluded.message_count,
        tool_calls = excluded.tool_calls,
        git_branch = excluded.git_branch,
        cwd = excluded.cwd,
        indexed_at = excluded.indexed_at,
        file_mtime_ms = excluded.file_mtime_ms,
        file_size_bytes = excluded.file_size_bytes`
    )
    .run({
      id: parsed.id,
      projectId: id,
      sourceFile: parsed.sourceFile,
      model: parsed.model,
      models: JSON.stringify(parsed.models),
      startedAt: parsed.startedAt,
      endedAt: parsed.endedAt,
      durationSeconds: parsed.durationSeconds,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      cacheReadTokens: parsed.cacheReadTokens,
      cacheWriteTokens: parsed.cacheWriteTokens,
      totalTokens: parsed.totalTokens,
      contextLength: parsed.contextLength,
      messageCount: parsed.messageCount,
      toolCalls: parsed.toolCalls,
      gitBranch: parsed.gitBranch,
      cwd: parsed.cwd,
      indexedAt,
      fileMtimeMs: file.mtimeMs,
      fileSizeBytes: file.sizeBytes
    });

  sqlite
    .prepare(
      `INSERT INTO sync_files (source_file, mtime_ms, size_bytes, last_indexed_at, last_error)
       VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT(source_file) DO UPDATE SET
         mtime_ms = excluded.mtime_ms,
         size_bytes = excluded.size_bytes,
         last_indexed_at = excluded.last_indexed_at,
         last_error = NULL`
    )
    .run(file.path, file.mtimeMs, file.sizeBytes, indexedAt);
}

function recordFailure(file: ScannedFile, message: string): void {
  getSqlite()
    .prepare(
      `INSERT INTO sync_files (source_file, mtime_ms, size_bytes, last_indexed_at, last_error)
       VALUES (?, ?, ?, NULL, ?)
       ON CONFLICT(source_file) DO UPDATE SET
         mtime_ms = excluded.mtime_ms,
         size_bytes = excluded.size_bytes,
         last_error = excluded.last_error`
    )
    .run(file.path, file.mtimeMs, file.sizeBytes, message);
}

async function indexFacets(indexedAt: string): Promise<number> {
  const safeFacets = await parseSafeFacets();
  const sqlite = getSqlite();
  const hasSession = sqlite.prepare("SELECT 1 FROM sessions WHERE id = ? LIMIT 1");
  const insert = sqlite.prepare(
    `INSERT INTO facets (id, session_id, kind, value, source_file, indexed_at)
     VALUES (@id, @sessionId, @kind, @value, @sourceFile, @indexedAt)
     ON CONFLICT(id) DO UPDATE SET
       session_id = excluded.session_id,
       kind = excluded.kind,
       value = excluded.value,
       source_file = excluded.source_file,
       indexed_at = excluded.indexed_at`
  );
  const tx = sqlite.transaction(() => {
    for (const facet of safeFacets) {
      const sessionId = facet.sessionId && hasSession.get(facet.sessionId) ? facet.sessionId : null;
      insert.run({ ...facet, sessionId, indexedAt });
    }
  });
  tx();
  return safeFacets.length;
}

export async function runIncrementalSync(): Promise<SyncStatus> {
  const startedAt = new Date().toISOString();
  const files = await scanClaudeJsonlFiles();
  const errors: SyncStatus["errors"] = [];
  let indexedFiles = 0;
  let skippedFiles = 0;
  let failedFiles = 0;

  // Build the skip predicate once: hoists prepare() and version check out of hot loop (#014)
  const shouldSkip = buildShouldSkip();

  for (const file of files) {
    if (shouldSkip(file)) {
      skippedFiles += 1;
      continue;
    }

    try {
      const parsed = await parseClaudeJsonlSession(file.path);
      getSqlite().transaction(() => upsertSession(parsed, file, new Date().toISOString()))();
      indexedFiles += 1;
    } catch (error) {
      failedFiles += 1;
      const message = sanitizeErrorMessage(error ?? "Unknown indexing error");
      recordFailure(file, message);
      errors.push({ file: sanitizeFileLabel(file.path), message });
    }
  }

  let indexedFacets = 0;
  try {
    indexedFacets = await indexFacets(new Date().toISOString());
  } catch (error) {
    const message = sanitizeErrorMessage(error ?? "Unknown facets indexing error");
    errors.push({ file: "facets", message });
    failedFiles += 1;
  }
  const finishedAt = new Date().toISOString();
  const status: SyncStatus = {
    scannedFiles: files.length,
    indexedFiles,
    skippedFiles,
    failedFiles,
    indexedFacets,
    startedAt,
    finishedAt,
    errors
  };

  getSqlite()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('last_sync_status', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(JSON.stringify(status), finishedAt);

  getSqlite()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('indexer_version', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(INDEXER_VERSION, finishedAt);

  return status;
}

export function getLastSyncStatus(): SyncStatus | null {
  const row = getSqlite().prepare("SELECT value FROM settings WHERE key = 'last_sync_status'").get() as
    | { value: string }
    | undefined;
  if (!row) {
    return null;
  }

  try {
    const parsed = SyncStatusSchema.safeParse(JSON.parse(row.value));
    if (!parsed.success) {
      console.warn("[indexer] last_sync_status failed schema validation — treating as no-prior-status");
      return null;
    }
    return parsed.data as SyncStatus;
  } catch {
    return null;
  }
}
