import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RefreshControl } from "@/components/refresh-control";

describe("RefreshControl", () => {
  it("renders the refresh interval select", () => {
    render(<RefreshControl value={60} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Refresh interval")).toBeInTheDocument();
  });

  it("emits selected refresh interval on change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RefreshControl value={60} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Refresh interval"), "180");

    expect(onChange).toHaveBeenCalledWith(180);
  });

  it("reflects the current value in the select", () => {
    render(<RefreshControl value={30} onChange={vi.fn()} />);
    expect((screen.getByLabelText("Refresh interval") as HTMLSelectElement).value).toBe("30");
  });
});
