import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RefreshControl } from "@/components/refresh-control";

describe("RefreshControl", () => {
  it("emits selected refresh interval", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RefreshControl value={60} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Refresh interval"), "180");

    expect(onChange).toHaveBeenCalledWith(180);
  });

  it("emits manual refresh clicks", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<RefreshControl value={60} onChange={vi.fn()} onRefresh={onRefresh} />);

    await user.click(screen.getByRole("button", { name: "Sync now" }));

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("shows an active refresh state", () => {
    const onRefresh = vi.fn();
    render(<RefreshControl value={60} isRefreshing onChange={vi.fn()} onRefresh={onRefresh} />);

    expect(screen.getByText("Updating...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Syncing..." })).toBeDisabled();
  });
});
