import { getSqlite } from "@/lib/db/client";
import { getUsageBudgets, SESSION_WINDOW_MS, USAGE_QUERY_WINDOW_MS, WEEKLY_RESET_DAY_OF_WEEK, WEEKLY_RESET_HOUR_UTC } from "@/lib/config";
import { getOfficialUsageData, type OfficialUsageData } from "@/lib/claude/usage-api";

export interface OverviewStats {
  sessions: number;
  projects: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  toolCalls: number;
  averageDurationSeconds: number;
  mostUsedModel: string | null;
  timeline: Array<{ date: string; totalTokens: number; sessions: number }>;
  modelBreakdown: Array<{ model: string; totalTokens: number; sessions: number }>;
}

export interface SessionRow {
  id: string;
  model: string | null;
  models: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  messageCount: number;
  toolCalls: number;
  gitBranch: string | null;
  cwd: string | null;
  projectName: string;
  projectPath: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  path: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  sessions: number;
  totalTokens: number;
  lastSessionAt: string | null;
}

export function getOverviewStats(): OverviewStats {
  const sqlite = getSqlite();
  const totals = sqlite
    .prepare(
      `SELECT
        COUNT(*) AS sessions,
        COALESCE(SUM(total_tokens), 0) AS totalTokens,
        COALESCE(SUM(input_tokens), 0) AS inputTokens,
        COALESCE(SUM(output_tokens), 0) AS outputTokens,
        COALESCE(SUM(cache_read_tokens + cache_write_tokens), 0) AS cacheTokens,
        COALESCE(SUM(tool_calls), 0) AS toolCalls,
        COALESCE(AVG(duration_seconds), 0) AS averageDurationSeconds
      FROM sessions`
    )
    .get() as Omit<OverviewStats, "projects" | "mostUsedModel" | "timeline" | "modelBreakdown">;

  const projects = sqlite.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number };
  const model = sqlite
    .prepare(
      `SELECT COALESCE(model, 'unknown') AS model, SUM(total_tokens) AS totalTokens
       FROM sessions
       GROUP BY COALESCE(model, 'unknown')
       ORDER BY totalTokens DESC
       LIMIT 1`
    )
    .get() as { model: string } | undefined;

  const timeline = sqlite
    .prepare(
      `SELECT substr(started_at, 1, 10) AS date, SUM(total_tokens) AS totalTokens, COUNT(*) AS sessions
       FROM sessions
       WHERE started_at IS NOT NULL
       GROUP BY substr(started_at, 1, 10)
       ORDER BY date ASC
       LIMIT 90`
    )
    .all() as OverviewStats["timeline"];

  const modelBreakdown = sqlite
    .prepare(
      `SELECT COALESCE(model, 'unknown') AS model, SUM(total_tokens) AS totalTokens, COUNT(*) AS sessions
       FROM sessions
       GROUP BY COALESCE(model, 'unknown')
       ORDER BY totalTokens DESC`
    )
    .all() as OverviewStats["modelBreakdown"];

  return {
    ...totals,
    projects: projects.count,
    mostUsedModel: model?.model ?? null,
    timeline,
    modelBreakdown
  };
}

export function listSessions(limit = 50, offset = 0): SessionRow[] {
  return getSqlite()
    .prepare(
      `SELECT
        s.id,
        s.model,
        s.models,
        s.started_at AS startedAt,
        s.ended_at AS endedAt,
        s.duration_seconds AS durationSeconds,
        s.input_tokens AS inputTokens,
        s.output_tokens AS outputTokens,
        s.cache_read_tokens AS cacheReadTokens,
        s.cache_write_tokens AS cacheWriteTokens,
        s.total_tokens AS totalTokens,
        s.message_count AS messageCount,
        s.tool_calls AS toolCalls,
        s.git_branch AS gitBranch,
        s.cwd,
        p.name AS projectName,
        p.path AS projectPath
       FROM sessions s
       JOIN projects p ON p.id = s.project_id
       ORDER BY COALESCE(s.started_at, s.indexed_at) DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as SessionRow[];
}

export function listProjects(): ProjectRow[] {
  return getSqlite()
    .prepare(
      `SELECT
        p.id,
        p.name,
        p.path,
        p.first_seen_at AS firstSeenAt,
        p.last_seen_at AS lastSeenAt,
        COUNT(s.id) AS sessions,
        COALESCE(SUM(s.total_tokens), 0) AS totalTokens,
        MAX(s.started_at) AS lastSessionAt
       FROM projects p
       LEFT JOIN sessions s ON s.project_id = p.id
       GROUP BY p.id
       ORDER BY totalTokens DESC, p.name ASC`
    )
    .all() as ProjectRow[];
}

interface TokenWindowRow {
  startedAt: string;
  endedAt: string | null;
  model: string | null;
  totalTokens: number;
}

export interface UsageLimitRow {
  id: string;
  label: string;
  description: string;
  used: number;
  max: number;
  percentage: number;
  resetAt: string | null;
  resetLabel: string | null;
  valueLabel?: string;
  quotaLabel?: string;
}

export interface UsageLimits {
  generatedAt: string;
  planLabel: string;
  source: "official" | "local";
  currentSession: UsageLimitRow;
  weekly: UsageLimitRow[];
  additional: UsageLimitRow[];
  note: string;
  error?: string;
}

function clampPercentage(used: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((used / max) * 1000) / 10);
}

function floorToHour(date: Date): Date {
  const result = new Date(date);
  result.setMinutes(0, 0, 0);
  return result;
}

function formatResetLabel(resetAt: Date | null, now = new Date()): string | null {
  if (!resetAt) {
    return null;
  }

  const diffMs = resetAt.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "Reset pending";
  }

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `Resets in ${hours} hr ${minutes} min` : `Resets in ${minutes} min`;
}

function getCurrentBlock(rows: TokenWindowRow[], now = new Date()) {
  const sorted = rows
    .map((row) => ({ ...row, started: new Date(row.startedAt) }))
    .filter((row) => !Number.isNaN(row.started.getTime()))
    .sort((a, b) => b.started.getTime() - a.started.getTime());

  const latest = sorted[0];
  if (!latest || now.getTime() - latest.started.getTime() > SESSION_WINDOW_MS) {
    return { start: null, resetAt: null, rows: [] as TokenWindowRow[] };
  }

  let continuousStart = latest.started;
  let previous = latest.started;
  for (const row of sorted.slice(1)) {
    const gap = previous.getTime() - row.started.getTime();
    if (gap >= SESSION_WINDOW_MS) {
      break;
    }
    continuousStart = row.started;
    previous = row.started;
  }

  const start = floorToHour(continuousStart);
  const resetAt = new Date(start.getTime() + SESSION_WINDOW_MS);
  return {
    start,
    resetAt,
    rows: rows.filter((row) => new Date(row.startedAt).getTime() >= start.getTime())
  };
}

function getWeeklyWindow(now = new Date()): { start: Date; resetAt: Date } {
  const resetAt = new Date(now);
  resetAt.setHours(WEEKLY_RESET_HOUR_UTC, 0, 0, 0);
  const daysUntilReset = (WEEKLY_RESET_DAY_OF_WEEK - resetAt.getDay() + 7) % 7;
  resetAt.setDate(resetAt.getDate() + daysUntilReset);
  if (resetAt <= now) {
    resetAt.setDate(resetAt.getDate() + 7);
  }

  const start = new Date(resetAt);
  start.setDate(start.getDate() - 7);
  return { start, resetAt };
}

function sumTokens(rows: TokenWindowRow[], predicate: (row: TokenWindowRow) => boolean = () => true): number {
  return rows.filter(predicate).reduce((total, row) => total + row.totalTokens, 0);
}

function usageRow(input: Omit<UsageLimitRow, "percentage" | "resetLabel">): UsageLimitRow {
  const resetAt = input.resetAt ? new Date(input.resetAt) : null;
  return {
    ...input,
    percentage: clampPercentage(input.used, input.max),
    resetLabel: formatResetLabel(resetAt)
  };
}

function percentUsageRow(input: Omit<UsageLimitRow, "used" | "max" | "percentage" | "resetLabel"> & { percentage: number }): UsageLimitRow {
  const percentage = Math.min(100, Math.max(0, Math.round(input.percentage * 10) / 10));
  const resetAt = input.resetAt ? new Date(input.resetAt) : null;
  return {
    ...input,
    used: percentage,
    max: 100,
    percentage,
    resetLabel: formatResetLabel(resetAt),
    valueLabel: `${percentage}% used`,
    quotaLabel: "Official"
  };
}

function buildOfficialUsageLimits(official: OfficialUsageData, now = new Date()): UsageLimits | null {
  if (official.sessionUsage === undefined && official.weeklyUsage === undefined) {
    return null;
  }

  return {
    generatedAt: now.toISOString(),
    planLabel: "Max (5x)",
    source: "official",
    currentSession: percentUsageRow({
      id: "current-session",
      label: "Current session",
      description: "Official five-hour Claude Code usage",
      percentage: official.sessionUsage ?? 0,
      resetAt: official.sessionResetAt ?? null
    }),
    weekly: [
      percentUsageRow({
        id: "weekly-all",
        label: "All models",
        description: "Official seven-day Claude Code usage",
        percentage: official.weeklyUsage ?? 0,
        resetAt: official.weeklyResetAt ?? null
      }),
      usageRow({
        id: "weekly-sonnet",
        label: "Sonnet only",
        description: "Official API does not expose per-model weekly utilization here",
        used: 0,
        max: 100,
        resetAt: official.weeklyResetAt ?? null,
        valueLabel: "N/A",
        quotaLabel: "Not exposed"
      }),
      usageRow({
        id: "weekly-claude-design",
        label: "Claude Design",
        description: "Official API does not expose Claude Design utilization here",
        used: 0,
        max: 100,
        resetAt: official.weeklyResetAt ?? null,
        valueLabel: "N/A",
        quotaLabel: "Not exposed"
      })
    ],
    additional: [
      usageRow({
        id: "daily-routines",
        label: "Daily included routine runs",
        description: "Routine run data is not exposed by the usage endpoint",
        used: 0,
        max: getUsageBudgets().routineRuns,
        resetAt: null
      })
    ],
    note: "Official usage from Anthropic OAuth API, cached locally for a few minutes."
  };
}

export async function getUsageLimits(): Promise<UsageLimits> {
  const official = await getOfficialUsageData();
  const officialLimits = buildOfficialUsageLimits(official);
  if (officialLimits) {
    return officialLimits;
  }

  const sqlite = getSqlite();
  const budgets = getUsageBudgets();
  const now = new Date();
  const windowStart = new Date(now.getTime() - USAGE_QUERY_WINDOW_MS).toISOString();
  const rows = sqlite
    .prepare(
      `SELECT started_at AS startedAt, ended_at AS endedAt, model, total_tokens AS totalTokens
       FROM sessions
       WHERE started_at IS NOT NULL AND started_at >= ?`
    )
    .all(windowStart) as TokenWindowRow[];

  const currentBlock = getCurrentBlock(rows, now);
  const weeklyWindow = getWeeklyWindow(now);
  const weeklyRows = rows.filter((row) => {
    const started = new Date(row.startedAt);
    return started >= weeklyWindow.start && started < weeklyWindow.resetAt;
  });

  const currentTokens = sumTokens(currentBlock.rows);
  const weeklyAllTokens = sumTokens(weeklyRows);
  const weeklySonnetTokens = sumTokens(weeklyRows, (row) => (row.model ?? "").toLowerCase().includes("sonnet"));

  return {
    generatedAt: now.toISOString(),
    planLabel: "Max (5x)",
    source: "local",
    currentSession: usageRow({
      id: "current-session",
      label: "Current session",
      description: currentBlock.start ? "Estimated from local 5-hour Claude Code activity block" : "No recent local activity block detected",
      used: currentTokens,
      max: budgets.sessionTokens,
      resetAt: currentBlock.resetAt?.toISOString() ?? null
    }),
    weekly: [
      usageRow({
        id: "weekly-all",
        label: "All models",
        description: "Estimated weekly local token usage",
        used: weeklyAllTokens,
        max: budgets.weeklyAllTokens,
        resetAt: weeklyWindow.resetAt.toISOString()
      }),
      usageRow({
        id: "weekly-sonnet",
        label: "Sonnet only",
        description: "Estimated weekly local Sonnet token usage",
        used: weeklySonnetTokens,
        max: budgets.weeklySonnetTokens,
        resetAt: weeklyWindow.resetAt.toISOString()
      }),
      usageRow({
        id: "weekly-claude-design",
        label: "Claude Design",
        description: "No local Claude Design usage detected",
        used: 0,
        max: budgets.weeklyAllTokens,
        resetAt: weeklyWindow.resetAt.toISOString()
      })
    ],
    additional: [
      usageRow({
        id: "daily-routines",
        label: "Daily included routine runs",
        description: "Routine run data is not available in local JSONL yet",
        used: 0,
        max: budgets.routineRuns,
        resetAt: null
      })
    ],
    note: "Local estimate from indexed Claude Code metadata. Official usage was unavailable.",
    error: official.error
  };
}
