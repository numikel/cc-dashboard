import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { closeDbForTests } from "@/lib/db/client";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-dashboard-health-"));
  process.env.DATABASE_PATH = path.join(tempDir, "dashboard.db");
  process.env.CLAUDE_DATA_DIR = path.join(tempDir, ".claude");
});

afterEach(() => {
  closeDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
  delete process.env.CLAUDE_DATA_DIR;
});

describe("/api/health", () => {
  it("returns ok status with db ready", async () => {
    const response = GET();
    const body = await response.json();

    expect(body.status).toBe("ok");
    expect(body.version).toBe("0.5.1");
    expect(body.db).toBe("ready");
    expect(response.status).toBe(200);
  });
});
