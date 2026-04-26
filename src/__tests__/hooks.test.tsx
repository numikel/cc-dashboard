import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { useDashboardData } from "@/hooks/use-dashboard-data";

describe("useRefreshInterval", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to 60 when no value is persisted", () => {
    const { result } = renderHook(() => useRefreshInterval());
    expect(result.current.interval).toBe(60);
  });

  it("returns the persisted value on mount", () => {
    window.localStorage.setItem("cc-dashboard-refresh-interval", "180");
    const { result } = renderHook(() => useRefreshInterval());
    expect(result.current.interval).toBe(180);
  });

  it("falls back to 60 for unsupported values", () => {
    window.localStorage.setItem("cc-dashboard-refresh-interval", "12345");
    const { result } = renderHook(() => useRefreshInterval());
    expect(result.current.interval).toBe(60);
  });

  it("persists changes via setInterval", () => {
    const { result } = renderHook(() => useRefreshInterval());
    act(() => result.current.setInterval(30));
    expect(result.current.interval).toBe(30);
    expect(window.localStorage.getItem("cc-dashboard-refresh-interval")).toBe("30");
  });
});

describe("useAutoSync", () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: { indexedFiles: 0 } }), { status: 200 })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchMock.mockRestore();
  });

  it("does not schedule polling when interval is 0", () => {
    renderHook(() => useAutoSync(0));
    vi.advanceTimersByTime(120_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("polls /api/sync at the configured interval and includes the CSRF header", async () => {
    renderHook(() => useAutoSync(30));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/sync");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({ "X-Requested-With": "cc-dashboard" });
  });

  it("clears the interval when unmounted", () => {
    const { unmount } = renderHook(() => useAutoSync(60));
    unmount();
    vi.advanceTimersByTime(120_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
  }

  it("issues a request to the configured URL and parses JSON", async () => {
    const { result } = renderHook(() => useDashboardData<{ ok: boolean }>("/api/test", 0), {
      wrapper
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ ok: true });
  });
});
