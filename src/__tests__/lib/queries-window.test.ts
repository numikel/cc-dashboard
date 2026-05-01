import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { windowToSince } from "@/lib/api/queries";

describe("windowToSince", () => {
  beforeEach(() => {
    // Fix "now" so tests are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:34:56.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for 'all'", () => {
    expect(windowToSince("all")).toBeNull();
  });

  it("returns start of local today (midnight) for '1d'", () => {
    const result = windowToSince("1d");
    expect(result).not.toBeNull();

    // Should be a valid ISO-8601 string
    const date = new Date(result!);
    expect(Number.isNaN(date.getTime())).toBe(false);

    // Hours, minutes, seconds, ms should all be zero (local midnight)
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it("returns approximately 7 days ago for '7d'", () => {
    const result = windowToSince("7d");
    expect(result).not.toBeNull();

    const resultMs = new Date(result!).getTime();
    const expectedMs = Date.now() - 7 * 86_400_000;

    // Allow a 1-second tolerance for test execution time
    expect(Math.abs(resultMs - expectedMs)).toBeLessThan(1_000);
  });

  it("returns approximately 30 days ago for '30d'", () => {
    const result = windowToSince("30d");
    expect(result).not.toBeNull();

    const resultMs = new Date(result!).getTime();
    const expectedMs = Date.now() - 30 * 86_400_000;

    expect(Math.abs(resultMs - expectedMs)).toBeLessThan(1_000);
  });

  it("'7d' result is strictly earlier than '1d' result", () => {
    const since7d = windowToSince("7d")!;
    const since1d = windowToSince("1d")!;

    expect(new Date(since7d).getTime()).toBeLessThan(new Date(since1d).getTime());
  });

  it("'30d' result is strictly earlier than '7d' result", () => {
    const since30d = windowToSince("30d")!;
    const since7d = windowToSince("7d")!;

    expect(new Date(since30d).getTime()).toBeLessThan(new Date(since7d).getTime());
  });

  it("'1d' result is in the past relative to now", () => {
    const result = windowToSince("1d")!;
    expect(new Date(result).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
