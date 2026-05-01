import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeRangeFilter } from "@/components/time-range-filter";

describe("TimeRangeFilter", () => {
  it("renders all four buttons with correct labels", () => {
    render(<TimeRangeFilter value="all" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("sets aria-pressed=true only on the active button", () => {
    render(<TimeRangeFilter value="7d" onChange={vi.fn()} />);

    const todayBtn = screen.getByRole("button", { name: "Today" });
    const sevenDayBtn = screen.getByRole("button", { name: "7d" });
    const thirtyDayBtn = screen.getByRole("button", { name: "30d" });
    const allBtn = screen.getByRole("button", { name: "All" });

    expect(sevenDayBtn).toHaveAttribute("aria-pressed", "true");
    expect(todayBtn).toHaveAttribute("aria-pressed", "false");
    expect(thirtyDayBtn).toHaveAttribute("aria-pressed", "false");
    expect(allBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects value='1d' — Today button is active", () => {
    render(<TimeRangeFilter value="1d" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects value='30d' — 30d button is active", () => {
    render(<TimeRangeFilter value="30d" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "30d" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects value='all' — All button is active", () => {
    render(<TimeRangeFilter value="all" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange with the correct value when a different button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeRangeFilter value="all" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "7d" }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("7d");
  });

  it("calls onChange with '1d' when Today is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeRangeFilter value="all" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Today" }));

    expect(onChange).toHaveBeenCalledWith("1d");
  });

  it("calls onChange with '30d' when 30d is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeRangeFilter value="7d" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "30d" }));

    expect(onChange).toHaveBeenCalledWith("30d");
  });

  it("calls onChange with 'all' when All is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeRangeFilter value="7d" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "All" }));

    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("renders the group with the accessible label", () => {
    render(<TimeRangeFilter value="all" onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Time range filter" })).toBeInTheDocument();
  });
});
