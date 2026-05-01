import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { closeDbForTests } from "@/lib/db/client";
import { readCache, writeCache, purgeExpired, clearCache } from "@/lib/db/api-cache";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-api-cache-"));
  process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
});

afterEach(() => {
  closeDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
});

const StringSchema = z.string();
const NumberSchema = z.number();

const ObjectSchema = z.object({
  name: z.string(),
  value: z.number()
});

describe("readCache", () => {
  it("returns null when no entry exists", () => {
    const result = readCache("missing-key", StringSchema);
    expect(result).toBeNull();
  });

  it("returns the parsed value after writeCache", () => {
    writeCache("test-key", "hello", 3600);
    const result = readCache("test-key", StringSchema);
    expect(result).toBe("hello");
  });

  it("returns a parsed object after writeCache", () => {
    writeCache("obj-key", { name: "Claude", value: 42 }, 3600);
    const result = readCache("obj-key", ObjectSchema);
    expect(result).toEqual({ name: "Claude", value: 42 });
  });

  it("returns null when now is past expires_at", () => {
    writeCache("expired-key", "stale", 1); // 1 second TTL
    // Pass a 'now' far in the future (2 seconds later)
    const futureNow = Date.now() + 2_000;
    const result = readCache("expired-key", StringSchema, futureNow);
    expect(result).toBeNull();
  });

  it("returns value when now is exactly at TTL boundary (not yet expired)", () => {
    const nowMs = Date.now();
    writeCache("boundary-key", "fresh", 10);
    // now equals the creation time — well within TTL
    const result = readCache("boundary-key", StringSchema, nowMs);
    expect(result).toBe("fresh");
  });

  it("returns null when stored value fails schema validation", () => {
    writeCache("typed-key", "not-a-number", 3600);
    // NumberSchema expects a number, not a string
    const result = readCache("typed-key", NumberSchema);
    expect(result).toBeNull();
  });

  it("returns null when stored value has wrong object shape", () => {
    writeCache("shape-key", { wrong: "shape" }, 3600);
    const result = readCache("shape-key", ObjectSchema);
    expect(result).toBeNull();
  });
});

describe("writeCache", () => {
  it("overwrites an existing entry on second write (upsert)", () => {
    writeCache("upsert-key", "first", 3600);
    writeCache("upsert-key", "second", 3600);
    const result = readCache("upsert-key", StringSchema);
    expect(result).toBe("second");
  });
});

describe("purgeExpired", () => {
  it("returns 0 when there are no expired entries", () => {
    writeCache("fresh1", "v1", 3600);
    writeCache("fresh2", "v2", 3600);
    const deleted = purgeExpired(Date.now());
    expect(deleted).toBe(0);
  });

  it("returns the count of deleted expired rows", () => {
    writeCache("exp1", "v1", 1);
    writeCache("exp2", "v2", 1);
    writeCache("keep", "v3", 3600);

    // Simulate time far in the future so exp1 and exp2 are expired
    const futureNow = Date.now() + 2_000;
    const deleted = purgeExpired(futureNow);
    expect(deleted).toBe(2);
  });

  it("leaves non-expired rows intact after purge", () => {
    writeCache("expire-me", "gone", 1);
    writeCache("keep-me", "here", 3600);

    const futureNow = Date.now() + 2_000;
    purgeExpired(futureNow);

    const kept = readCache("keep-me", StringSchema);
    expect(kept).toBe("here");

    const gone = readCache("expire-me", StringSchema);
    expect(gone).toBeNull();
  });

  it("returns 0 when cache is empty", () => {
    const deleted = purgeExpired(Date.now());
    expect(deleted).toBe(0);
  });
});

describe("clearCache", () => {
  it("deletes only the specified key when key is provided", () => {
    writeCache("key-a", "val-a", 3600);
    writeCache("key-b", "val-b", 3600);

    const deleted = clearCache("key-a");
    expect(deleted).toBe(1);

    expect(readCache("key-a", StringSchema)).toBeNull();
    expect(readCache("key-b", StringSchema)).toBe("val-b");
  });

  it("returns 0 when the specified key does not exist", () => {
    const deleted = clearCache("nonexistent");
    expect(deleted).toBe(0);
  });

  it("deletes all entries when called without a key argument", () => {
    writeCache("k1", "v1", 3600);
    writeCache("k2", "v2", 3600);
    writeCache("k3", "v3", 3600);

    const deleted = clearCache();
    expect(deleted).toBe(3);

    expect(readCache("k1", StringSchema)).toBeNull();
    expect(readCache("k2", StringSchema)).toBeNull();
    expect(readCache("k3", StringSchema)).toBeNull();
  });

  it("returns 0 when clearing all entries on an empty cache", () => {
    const deleted = clearCache();
    expect(deleted).toBe(0);
  });
});
