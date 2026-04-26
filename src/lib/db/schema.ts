import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    path: text("path").notNull().unique(),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull()
  },
  (table) => ({
    pathIdx: index("projects_path_idx").on(table.path)
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceFile: text("source_file").notNull().unique(),
    model: text("model"),
    models: text("models", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    startedAt: text("started_at"),
    endedAt: text("ended_at"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    contextLength: integer("context_length").notNull().default(0),
    messageCount: integer("message_count").notNull().default(0),
    toolCalls: integer("tool_calls").notNull().default(0),
    gitBranch: text("git_branch"),
    cwd: text("cwd"),
    indexedAt: text("indexed_at").notNull(),
    fileMtimeMs: real("file_mtime_ms").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull()
  },
  (table) => ({
    projectStartedIdx: index("sessions_project_started_idx").on(table.projectId, table.startedAt),
    startedIdx: index("sessions_started_idx").on(table.startedAt),
    modelIdx: index("sessions_model_idx").on(table.model)
  })
);

export const syncFiles = sqliteTable("sync_files", {
  sourceFile: text("source_file").primaryKey(),
  mtimeMs: real("mtime_ms").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  lastIndexedAt: text("last_indexed_at"),
  lastError: text("last_error")
});

export const facets = sqliteTable(
  "facets",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    value: text("value").notNull(),
    sourceFile: text("source_file").notNull(),
    indexedAt: text("indexed_at").notNull()
  },
  (table) => ({
    sessionIdx: index("facets_session_idx").on(table.sessionId),
    kindIdx: index("facets_kind_idx").on(table.kind)
  })
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull()
});

export type Project = typeof projects.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SyncFile = typeof syncFiles.$inferSelect;
export type Facet = typeof facets.$inferSelect;
