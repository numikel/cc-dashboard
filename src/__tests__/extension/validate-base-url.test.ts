/**
 * Tests for the validateBaseUrl logic used in extension/chrome/sidepanel.js.
 *
 * Because sidepanel.js is a vanilla-JS browser script with no exports, the
 * function is reimplemented here verbatim so the pure logic can be unit-tested
 * inside the Vitest/jsdom environment without requiring a browser context.
 *
 * If the implementation in sidepanel.js ever changes, keep this copy in sync.
 */
import { describe, expect, it } from "vitest";

const DEFAULT_BASE_URL = "http://localhost:3000";

function validateBaseUrl(value: string | undefined): string | null {
  try {
    const u = new URL(value || DEFAULT_BASE_URL);
    const allowedHosts = ["localhost", "127.0.0.1"];
    if (!allowedHosts.includes(u.hostname)) return null;
    if (u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

describe("validateBaseUrl", () => {
  it("accepts http://localhost:3000", () => {
    expect(validateBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("accepts http://127.0.0.1:3000", () => {
    expect(validateBaseUrl("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });

  it("accepts any port on localhost", () => {
    expect(validateBaseUrl("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("accepts any port on 127.0.0.1", () => {
    expect(validateBaseUrl("http://127.0.0.1:9000")).toBe("http://127.0.0.1:9000");
  });

  it("strips trailing path and returns only the origin", () => {
    expect(validateBaseUrl("http://localhost:3000/some/path")).toBe("http://localhost:3000");
  });

  it("rejects https scheme on localhost", () => {
    expect(validateBaseUrl("https://localhost:3000")).toBeNull();
  });

  it("rejects https scheme on 127.0.0.1", () => {
    expect(validateBaseUrl("https://127.0.0.1:3000")).toBeNull();
  });

  it("rejects non-localhost hostname", () => {
    expect(validateBaseUrl("http://example.com")).toBeNull();
  });

  it("rejects arbitrary IP (not 127.0.0.1)", () => {
    expect(validateBaseUrl("http://192.168.1.1:3000")).toBeNull();
  });

  it("rejects a plain non-URL string", () => {
    expect(validateBaseUrl("not-a-url")).toBeNull();
  });

  it("rejects an empty-looking relative path", () => {
    expect(validateBaseUrl("//evil.com")).toBeNull();
  });

  it("falls back to DEFAULT_BASE_URL when value is undefined", () => {
    expect(validateBaseUrl(undefined)).toBe("http://localhost:3000");
  });

  it("falls back to DEFAULT_BASE_URL when value is an empty string", () => {
    // empty string triggers the `|| DEFAULT_BASE_URL` branch → valid localhost origin
    expect(validateBaseUrl("")).toBe("http://localhost:3000");
  });
});
