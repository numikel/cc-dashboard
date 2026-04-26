import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { assertMetadataOnly } from "@/lib/privacy/assert-metadata-only";
import type { ClaudeTranscriptLine, ParsedSession } from "@/lib/claude/types";

function parseJsonLine(line: string): ClaudeTranscriptLine | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  assertMetadataOnly(parsed);
  return parsed as ClaudeTranscriptLine;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function modelId(value: ClaudeTranscriptLine["model"]): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    return value.id ?? value.display_name ?? null;
  }

  return null;
}

function isRealModel(value: string | null): value is string {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "<synthetic>" && normalized !== "synthetic" && !normalized.startsWith("<");
}

function countToolUses(content: unknown): number {
  if (!Array.isArray(content)) {
    return 0;
  }

  return content.filter((item) => {
    return Boolean(item && typeof item === "object" && "type" in item && item.type === "tool_use");
  }).length;
}

// Cache to avoid repeated filesystem walks for the same cwd
const repoRootCache = new Map<string, string | null>();

export async function findRepoRoot(cwd: string): Promise<string | null> {
  if (repoRootCache.has(cwd)) return repoRootCache.get(cwd)!;

  // Resolve starting directory: walk up from cwd
  let dir: string;
  try {
    const stat = await fs.promises.stat(cwd);
    dir = stat.isDirectory() ? cwd : path.dirname(cwd);
  } catch {
    repoRootCache.set(cwd, null);
    return null;
  }

  while (true) {
    try {
      await fs.promises.access(path.join(dir, ".git"));
      repoRootCache.set(cwd, dir);
      return dir;
    } catch {
      // not a repo root, walk up
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      repoRootCache.set(cwd, null);
      return null;
    }
    dir = parent;
  }
}

async function projectFromCwd(cwd: string | null): Promise<{ projectPath: string; projectName: string }> {
  const projectPath = (cwd ? await findRepoRoot(cwd) : null) ?? cwd ?? "unknown";
  return {
    projectPath,
    projectName: projectPath === "unknown" ? "Unknown project" : path.basename(projectPath)
  };
}

function fallbackSessionId(sourceFile: string): string {
  const stem = path.basename(sourceFile, ".jsonl");
  if (stem.length >= 8) {
    return stem;
  }

  return createHash("sha256").update(sourceFile).digest("hex").slice(0, 16);
}

interface UsageEntry {
  usage: NonNullable<ClaudeTranscriptLine["message"]>["usage"];
  stopReasonPresent: boolean;
  stopReason: string | null | undefined;
  timestamp: string | undefined;
  isMainChain: boolean;
  isApiErrorMessage: boolean;
}

export async function parseClaudeJsonlSession(sourceFile: string): Promise<ParsedSession> {
  const input = fs.createReadStream(sourceFile, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  let sessionId: string | null = null;
  let cwd: string | null = null;
  let gitBranch: string | null = null;
  let startedAt: Date | null = null;
  let endedAt: Date | null = null;
  let messageCount = 0;
  let toolCalls = 0;
  const models = new Set<string>();
  const usageEntries: UsageEntry[] = [];

  for await (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const data = parseJsonLine(line);
    if (!data) {
      continue;
    }

    messageCount += 1;
    sessionId ??= data.sessionId ?? data.session_id ?? null;
    cwd ??= data.cwd ?? null;
    gitBranch ??= data.gitBranch ?? null;

    const timestamp = parseTimestamp(data.timestamp);
    if (timestamp) {
      if (!startedAt || timestamp < startedAt) {
        startedAt = timestamp;
      }
      if (!endedAt || timestamp > endedAt) {
        endedAt = timestamp;
      }
    }

    toolCalls += countToolUses(data.message?.content);

    if (data.message?.usage) {
      const entryModel = data.message.model ?? modelId(data.model);
      if (isRealModel(entryModel) && data.isApiErrorMessage !== true) {
        models.add(entryModel);
      }

      usageEntries.push({
        usage: data.message.usage,
        stopReasonPresent: Object.hasOwn(data.message, "stop_reason"),
        stopReason: data.message.stop_reason,
        timestamp: data.timestamp,
        isMainChain: data.isSidechain !== true,
        isApiErrorMessage: data.isApiErrorMessage === true
      });
    }
  }

  const hasStopReason = usageEntries.some((entry) => entry.stopReasonPresent);
  const entriesToCount = hasStopReason
    ? usageEntries.filter((entry, index) => Boolean(entry.stopReason) || (entry.stopReason === null && index === usageEntries.length - 1))
    : usageEntries;

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let contextLength = 0;
  let latestMainUsageAt: Date | null = null;

  for (const entry of entriesToCount) {
    if (!entry.usage) {
      continue;
    }

    inputTokens += toNumber(entry.usage.input_tokens);
    outputTokens += toNumber(entry.usage.output_tokens);
    cacheReadTokens += toNumber(entry.usage.cache_read_input_tokens);
    cacheWriteTokens += toNumber(entry.usage.cache_creation_input_tokens);

    const timestamp = parseTimestamp(entry.timestamp);
    if (entry.isMainChain && !entry.isApiErrorMessage && timestamp && (!latestMainUsageAt || timestamp > latestMainUsageAt)) {
      latestMainUsageAt = timestamp;
      contextLength =
        toNumber(entry.usage.input_tokens) +
        toNumber(entry.usage.cache_read_input_tokens) +
        toNumber(entry.usage.cache_creation_input_tokens);
    }
  }

  const modelList = Array.from(models).sort();
  const project = await projectFromCwd(cwd);
  const durationSeconds =
    startedAt && endedAt ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)) : 0;

  return {
    id: sessionId ?? fallbackSessionId(sourceFile),
    ...project,
    sourceFile,
    model: modelList[0] ?? null,
    models: modelList,
    startedAt: startedAt?.toISOString() ?? null,
    endedAt: endedAt?.toISOString() ?? null,
    durationSeconds,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
    contextLength,
    messageCount,
    toolCalls,
    gitBranch,
    cwd
  };
}
