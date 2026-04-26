import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useThemeContext } from "@/components/theme-provider";

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersDark && query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("useThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });

  it("initialises with mode = system on first render (SSR-safe default)", () => {
    const { result } = renderHook(() => useThemeContext(), { wrapper });
    // Before the hydration effect runs, the default is "system"
    expect(result.current.mode).toBe("system");
  });

  it("reads stored mode from localStorage after hydration effect", async () => {
    localStorage.setItem("cc-dashboard-theme", "dark");
    const { result } = renderHook(() => useThemeContext(), { wrapper });

    await waitFor(() => expect(result.current.mode).toBe("dark"));
  });

  it("falls back to system when localStorage contains an invalid value", async () => {
    localStorage.setItem("cc-dashboard-theme", "rainbow");
    const { result } = renderHook(() => useThemeContext(), { wrapper });

    await waitFor(() => expect(result.current.mode).toBe("system"));
  });

  it("resolves system theme from matchMedia prefers-color-scheme dark", async () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useThemeContext(), { wrapper });

    await waitFor(() => expect(result.current.resolvedTheme).toBe("dark"));
    expect(result.current.mode).toBe("system");
  });

  it("resolves system theme as light when matchMedia does not match dark", async () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useThemeContext(), { wrapper });

    await waitFor(() => expect(result.current.resolvedTheme).toBe("light"));
  });

  it("setMode updates localStorage and re-renders with the new mode", async () => {
    const { result } = renderHook(() => useThemeContext(), { wrapper });

    act(() => {
      result.current.setMode("light");
    });

    expect(result.current.mode).toBe("light");
    expect(localStorage.getItem("cc-dashboard-theme")).toBe("light");
  });

  it("setMode to dark resolves resolvedTheme to dark immediately", () => {
    const { result } = renderHook(() => useThemeContext(), { wrapper });

    act(() => {
      result.current.setMode("dark");
    });

    expect(result.current.resolvedTheme).toBe("dark");
  });

  it("throws when called outside ThemeProvider", () => {
    expect(() => renderHook(() => useThemeContext())).toThrow(
      "useThemeContext must be used inside ThemeProvider"
    );
  });
});
