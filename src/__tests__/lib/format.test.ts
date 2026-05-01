import { describe, expect, it } from "vitest";
import { formatCost, formatTokens, formatProjectCost } from "@/lib/format";

describe("formatCost", () => {
  it("returns em-dash for null", () => {
    expect(formatCost(null)).toBe("–");
  });

  it("returns $0.00 for zero", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("uses 6 decimal places for very small values (< 0.001)", () => {
    expect(formatCost(0.0000001)).toBe("$0.000000");
  });

  it("uses 4 decimal places for small values (0.001 <= x < 0.01)", () => {
    expect(formatCost(0.005)).toBe("$0.0050");
  });

  it("uses 2 decimal places for normal values", () => {
    expect(formatCost(1.23)).toBe("$1.23");
  });

  it("uses 2 decimal places for values exactly at 0.01", () => {
    expect(formatCost(0.01)).toBe("$0.01");
  });

  it("uses 6 decimal places for value just under 0.001", () => {
    // 0.0005 is safely below 0.001 and rounds cleanly to 0.000500
    expect(formatCost(0.0005)).toBe("$0.000500");
  });
});

describe("formatTokens", () => {
  it("returns '0' for zero", () => {
    expect(formatTokens(0)).toBe("0");
  });

  it("returns exact count for values under 1000", () => {
    expect(formatTokens(999)).toBe("999");
  });

  it("returns k suffix for 1000", () => {
    expect(formatTokens(1000)).toBe("1k");
  });

  it("returns k suffix for values in the thousands", () => {
    expect(formatTokens(5500)).toBe("6k");
  });

  it("returns M suffix with 2 decimal places for million+", () => {
    expect(formatTokens(1_500_000)).toBe("1.50M");
  });

  it("returns M suffix for exactly 1 million", () => {
    expect(formatTokens(1_000_000)).toBe("1.00M");
  });
});

describe("formatProjectCost", () => {
  it("delegates to formatCost — returns em-dash for null", () => {
    expect(formatProjectCost(null)).toBe("–");
  });

  it("delegates to formatCost — returns $0.00 for zero", () => {
    expect(formatProjectCost(0)).toBe("$0.00");
  });

  it("delegates to formatCost — formats normal value with 2 decimal places", () => {
    expect(formatProjectCost(4.56)).toBe("$4.56");
  });
});
