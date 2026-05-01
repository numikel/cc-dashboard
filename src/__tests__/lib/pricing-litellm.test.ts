import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeKey, fetchLiteLLMPricing } from "@/lib/pricing/litellm";

// ---------------------------------------------------------------------------
// normalizeKey
// ---------------------------------------------------------------------------
describe("normalizeKey", () => {
  it('strips "anthropic." prefix and date+version suffix', () => {
    expect(normalizeKey("anthropic.claude-sonnet-4-5-20250929-v1:0")).toBe("claude-sonnet-4-5");
  });

  it('strips "anthropic." prefix and date+version suffix for haiku', () => {
    expect(normalizeKey("anthropic.claude-haiku-4-5-20251001-v1:0")).toBe("claude-haiku-4-5");
  });

  it('strips "azure_ai/" prefix', () => {
    expect(normalizeKey("azure_ai/claude-sonnet-4-5")).toBe("claude-sonnet-4-5");
  });

  it('strips "anthropic/" prefix', () => {
    expect(normalizeKey("anthropic/claude-opus-4-7")).toBe("claude-opus-4-7");
  });

  it("returns bare key unchanged", () => {
    expect(normalizeKey("claude-haiku-3-5")).toBe("claude-haiku-3-5");
  });

  it("strips only trailing YYYYMMDD when no version suffix present", () => {
    expect(normalizeKey("anthropic.claude-sonnet-4-5-20250101")).toBe("claude-sonnet-4-5");
  });
});

// ---------------------------------------------------------------------------
// fetchLiteLLMPricing — fetch mock
// ---------------------------------------------------------------------------
describe("fetchLiteLLMPricing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CC_DASHBOARD_DISABLE_PRICING;
  });

  it("returns empty map when CC_DASHBOARD_DISABLE_PRICING=1", async () => {
    process.env.CC_DASHBOARD_DISABLE_PRICING = "1";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const map = await fetchLiteLLMPricing();
    expect(map).toEqual({});
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("parses a fixture response and builds PricingMap", async () => {
    const fixture = {
      sample_spec: {
        mode: "chat",
        input_cost_per_token: 0.000001,
        output_cost_per_token: 0.000002
      },
      "anthropic.claude-sonnet-4-5-20250929-v1:0": {
        mode: "chat",
        input_cost_per_token: 3e-6,
        output_cost_per_token: 15e-6,
        cache_read_input_token_cost: 0.3e-6,
        cache_creation_input_token_cost: 3.75e-6
      },
      "anthropic.claude-haiku-4-5-20251001-v1:0": {
        mode: "chat",
        input_cost_per_token: 0.8e-6,
        output_cost_per_token: 4e-6,
        cache_read_input_token_cost: 0.08e-6,
        cache_creation_input_token_cost: 1e-6
      },
      "text-embedding-ada-002": {
        mode: "embedding",
        input_cost_per_token: 0.0001,
        output_cost_per_token: 0
      }
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fixture), { status: 200 })
    );

    const map = await fetchLiteLLMPricing();

    // sample_spec must be skipped
    expect("sample_spec" in map).toBe(false);

    // embedding entry must be skipped
    expect("text-embedding-ada-002" in map).toBe(false);

    // sonnet entry must be normalised and present
    expect(map["claude-sonnet-4-5"]).toBeDefined();
    expect(map["claude-sonnet-4-5"].inputPerToken).toBe(3e-6);
    expect(map["claude-sonnet-4-5"].outputPerToken).toBe(15e-6);
    expect(map["claude-sonnet-4-5"].cacheReadPerToken).toBe(0.3e-6);
    expect(map["claude-sonnet-4-5"].cacheWritePerToken).toBe(3.75e-6);

    // haiku entry must be normalised
    expect(map["claude-haiku-4-5"]).toBeDefined();
  });

  it("skips entries with mode=embedding", async () => {
    const fixture = {
      "some-embedding-model": {
        mode: "embedding",
        input_cost_per_token: 0.0001,
        output_cost_per_token: 0
      }
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fixture), { status: 200 })
    );

    const map = await fetchLiteLLMPricing();
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("skips the sample_spec entry", async () => {
    const fixture = {
      sample_spec: {
        mode: "chat",
        input_cost_per_token: 0.001,
        output_cost_per_token: 0.002
      }
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fixture), { status: 200 })
    );

    const map = await fetchLiteLLMPricing();
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("returns empty map on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    const map = await fetchLiteLLMPricing();
    expect(map).toEqual({});
  });

  it("returns empty map on non-OK HTTP status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));
    const map = await fetchLiteLLMPricing();
    expect(map).toEqual({});
  });

  it("first entry wins on normalised key collision", async () => {
    // Two different raw keys that normalize to the same bare id
    const fixture = {
      "anthropic.claude-sonnet-4-5-20250101-v1:0": {
        mode: "chat",
        input_cost_per_token: 1e-6,
        output_cost_per_token: 2e-6
      },
      "anthropic.claude-sonnet-4-5-20260101-v1:0": {
        mode: "chat",
        input_cost_per_token: 99e-6,
        output_cost_per_token: 99e-6
      }
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fixture), { status: 200 })
    );

    const map = await fetchLiteLLMPricing();
    // First entry (1e-6) should win
    expect(map["claude-sonnet-4-5"].inputPerToken).toBe(1e-6);
  });
});
