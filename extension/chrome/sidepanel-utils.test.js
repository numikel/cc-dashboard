import { describe, expect, it } from "vitest";
import {
  DEFAULT_BASE_URL,
  formatTokens,
  normalizeBaseUrl,
  validateBaseUrl
} from "./sidepanel-utils.js";

describe("validateBaseUrl", () => {
  it("returns the default origin when value is empty", () => {
    expect(validateBaseUrl("")).toBe("http://localhost:3000");
  });

  it("returns null for non-URL input", () => {
    expect(validateBaseUrl("not a url")).toBeNull();
  });

  it("rejects https scheme", () => {
    expect(validateBaseUrl("https://localhost:3000")).toBeNull();
  });

  it("rejects hosts outside the allowlist", () => {
    expect(validateBaseUrl("http://example.com:3000")).toBeNull();
  });

  it("strips path components, returning origin only", () => {
    expect(validateBaseUrl("http://127.0.0.1:8080/some/path")).toBe(
      "http://127.0.0.1:8080"
    );
  });

  it("strips a trailing slash via URL.origin", () => {
    expect(validateBaseUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000"
    );
  });

  it("rejects bracketed IPv6 loopback (documents current allowlist behavior)", () => {
    expect(validateBaseUrl("http://[::1]:3000")).toBeNull();
  });
});

describe("normalizeBaseUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeBaseUrl("http://localhost:3000///")).toBe(
      "http://localhost:3000"
    );
  });

  it("returns the default base URL for undefined input", () => {
    expect(normalizeBaseUrl(undefined)).toBe(DEFAULT_BASE_URL);
  });
});

describe("formatTokens", () => {
  it("formats millions with two decimals and a trailing M", () => {
    expect(formatTokens(1_500_000)).toBe("1.50M");
  });

  it("rounds thousands to a trailing k", () => {
    expect(formatTokens(2500)).toBe("3k");
  });

  it("returns a dash for non-finite numbers", () => {
    expect(formatTokens(NaN)).toBe("-");
  });
});
