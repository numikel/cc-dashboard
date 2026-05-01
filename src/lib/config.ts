export const APP_VERSION = "0.4.0";

export const REFRESH_INTERVALS = [0, 30, 60, 180, 300] as const;
export type RefreshInterval = (typeof REFRESH_INTERVALS)[number];

// Time-window constants for usage queries and session detection
export const SESSION_WINDOW_MS = 5 * 60 * 60 * 1000; // 5h Claude Code session window
export const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const WEEKLY_RESET_DAY_OF_WEEK = 5; // Friday (0=Sunday)
export const WEEKLY_RESET_HOUR_UTC = 10;
export const USAGE_QUERY_WINDOW_MS = 35 * 24 * 60 * 60 * 1000; // 35-day rolling window for getUsageLimits fallback

// getDatabasePath, getDataDir, ensureDataDirWritable, getClaudeDataDir
// live in server-config.ts (they use node:fs / node:os which cannot be
// bundled for client components).

export function getDefaultRefreshInterval(): RefreshInterval {
  const raw = Number(process.env.REFRESH_INTERVAL ?? 60);
  return REFRESH_INTERVALS.includes(raw as RefreshInterval)
    ? (raw as RefreshInterval)
    : 60;
}

export function getUsageBudgets() {
  return {
    sessionTokens: Number(process.env.PLAN_SESSION_TOKEN_BUDGET ?? 1_000_000),
    weeklyAllTokens: Number(process.env.PLAN_WEEKLY_TOKEN_BUDGET ?? 5_000_000),
    weeklySonnetTokens: Number(process.env.PLAN_WEEKLY_SONNET_TOKEN_BUDGET ?? 5_000_000),
    routineRuns: Number(process.env.PLAN_DAILY_ROUTINE_LIMIT ?? 15)
  };
}
