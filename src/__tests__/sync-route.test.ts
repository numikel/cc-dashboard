import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/sync/route";
import { closeDbForTests } from "@/lib/db/client";

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/sync", {
    method: "POST",
    headers
  });
}

describe("POST /api/sync", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-sync-route-"));
    process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
    process.env.CLAUDE_DATA_DIR = path.join(tempDir, ".claude");
    fs.mkdirSync(path.join(process.env.CLAUDE_DATA_DIR, "projects", "demo"), { recursive: true });
    fs.copyFileSync(
      path.join(process.cwd(), "src", "test", "fixtures", "claude-session.jsonl"),
      path.join(process.env.CLAUDE_DATA_DIR, "projects", "demo", "session.jsonl")
    );
  });

  afterEach(() => {
    closeDbForTests();
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
    delete process.env.CLAUDE_DATA_DIR;
  });

  it("rejects POST without X-Requested-With header (CSRF)", async () => {
    const response = await POST(createRequest());
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("forbidden");
  });

  it("rejects POST with wrong X-Requested-With value", async () => {
    const response = await POST(createRequest({ "x-requested-with": "evil-attacker" }));
    expect(response.status).toBe(403);
  });

  it("accepts POST with correct X-Requested-With header", async () => {
    const response = await POST(createRequest({ "x-requested-with": "cc-dashboard" }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status.indexedFiles).toBe(1);
  });

  it("reuses the in-flight Promise for concurrent POST requests", async () => {
    const requests = Array.from({ length: 4 }, () =>
      POST(createRequest({ "x-requested-with": "cc-dashboard" }))
    );

    const responses = await Promise.all(requests);

    // All four responses succeed and report the same finishedAt timestamp,
    // proving they share one runIncrementalSync invocation.
    const statuses = await Promise.all(responses.map((res) => res.json()));
    const timestamps = statuses.map((entry) => entry.status.finishedAt);

    expect(new Set(timestamps).size).toBe(1);
    expect(statuses.every((entry) => entry.status.indexedFiles === 1)).toBe(true);
  });
});

describe("GET /api/sync", () => {
  it("returns the last sync status without requiring a CSRF header", () => {
    const response = GET();
    expect(response.status).toBe(200);
  });
});
