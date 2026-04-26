import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sanitizeErrorMessage, sanitizeFileLabel } from "@/lib/privacy/sanitize-error";

describe("sanitizeErrorMessage", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.HOME = "/home/alice";
    process.env.USERPROFILE = "C:\\Users\\alice";
    process.env.USERNAME = "alice";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("strips Windows absolute paths", () => {
    const out = sanitizeErrorMessage(
      'Error reading C:\\Users\\alice\\.claude\\projects\\demo\\session.jsonl'
    );
    expect(out).not.toContain("alice");
    expect(out).not.toContain("C:");
    expect(out).toContain("<path>");
  });

  it("strips POSIX user paths", () => {
    const out = sanitizeErrorMessage("Error reading /home/alice/.claude/sessions/x.jsonl");
    expect(out).not.toContain("alice");
    expect(out).toContain("<path>");
  });

  it("strips HOME-prefixed paths via the path matcher", () => {
    expect(sanitizeErrorMessage("HOME is /home/alice somewhere")).toContain("<path>");
    expect(sanitizeErrorMessage("Profile C:\\Users\\alice located")).toContain("<path>");
  });

  it("strips standalone USERNAME mentions outside of paths", () => {
    expect(sanitizeErrorMessage("operation failed for alice")).toContain("<user>");
  });

  it("truncates messages longer than 256 characters", () => {
    const long = "x".repeat(500);
    const out = sanitizeErrorMessage(long);
    expect(out.length).toBeLessThanOrEqual(256);
    expect(out.endsWith("…")).toBe(true);
  });

  it("strips long quoted JSON-content fragments", () => {
    const message = `Parse error: "${"a".repeat(150)}"`;
    expect(sanitizeErrorMessage(message)).toContain("<content>");
  });

  it("accepts Error instances", () => {
    const err = new Error("Cannot read /home/alice/.claude/file.jsonl");
    expect(sanitizeErrorMessage(err)).toContain("<path>");
  });

  it("returns 'Unknown error' for null/undefined/empty input", () => {
    expect(sanitizeErrorMessage(null)).toBe("Unknown error");
    expect(sanitizeErrorMessage(undefined)).toBe("Unknown error");
    expect(sanitizeErrorMessage("")).toBe("Unknown error");
    expect(sanitizeErrorMessage("   ")).toBe("Unknown error");
  });

  it("collapses redundant whitespace", () => {
    expect(sanitizeErrorMessage("a   b\nc\t  d")).toBe("a b c d");
  });
});

describe("sanitizeFileLabel", () => {
  it("returns the basename of a Windows path", () => {
    expect(sanitizeFileLabel("C:\\Users\\alice\\.claude\\session.jsonl")).toBe("session.jsonl");
  });

  it("returns the basename of a POSIX path", () => {
    expect(sanitizeFileLabel("/home/alice/.claude/session.jsonl")).toBe("session.jsonl");
  });

  it("falls back to <unknown> for empty input", () => {
    expect(sanitizeFileLabel("")).toBe("<unknown>");
  });
});
