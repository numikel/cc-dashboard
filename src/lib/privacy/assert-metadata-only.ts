/**
 * Allow-list of metadata keys that may appear in Claude JSONL transcripts AND in
 * derived structures persisted by this dashboard. Anything outside the list is
 * rejected so that prompt/assistant content cannot slip through silently.
 *
 * Scope conventions:
 * - Top-level transcript keys (e.g. "sessionId", "cwd", "message")
 * - Nested message/usage keys (e.g. "stop_reason", "input_tokens")
 * - Persisted ParsedSession fields (e.g. "totalTokens", "projectPath", "cacheReadTokens")
 *
 * The list is the canonical reference for ADR-0002.
 */
export const SAFE_METADATA_KEYS = new Set<string>([
  // --- Transcript top-level identifiers / flags ---
  "id",
  "uuid",
  "parentUuid",
  "sessionId",
  "session_id",
  "requestId",
  "type",
  "userType",
  "isMeta",
  "isSidechain",
  "isApiErrorMessage",
  "isMainChain",
  "leafType",
  "role",
  "status",
  "schema",
  "version",
  // --- Time ---
  "timestamp",
  "updated_at",
  "updatedAt",
  "createdAt",
  "indexedAt",
  "startTime",
  "endTime",
  "startedAt",
  "endedAt",
  // --- Project / Git context ---
  "cwd",
  "gitBranch",
  "gitCwd",
  "branch",
  "projectPath",
  "projectName",
  "sourceFile",
  "source",
  // --- Model identification ---
  "model",
  "models",
  "display_name",
  // --- Message container (validated recursively) ---
  "message",
  // --- Usage / token counts (numeric only) ---
  "usage",
  "input_tokens",
  "output_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
  "cache_creation",
  "ephemeral_5m_input_tokens",
  "ephemeral_1h_input_tokens",
  "service_tier",
  "totalTokens",
  "inputTokens",
  "outputTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "contextLength",
  "tokens",
  // --- Stop reason (metadata only) ---
  "stop_reason",
  "stop_sequence",
  // --- Content array container (items validated as tool_use only) ---
  "content",
  // --- Tool use item shape (opaque payload checked separately) ---
  "name",
  "tool_use_id",
  "is_error",
  "cache_control",
  // --- Active session (~/.claude/sessions/*.json) ---
  "pid",
  // --- ParsedSession aggregates ---
  "messageCount",
  "toolCalls",
  "toolUseCount",
  "duration",
  "durationMs",
  "durationSeconds",
  "indexerVersion",
  "mtimeMs",
  "sizeBytes",
  "fileMtimeMs",
  "fileSizeBytes",
  // --- Active session tracking ---
  "lastSeenAt",
  "firstSeenAt",
  // --- Facet scalars (parseSafeFacetFile) ---
  "label",
  "category",
  "score",
  "rating",
  "created_at"
]);

/**
 * Defence-in-depth deny-list. Even if a key sneaks past the allow-list (e.g.
 * Anthropic adds a new field that we forgot to add), these keys are *always*
 * forbidden because they map directly to user/assistant content fragments.
 *
 * Note: this is the source of truth referenced from ADR-0002.
 */
export const FORBIDDEN_METADATA_KEYS = new Set<string>([
  "body",
  "completion",
  "conversation",
  "goal",
  "messages",
  "outcome",
  "output",
  "prompt",
  "response",
  "summary",
  "text",
  "thinking",
  "transcript"
]);

interface ToolUseLike {
  type?: unknown;
}

function isToolUseItem(value: unknown): value is ToolUseLike {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as ToolUseLike).type === "tool_use"
  );
}

function describePath(path: string[], key: string): string {
  return [...path, key].join(".") || key;
}

/**
 * Recursively validate that `value` only contains keys from SAFE_METADATA_KEYS
 * and that no key from FORBIDDEN_METADATA_KEYS is present at any depth.
 *
 * Special-case: tool_use items inside content arrays. Their `input` field is an
 * opaque container of tool arguments (Bash command, Edit file_path, etc.) that
 * may carry user content. We validate the wrapper keys but DO NOT descend into
 * `input` — instead we ensure no forbidden key sits alongside it.
 */
export function assertMetadataOnly(value: unknown, path: string[] = []): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertMetadataOnly(item, [...path, String(index)]));
    return;
  }

  const isToolUse = isToolUseItem(value);

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();

    if (FORBIDDEN_METADATA_KEYS.has(lower)) {
      throw new Error(`Forbidden content field '${key}' detected at ${describePath(path, key)}`);
    }

    if (isToolUse && key === "input") {
      // Tool arguments may legitimately contain user-controlled strings (file
      // paths, Bash commands). They are never persisted by the indexer — the
      // parser only counts tool_use entries — so we accept them as opaque.
      continue;
    }

    if (!SAFE_METADATA_KEYS.has(key)) {
      throw new Error(`Non-allow-listed key '${key}' detected at ${describePath(path, key)}`);
    }

    assertMetadataOnly(nested, [...path, key]);
  }
}

export function containsForbiddenContentKeys(value: unknown): boolean {
  try {
    assertMetadataOnly(value);
    return false;
  } catch {
    return true;
  }
}
