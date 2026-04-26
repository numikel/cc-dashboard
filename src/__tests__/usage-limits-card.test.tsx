import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsageLimitsCard } from "@/components/usage-limits-card";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import type { UsageLimits } from "@/lib/api/queries";

vi.mock("@/hooks/use-refresh-interval", () => ({
  useRefreshInterval: () => ({ interval: 0 })
}));

vi.mock("@/hooks/use-dashboard-data", () => ({
  useDashboardData: vi.fn()
}));

type DashboardDataResult = ReturnType<typeof useDashboardData<UsageLimits>>;
type DashboardDataMock = {
  mockReturnValue: (value: DashboardDataResult) => void;
  mockReturnValueOnce: (value: DashboardDataResult) => void;
};

const useDashboardDataMock = vi.mocked(useDashboardData) as unknown as DashboardDataMock;

function dashboardDataResult(overrides: Partial<DashboardDataResult>): DashboardDataResult {
  return {
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
    ...overrides
  } as DashboardDataResult;
}

const usageLimits: UsageLimits = {
  generatedAt: "2026-04-25T08:00:00.000Z",
  planLabel: "Max (5x)",
  source: "local",
  note: "Local estimate from indexed Claude Code metadata.",
  currentSession: {
    id: "current-session",
    label: "Current session",
    description: "Estimated from local activity",
    used: 250,
    max: 1000,
    percentage: 25,
    resetAt: null,
    resetLabel: "Resets in 4 hr 10 min"
  },
  weekly: [
    {
      id: "weekly-all",
      label: "All models",
      description: "Estimated weekly local token usage",
      used: 500,
      max: 1000,
      percentage: 50,
      resetAt: null,
      resetLabel: "Resets in 3 days"
    },
    {
      id: "weekly-sonnet",
      label: "Sonnet only",
      description: "Estimated weekly local Sonnet token usage",
      used: 125,
      max: 1000,
      percentage: 12.5,
      resetAt: null,
      resetLabel: "Resets in 3 days"
    },
    {
      id: "weekly-claude-design",
      label: "Claude Design",
      description: "No local Claude Design usage detected",
      used: 0,
      max: 1000,
      percentage: 0,
      resetAt: null,
      resetLabel: null
    }
  ],
  additional: [
    {
      id: "daily-routines",
      label: "Daily included routine runs",
      description: "Routine run data is not available",
      used: 0,
      max: 10,
      percentage: 0,
      resetAt: null,
      resetLabel: null
    }
  ]
};

describe("UsageLimitsCard", () => {
  beforeEach(() => {
    useDashboardDataMock.mockReturnValue(dashboardDataResult({
      data: usageLimits,
      error: undefined,
      isLoading: false,
      isValidating: false
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders only the primary usage donut cards", () => {
    render(<UsageLimitsCard />);

    expect(screen.getByText("Current session")).toBeInTheDocument();
    expect(screen.getByText("All models")).toBeInTheDocument();
    expect(screen.getByText("Sonnet only")).toBeInTheDocument();
    expect(screen.queryByText("Claude Design")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily included routine runs")).not.toBeInTheDocument();
  });

  it("shows live reset countdowns for primary limits", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T08:00:00.000Z"));
    useDashboardDataMock.mockReturnValue(dashboardDataResult({
      data: {
        ...usageLimits,
        currentSession: {
          ...usageLimits.currentSession,
          resetAt: "2026-04-25T12:00:00.000Z"
        },
        weekly: usageLimits.weekly.map((row) =>
          row.id === "weekly-all" || row.id === "weekly-sonnet" ? { ...row, resetAt: "2026-04-30T21:00:00.000Z" } : row
        )
      },
      error: undefined,
      isLoading: false,
      isValidating: false
    }));

    render(<UsageLimitsCard />);

    expect(screen.getByText("Session reset")).toBeInTheDocument();
    expect(screen.getByText("04:00:00 left")).toBeInTheDocument();
    expect(screen.getAllByText("Weekly reset")).toHaveLength(2);
    expect(screen.getAllByText("133:00:00 left")).toHaveLength(2);
  });

  it("shows loading skeleton and refresh state", () => {
    useDashboardDataMock.mockReturnValueOnce(dashboardDataResult({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: true
    }));

    const { rerender } = render(<UsageLimitsCard />);
    expect(screen.getByLabelText("Loading plan usage limits")).toBeInTheDocument();

    useDashboardDataMock.mockReturnValueOnce(dashboardDataResult({
      data: usageLimits,
      error: undefined,
      isLoading: false,
      isValidating: true
    }));

    rerender(<UsageLimitsCard />);
    expect(screen.getByText("Refreshing")).toBeInTheDocument();
  });
});
