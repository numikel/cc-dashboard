import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getClaudeDataDir } from "@/lib/server-config";
import { getSqlite } from "@/lib/db/client";

const CACHE_MAX_AGE_SECONDS = 180;
const USAGE_API_URL = "https://api.anthropic.com/api/oauth/usage";
const DISABLE_ENV_FLAG = "CC_DASHBOARD_DISABLE_USAGE_API";

function isUsageApiDisabled(): boolean {
  const value = process.env[DISABLE_ENV_FLAG];
  return value === "1" || value === "true";
}

const CredentialsSchema = z.object({
  claudeAiOauth: z
    .object({
      accessToken: z.string().nullable().optional()
    })
    .optional()
});

const UsagePeriodSchema = z.object({
  utilization: z.number().nullable().optional(),
  resets_at: z.string().nullable().optional()
});

const UsageApiResponseSchema = z
  .object({
    five_hour: UsagePeriodSchema.optional(),
    seven_day: UsagePeriodSchema.optional(),
    // Sonnet-only and Claude Design weekly limits (field names inferred from claude.ai UI)
    seven_day_sonnet: UsagePeriodSchema.optional(),
    claude_design: UsagePeriodSchema.optional(),
    extra_usage: z
      .object({
        is_enabled: z.boolean().nullable().optional(),
        monthly_limit: z.number().nullable().optional(),
        used_credits: z.number().nullable().optional(),
        utilization: z.number().nullable().optional()
      })
      .optional()
  })
  .passthrough(); // keep unknown fields so we can debug new API additions

export interface OfficialUsageData {
  sessionUsage?: number;
  sessionResetAt?: string;
  weeklyUsage?: number;
  weeklyResetAt?: string;
  weeklySonnetUsage?: number;
  weeklySonnetResetAt?: string;
  weeklyClaudeDesignUsage?: number;
  weeklyClaudeDesignResetAt?: string;
  extraUsageEnabled?: boolean;
  extraUsageLimit?: number;
  extraUsageUsed?: number;
  extraUsageUtilization?: number;
  error?: "no-credentials" | "api-error" | "parse-error" | "disabled";
}

export const OfficialUsageDataSchema = z.object({
  sessionUsage: z.number().optional(),
  sessionResetAt: z.string().optional(),
  weeklyUsage: z.number().optional(),
  weeklyResetAt: z.string().optional(),
  weeklySonnetUsage: z.number().optional(),
  weeklySonnetResetAt: z.string().optional(),
  weeklyClaudeDesignUsage: z.number().optional(),
  weeklyClaudeDesignResetAt: z.string().optional(),
  extraUsageEnabled: z.boolean().optional(),
  extraUsageLimit: z.number().optional(),
  extraUsageUsed: z.number().optional(),
  extraUsageUtilization: z.number().optional(),
  error: z.enum(["no-credentials", "api-error", "parse-error", "disabled"]).optional()
});

async function readUsageToken(): Promise<string | null> {
  try {
    const credentialsPath = path.join(getClaudeDataDir(), ".credentials.json");
    const raw = await fs.readFile(credentialsPath, "utf8");
    const parsed = CredentialsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.claudeAiOauth?.accessToken ?? null : null;
  } catch {
    return null;
  }
}

function readCachedUsage(now = Date.now()): OfficialUsageData | null {
  const row = getSqlite().prepare("SELECT value, updated_at AS updatedAt FROM settings WHERE key = 'official_usage_cache'").get() as
    | { value: string; updatedAt: string }
    | undefined;
  if (!row) {
    return null;
  }

  const cacheAgeSeconds = (now - Date.parse(row.updatedAt)) / 1000;
  if (Number.isNaN(cacheAgeSeconds) || cacheAgeSeconds > CACHE_MAX_AGE_SECONDS) {
    return null;
  }

  try {
    const parsed = OfficialUsageDataSchema.safeParse(JSON.parse(row.value));
    if (!parsed.success) {
      // Cached value doesn't match expected shape — treat as a cache miss
      // so the caller re-fetches from the API or falls back to local query.
      console.warn("[usage-api] Cached OfficialUsageData failed schema validation — treating as cache miss");
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedUsage(data: OfficialUsageData): OfficialUsageData {
  const updatedAt = new Date().toISOString();
  getSqlite()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('official_usage_cache', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(JSON.stringify(data), updatedAt);
  return data;
}

function parseUsageResponse(raw: unknown): OfficialUsageData | null {
  const parsed = UsageApiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  const d = parsed.data;
  const data: OfficialUsageData = {
    sessionUsage: d.five_hour?.utilization ?? undefined,
    sessionResetAt: d.five_hour?.resets_at ?? undefined,
    weeklyUsage: d.seven_day?.utilization ?? undefined,
    weeklyResetAt: d.seven_day?.resets_at ?? undefined,
    weeklySonnetUsage: d.seven_day_sonnet?.utilization ?? undefined,
    weeklySonnetResetAt: d.seven_day_sonnet?.resets_at ?? undefined,
    weeklyClaudeDesignUsage: d.claude_design?.utilization ?? undefined,
    weeklyClaudeDesignResetAt: d.claude_design?.resets_at ?? undefined,
    extraUsageEnabled: d.extra_usage?.is_enabled ?? undefined,
    extraUsageLimit: d.extra_usage?.monthly_limit ?? undefined,
    extraUsageUsed: d.extra_usage?.used_credits ?? undefined,
    extraUsageUtilization: d.extra_usage?.utilization ?? undefined
  };

  return data.sessionUsage === undefined && data.weeklyUsage === undefined ? null : data;
}

export async function getOfficialUsageData(): Promise<OfficialUsageData> {
  if (isUsageApiDisabled()) {
    return { error: "disabled" };
  }

  const cached = readCachedUsage();
  if (cached) {
    return cached;
  }

  const token = await readUsageToken();
  if (!token) {
    return { error: "no-credentials" };
  }

  try {
    const response = await fetch(USAGE_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return { error: "api-error" };
    }

    const body = await response.json();
    const parsed = parseUsageResponse(body);
    return parsed ? writeCachedUsage(parsed) : { error: "parse-error" };
  } catch {
    return { error: "api-error" };
  }
}
