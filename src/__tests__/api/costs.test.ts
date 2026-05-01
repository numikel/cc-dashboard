import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDbForTests } from "@/lib/db/client";
import { computeSessionCost, getRates } from "@/lib/pricing";
import type { ModelRates, PricingMap } from "@/lib/pricing/types";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-costs-test-"));
  process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
  process.env.CLAUDE_DATA_DIR = path.join(tempDir, ".claude");
  fs.mkdirSync(process.env.CLAUDE_DATA_DIR, { recursive: true });
});

afterEach(() => {
  closeDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
  delete process.env.CLAUDE_DATA_DIR;
  delete process.env.CC_DASHBOARD_DISABLE_PRICING;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// computeSessionCost
// ---------------------------------------------------------------------------
describe("computeSessionCost", () => {
  const rates: ModelRates = {
    inputPerToken: 3e-6,
    outputPerToken: 15e-6,
    cacheReadPerToken: 0.3e-6,
    cacheWritePerToken: 3.75e-6
  };

  it("returns null when rates are null", () => {
    expect(computeSessionCost(null, 1000, 500, 200, 100)).toBeNull();
  });

  it("computes the correct USD cost given token counts", () => {
    // 1000 * 3e-6 + 500 * 15e-6 + 200 * 0.3e-6 + 100 * 3.75e-6
    // = 0.003 + 0.0075 + 0.00006 + 0.000375
    // = 0.010935
    const result = computeSessionCost(rates, 1000, 500, 200, 100);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.010935, 8);
  });

  it("returns 0 for all-zero token counts", () => {
    expect(computeSessionCost(rates, 0, 0, 0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRates
// ---------------------------------------------------------------------------
describe("getRates", () => {
  it("returns rates from the pricing map when model is present", () => {
    const map: PricingMap = {
      "claude-sonnet-4-5": {
        inputPerToken: 3e-6,
        outputPerToken: 15e-6,
        cacheReadPerToken: 0.3e-6,
        cacheWritePerToken: 3.75e-6
      }
    };
    const rates = getRates(map, "claude-sonnet-4-5");
    expect(rates).not.toBeNull();
    expect(rates!.inputPerToken).toBe(3e-6);
  });

  it("falls back to family rates when model not in map", () => {
    const emptyMap: PricingMap = {};
    const rates = getRates(emptyMap, "claude-sonnet-99-99");
    // Should match the /claude-sonnet/i family fallback
    expect(rates).not.toBeNull();
    expect(rates!.inputPerToken).toBe(3e-6);
  });

  it("returns null for completely unknown models", () => {
    const emptyMap: PricingMap = {};
    const rates = getRates(emptyMap, "gpt-99-unknown");
    expect(rates).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// /api/costs response shape (integration-level via GET handler)
// ---------------------------------------------------------------------------
describe("GET /api/costs", () => {
  it("returns expected shape with window=7d", async () => {
    // Disable external pricing fetch
    process.env.CC_DASHBOARD_DISABLE_PRICING = "1";

    // Import after env is set so the module sees the flag
    const { GET } = await import("@/app/api/costs/route");

    const request = new Request("http://localhost:3000/api/costs?window=7d");
    // NextRequest has nextUrl — provide a minimal NextRequest-compatible object
    const nextRequest = Object.assign(request, {
      nextUrl: new URL("http://localhost:3000/api/costs?window=7d")
    });

    const response = await GET(nextRequest as never);
    const body = await response.json();

    expect(body).toHaveProperty("window", "7d");
    expect(body).toHaveProperty("totalCostUsd");
    expect(body).toHaveProperty("isEstimated", true);
    expect(body).toHaveProperty("byModel");
    expect(body).toHaveProperty("dailyCosts");
    expect(body).toHaveProperty("topProjects");
    expect(body).toHaveProperty("unknownModels");
    expect(body).toHaveProperty("disabledPricing", true);
    expect(Array.isArray(body.byModel)).toBe(true);
    expect(Array.isArray(body.dailyCosts)).toBe(true);
    expect(Array.isArray(body.topProjects)).toBe(true);
    expect(Array.isArray(body.unknownModels)).toBe(true);
  });
});
