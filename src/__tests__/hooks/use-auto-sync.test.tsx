import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock SWR's global mutate BEFORE importing the hook so the hoisted mock applies
vi.mock("swr", async (importOriginal) => {
  const original = await importOriginal<typeof import("swr")>();
  return {
    ...original,
    mutate: vi.fn().mockResolvedValue(undefined)
  };
});

import { mutate } from "swr";
import { useAutoSync } from "@/hooks/use-auto-sync";

describe("useAutoSync — globalMutate key-filter after sync", () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: { indexedFiles: 0 } }), { status: 200 })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchMock.mockRestore();
  });

  it("calls global mutate with a /api/ key filter after successful sync", async () => {
    renderHook(() => useAutoSync(60));

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(mutate).toHaveBeenCalled();

    // The key-filter function passed to globalMutate should accept only /api/ strings
    const keyFilter = vi.mocked(mutate).mock.calls[0][0] as (key: unknown) => boolean;
    expect(typeof keyFilter).toBe("function");
    expect(keyFilter("/api/stats/overview")).toBe(true);
    expect(keyFilter("/api/sync")).toBe(true);
    expect(keyFilter("/not-api/data")).toBe(false);
    expect(keyFilter("something-else")).toBe(false);
    expect(keyFilter({ key: "object" })).toBe(false);
  });

  it("does not call global mutate when the fetch response is not ok", async () => {
    fetchMock.mockResolvedValue(new Response("error", { status: 500 }));
    renderHook(() => useAutoSync(30));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not call global mutate when interval is 0 (polling disabled)", () => {
    renderHook(() => useAutoSync(0));
    vi.advanceTimersByTime(120_000);
    expect(mutate).not.toHaveBeenCalled();
  });
});
