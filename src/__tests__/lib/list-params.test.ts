import { describe, it, expect } from "vitest";
import { parseListParams } from "@/lib/api/list-params";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/sessions");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

describe("parseListParams", () => {
  it("applies defaults when params absent", () => {
    const { limit, offset } = parseListParams(makeRequest());
    expect(limit).toBe(50);
    expect(offset).toBe(0);
  });

  it("coerces string numbers", () => {
    const { limit, offset } = parseListParams(makeRequest({ limit: "20", offset: "10" }));
    expect(limit).toBe(20);
    expect(offset).toBe(10);
  });

  it("throws ZodError on NaN string", () => {
    expect(() => parseListParams(makeRequest({ limit: "abc" }))).toThrow();
  });

  it("throws ZodError when limit exceeds max (200)", () => {
    expect(() => parseListParams(makeRequest({ limit: "201" }))).toThrow();
  });

  it("throws ZodError when limit is negative", () => {
    expect(() => parseListParams(makeRequest({ limit: "-1" }))).toThrow();
  });

  it("throws ZodError when offset is negative", () => {
    expect(() => parseListParams(makeRequest({ offset: "-5" }))).toThrow();
  });
});
