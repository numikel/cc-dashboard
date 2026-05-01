import { describe, expect, it } from "vitest";
import { CHART_PALETTE, buildColorMap } from "@/lib/chart-palette";

describe("buildColorMap", () => {
  it("returns an empty object for an empty array", () => {
    expect(buildColorMap([])).toEqual({});
  });

  it("maps each key to a unique hex color when keys <= 8", () => {
    const keys = ["alpha", "beta", "gamma"];
    const result = buildColorMap(keys);

    expect(Object.keys(result)).toHaveLength(3);
    // Each value should be a hex color string
    for (const key of keys) {
      expect(result[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    // All colors are distinct (palette has 8 unique colors)
    const values = Object.values(result);
    expect(new Set(values).size).toBe(values.length);
  });

  it("assigns keys to palette colors in order", () => {
    const keys = ["a", "b", "c"];
    const result = buildColorMap(keys);

    expect(result["a"]).toBe(CHART_PALETTE[0]);
    expect(result["b"]).toBe(CHART_PALETTE[1]);
    expect(result["c"]).toBe(CHART_PALETTE[2]);
  });

  it("wraps around when keys > 8 (index 8 maps to same color as index 0)", () => {
    const keys = Array.from({ length: 9 }, (_, i) => `key${i}`);
    const result = buildColorMap(keys);

    expect(result["key8"]).toBe(result["key0"]);
    expect(result["key8"]).toBe(CHART_PALETTE[0]);
  });

  it("wraps around correctly for 16 keys (two full cycles)", () => {
    const keys = Array.from({ length: 16 }, (_, i) => `k${i}`);
    const result = buildColorMap(keys);

    for (let i = 0; i < 8; i++) {
      expect(result[`k${i}`]).toBe(result[`k${i + 8}`]);
    }
  });
});
