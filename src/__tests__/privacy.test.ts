import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FORBIDDEN_METADATA_KEYS,
  SAFE_METADATA_KEYS,
  assertMetadataOnly,
  containsForbiddenContentKeys
} from "@/lib/privacy/assert-metadata-only";
import { parseClaudeJsonlSession } from "@/lib/claude/jsonl-parser";

describe("metadata privacy guard — allow-list", () => {
  it("accepts aggregate metadata that matches SAFE_METADATA_KEYS", () => {
    expect(() =>
      assertMetadataOnly({
        sessionId: "abc",
        timestamp: "2026-04-26T10:00:00Z",
        cwd: "/repo",
        gitBranch: "main",
        model: { id: "claude-opus-4-7", display_name: "Opus" },
        message: {
          model: "claude-opus-4-7",
          stop_reason: "end_turn",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 10,
            cache_creation_input_tokens: 5
          },
          content: [
            { type: "tool_use", name: "Bash", id: "tool_1", input: { command: "ls -la" } }
          ]
        },
        isSidechain: false,
        isApiErrorMessage: false
      })
    ).not.toThrow();
  });

  it("rejects unknown top-level keys", () => {
    expect(() => assertMetadataOnly({ unknownField: 42 })).toThrow(/Non-allow-listed/);
  });

  it("accepts tool_use input as opaque without descending", () => {
    expect(() =>
      assertMetadataOnly({
        message: {
          content: [
            {
              type: "tool_use",
              name: "Edit",
              id: "tool_x",
              input: {
                file_path: "/tmp/secret.txt",
                old_string: "user-supplied content",
                new_string: "anything"
              }
            }
          ]
        }
      })
    ).not.toThrow();
  });

  it("rejects forbidden keys even inside tool_use input", () => {
    expect(() =>
      assertMetadataOnly({
        message: {
          content: [
            {
              type: "tool_use",
              name: "Bash",
              id: "tool_y",
              text: "this is content not metadata"
            }
          ]
        }
      })
    ).toThrow(/Forbidden content field 'text'/);
  });
});

describe("metadata privacy guard — deny-list (forbidden keys)", () => {
  for (const forbidden of [
    "text",
    "body",
    "completion",
    "thinking",
    "output",
    "prompt",
    "response",
    "summary",
    "goal",
    "outcome",
    "messages",
    "transcript",
    "conversation"
  ]) {
    it(`rejects forbidden key '${forbidden}' at top level`, () => {
      expect(containsForbiddenContentKeys({ [forbidden]: "secret" })).toBe(true);
    });

    it(`rejects forbidden key '${forbidden}' nested in message`, () => {
      expect(containsForbiddenContentKeys({ message: { [forbidden]: "secret" } })).toBe(true);
    });
  }

  it("FORBIDDEN_METADATA_KEYS exposes the canonical 13-key deny-list", () => {
    expect(FORBIDDEN_METADATA_KEYS.size).toBe(13);
  });

  it("SAFE_METADATA_KEYS and FORBIDDEN_METADATA_KEYS do not overlap", () => {
    for (const safe of SAFE_METADATA_KEYS) {
      expect(FORBIDDEN_METADATA_KEYS.has(safe.toLowerCase())).toBe(false);
    }
  });
});

describe("metadata privacy guard — ingestion enforcement", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-privacy-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeJsonl(name: string, lines: unknown[]): string {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, lines.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf8");
    return filePath;
  }

  it("parses a clean JSONL transcript end-to-end", async () => {
    const filePath = writeJsonl("clean.jsonl", [
      {
        sessionId: "session-1",
        timestamp: "2026-04-26T10:00:00Z",
        cwd: "/repo",
        gitBranch: "main",
        message: {
          model: "claude-opus-4-7",
          stop_reason: "end_turn",
          usage: { input_tokens: 100, output_tokens: 50 }
        }
      }
    ]);

    const parsed = await parseClaudeJsonlSession(filePath);
    expect(parsed.id).toBe("session-1");
    expect(parsed.inputTokens).toBe(100);
    expect(parsed.outputTokens).toBe(50);
  });

  it("rejects a JSONL transcript that contains a forbidden 'text' field", async () => {
    const filePath = writeJsonl("dirty.jsonl", [
      { sessionId: "session-bad", timestamp: "2026-04-26T10:00:00Z", text: "user prompt content" }
    ]);

    await expect(parseClaudeJsonlSession(filePath)).rejects.toThrow(/Forbidden content field 'text'/);
  });

  it("rejects a JSONL transcript with forbidden 'thinking' field nested in message", async () => {
    const filePath = writeJsonl("thinking.jsonl", [
      {
        sessionId: "session-bad",
        timestamp: "2026-04-26T10:00:00Z",
        message: { model: "claude-opus-4-7", thinking: "internal reasoning content" }
      }
    ]);

    await expect(parseClaudeJsonlSession(filePath)).rejects.toThrow(/Forbidden content field 'thinking'/);
  });

  it("rejects a JSONL transcript with an unknown top-level key", async () => {
    const filePath = writeJsonl("unknown.jsonl", [
      { sessionId: "session-x", customField: "anything" }
    ]);

    await expect(parseClaudeJsonlSession(filePath)).rejects.toThrow(/Non-allow-listed key 'customField'/);
  });
});

// ---------------------------------------------------------------------------
// Parameterised coverage — assertMetadataOnly for all 13 forbidden keys
// ---------------------------------------------------------------------------

const FORBIDDEN_KEYS = [
  "body",
  "completion",
  "conversation",
  "goal",
  "messages",
  "outcome",
  "output",
  "prompt",
  "response",
  "summary",
  "text",
  "thinking",
  "transcript"
] as const;

describe.each(FORBIDDEN_KEYS)("assertMetadataOnly rejects forbidden key '%s' at top level", (key) => {
  it("throws Forbidden content field error", () => {
    expect(() => assertMetadataOnly({ [key]: "anything" })).toThrow(/Forbidden content field/);
  });
});

describe.each(FORBIDDEN_KEYS)(
  "assertMetadataOnly rejects forbidden key '%s' nested in message.content[]",
  (key) => {
    it("throws Forbidden content field error", () => {
      expect(() =>
        assertMetadataOnly({
          message: {
            content: [{ type: "tool_use", [key]: "anything" }]
          }
        })
      ).toThrow(/Forbidden content field/);
    });
  }
);
