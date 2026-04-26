import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseSafeFacetFile } from "@/lib/claude/facets-parser";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-dashboard-facets-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("parseSafeFacetFile", () => {
  it("keeps whitelisted scalar metadata", async () => {
    const file = path.join(tempDir, "facet.json");
    fs.writeFileSync(file, JSON.stringify({ session_id: "s1", status: "ok", score: 1 }), "utf8");

    const facets = await parseSafeFacetFile(file);

    expect(facets).toHaveLength(2);
    expect(facets.map((facet) => facet.kind).sort()).toEqual(["score", "status"]);
  });

  it("drops files with content-like fields", async () => {
    const file = path.join(tempDir, "unsafe.json");
    fs.writeFileSync(file, JSON.stringify({ session_id: "s1", summary: "private task summary" }), "utf8");

    await expect(parseSafeFacetFile(file)).resolves.toEqual([]);
  });
});
