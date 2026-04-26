import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOfficialUsageData } from "@/lib/claude/usage-api";
import { closeDbForTests } from "@/lib/db/client";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-usage-api-"));
  process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
  process.env.CLAUDE_DATA_DIR = path.join(tempDir, ".claude");
  fs.mkdirSync(process.env.CLAUDE_DATA_DIR, { recursive: true });
});

afterEach(() => {
  closeDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
  delete process.env.CLAUDE_DATA_DIR;
  delete process.env.CC_DASHBOARD_DISABLE_USAGE_API;
});

describe("getOfficialUsageData", () => {
  it("returns 'disabled' error when CC_DASHBOARD_DISABLE_USAGE_API=1", async () => {
    process.env.CC_DASHBOARD_DISABLE_USAGE_API = "1";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getOfficialUsageData();

    expect(result.error).toBe("disabled");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 'disabled' error when CC_DASHBOARD_DISABLE_USAGE_API=true", async () => {
    process.env.CC_DASHBOARD_DISABLE_USAGE_API = "true";
    const result = await getOfficialUsageData();
    expect(result.error).toBe("disabled");
  });

  it("returns 'no-credentials' when credentials.json is missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getOfficialUsageData();

    expect(result.error).toBe("no-credentials");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not log the OAuth token in the returned data", async () => {
    const credentialsPath = path.join(process.env.CLAUDE_DATA_DIR!, ".credentials.json");
    fs.writeFileSync(
      credentialsPath,
      JSON.stringify({ claudeAiOauth: { accessToken: "super-secret-token-12345" } }),
      "utf8"
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          five_hour: { utilization: 25.5, resets_at: "2026-04-26T15:00:00Z" },
          seven_day: { utilization: 10, resets_at: "2026-05-02T10:00:00Z" }
        }),
        { status: 200 }
      )
    );

    const result = await getOfficialUsageData();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("super-secret-token-12345");
    expect(result.sessionUsage).toBe(25.5);
    expect(result.weeklyUsage).toBe(10);
  });

  it("returns 'api-error' on non-OK upstream response", async () => {
    const credentialsPath = path.join(process.env.CLAUDE_DATA_DIR!, ".credentials.json");
    fs.writeFileSync(
      credentialsPath,
      JSON.stringify({ claudeAiOauth: { accessToken: "token" } }),
      "utf8"
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream went down", { status: 503 })
    );

    const result = await getOfficialUsageData();
    expect(result.error).toBe("api-error");
  });
});
