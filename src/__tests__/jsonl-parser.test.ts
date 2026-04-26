import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseClaudeJsonlSession } from "@/lib/claude/jsonl-parser";
import { containsForbiddenContentKeys } from "@/lib/privacy/assert-metadata-only";

describe("parseClaudeJsonlSession", () => {
  it("parses token metadata without returning message content", async () => {
    const fixture = path.join(process.cwd(), "src", "test", "fixtures", "claude-session.jsonl");
    const parsed = await parseClaudeJsonlSession(fixture);

    expect(parsed.id).toBe("session-1");
    expect(parsed.inputTokens).toBe(100);
    expect(parsed.outputTokens).toBe(20);
    expect(parsed.cacheReadTokens).toBe(7);
    expect(parsed.cacheWriteTokens).toBe(5);
    expect(parsed.totalTokens).toBe(132);
    expect(parsed.toolCalls).toBe(1);
    expect(parsed.models).toEqual(["claude-sonnet-4-5"]);
    expect(parsed.model).toBe("claude-sonnet-4-5");
    expect(containsForbiddenContentKeys(parsed)).toBe(false);
  });
});
