import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModelBreakdown } from "@/components/charts/model-breakdown";

interface MockChartProps {
  children?: ReactNode;
  data?: Array<{ model: string }>;
  label?: unknown;
}

vi.mock("recharts", () => ({
  Cell: () => <span data-testid="chart-cell" />,
  Legend: () => <span data-testid="model-legend">Model labels</span>,
  Pie: ({ children, data = [], label }: MockChartProps) => (
    <div data-testid="model-pie">
      {data.map((entry) => (
        <span key={entry.model}>{entry.model}</span>
      ))}
      {label ? <span>Percent labels enabled</span> : null}
      {children}
    </div>
  ),
  PieChart: ({ children }: MockChartProps) => <div data-testid="pie-chart">{children}</div>,
  ResponsiveContainer: ({ children }: MockChartProps) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <span data-testid="chart-tooltip" />
}));

describe("ModelBreakdown", () => {
  it("renders an empty state", () => {
    render(<ModelBreakdown data={[]} />);

    expect(screen.getByText("No model usage yet.")).toBeInTheDocument();
  });

  it("renders model labels immediately", () => {
    render(
      <ModelBreakdown
        data={[
          { model: "Claude Sonnet", totalTokens: 800, sessions: 4 },
          { model: "Claude Opus", totalTokens: 200, sessions: 1 }
        ]}
      />
    );

    // Model name appears in both the mocked Pie and the custom legend buttons
    expect(screen.getAllByText("Claude Sonnet").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Claude Opus").length).toBeGreaterThanOrEqual(1);
    // Custom toggle buttons in the legend
    expect(screen.getByRole("button", { name: /Hide Claude Sonnet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hide Claude Opus/i })).toBeInTheDocument();
    expect(screen.getByText("Percent labels enabled")).toBeInTheDocument();
  });
});
