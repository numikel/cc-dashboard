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

  it("does not emit id, session_id, or sessionId as facet kinds (#052)", async () => {
    const file = path.join(tempDir, "ids.json");
    fs.writeFileSync(
      file,
      JSON.stringify({ id: "abc123", session_id: "s1", sessionId: "s2", status: "active" }),
      "utf8"
    );

    const facets = await parseSafeFacetFile(file);
    const kinds = facets.map((f) => f.kind);

    expect(kinds).not.toContain("id");
    expect(kinds).not.toContain("session_id");
    expect(kinds).not.toContain("sessionId");
    // status is still emitted
    expect(kinds).toContain("status");
  });

  it("still extracts session_id for facet.sessionId even though the key is not emitted as a kind", async () => {
    const file = path.join(tempDir, "session-ref.json");
    fs.writeFileSync(file, JSON.stringify({ session_id: "s-ref-42", status: "done" }), "utf8");

    const facets = await parseSafeFacetFile(file);

    // The sessionId on the SafeFacet object is populated from session_id extraction
    expect(facets.every((f) => f.sessionId === "s-ref-42")).toBe(true);
    // But session_id is not itself emitted as a facet kind
    expect(facets.map((f) => f.kind)).not.toContain("session_id");
  });
});
