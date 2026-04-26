import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefreshControl } from "@/components/refresh-control";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn()
  })
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
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

describe("focus-visible indicators on form controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  it("RefreshControl <select> exposes a focus-visible ring", () => {
    render(<RefreshControl value={60} onChange={() => undefined} />);
    const select = screen.getByLabelText("Refresh interval");

    expect(select.className).toMatch(/focus-visible:ring-/);
    expect(select.className).toMatch(/focus-visible:outline-none/);
    expect(select.className).not.toMatch(/(^|\s)outline-none(\s|$)/);
  });

  it("ThemeToggle <select> exposes a focus-visible ring", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const select = screen.getByLabelText("Theme mode");

    expect(select.className).toMatch(/focus-visible:ring-/);
    expect(select.className).toMatch(/focus-visible:outline-none/);
    expect(select.className).not.toMatch(/(^|\s)outline-none(\s|$)/);
  });
});

describe("AppShell error banner has alert semantics", () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("server error", { status: 500 })
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("renders the sync error banner with role=alert and aria-live=assertive", async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <div>page content</div>
      </AppShell>
    );

    await user.click(screen.getByRole("button", { name: /sync now/i }));

    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert.textContent).toMatch(/Sync failed with status 500/);
  });
});

describe("globals.css respects prefers-reduced-motion", () => {
  it("contains a @media (prefers-reduced-motion: reduce) rule", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const css = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });
});
