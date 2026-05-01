import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDbForTests } from "@/lib/db/client";
import { readCachedPricing, writeCachedPricing } from "@/lib/pricing/cache";
import type { PricingMap } from "@/lib/pricing/types";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-pricing-cache-"));
  process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
});

afterEach(() => {
  closeDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
});

const SAMPLE_MAP: PricingMap = {
  "claude-sonnet-4-5": {
    inputPerToken: 3e-6,
    outputPerToken: 15e-6,
    cacheReadPerToken: 0.3e-6,
    cacheWritePerToken: 3.75e-6
  }
};

describe("readCachedPricing", () => {
  it("returns null when no entry exists in api_cache", () => {
    const result = readCachedPricing();
    expect(result).toBeNull();
  });

  it("returns the cached map within TTL", () => {
    writeCachedPricing(SAMPLE_MAP);
    const result = readCachedPricing();
    expect(result).not.toBeNull();
    expect(result!["claude-sonnet-4-5"].inputPerToken).toBe(3e-6);
  });

  it("returns null when the cached entry is expired", () => {
    writeCachedPricing(SAMPLE_MAP);

    // Simulate an expired entry by setting expires_at to the past
    const db = new BetterSqlite3(process.env.DATABASE_PATH!);
    const expiredAt = new Date(Date.now() - 1000).toISOString(); // 1s ago
    db.prepare("UPDATE api_cache SET expires_at = ? WHERE key = 'pricing_snapshot'").run(expiredAt);
    db.close();

    // Force reconnect by closing the cached connection
    closeDbForTests();

    const result = readCachedPricing();
    expect(result).toBeNull();
  });

  it("returns null on invalid JSON stored in api_cache", () => {
    writeCachedPricing(SAMPLE_MAP); // Ensure the row exists

    const db = new BetterSqlite3(process.env.DATABASE_PATH!);
    db.prepare("UPDATE api_cache SET value = ? WHERE key = 'pricing_snapshot'").run("not-valid-json{{{{");
    db.close();

    closeDbForTests();

    const result = readCachedPricing();
    expect(result).toBeNull();
  });

  it("returns null when stored value fails PricingMapSchema validation", () => {
    writeCachedPricing(SAMPLE_MAP);

    // Store valid JSON but wrong shape (missing required fields)
    const db = new BetterSqlite3(process.env.DATABASE_PATH!);
    db.prepare("UPDATE api_cache SET value = ? WHERE key = 'pricing_snapshot'").run(
      JSON.stringify({ "model-x": { inputPerToken: "not-a-number" } })
    );
    db.close();

    closeDbForTests();

    const result = readCachedPricing();
    expect(result).toBeNull();
  });
});

describe("writeCachedPricing", () => {
  it("overwrites an existing entry on second write", () => {
    writeCachedPricing(SAMPLE_MAP);

    const updated: PricingMap = {
      "claude-haiku-3-5": {
        inputPerToken: 0.8e-6,
        outputPerToken: 4e-6,
        cacheReadPerToken: 0.08e-6,
        cacheWritePerToken: 1e-6
      }
    };
    writeCachedPricing(updated);

    const result = readCachedPricing();
    expect(result).not.toBeNull();
    expect("claude-haiku-3-5" in result!).toBe(true);
    expect("claude-sonnet-4-5" in result!).toBe(false);
  });
});
