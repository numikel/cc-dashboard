import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "@/components/stat-card";

describe("StatCard", () => {
  it("renders label, value and hint", () => {
    render(<StatCard label="Total tokens" value="1,024" hint="All time" />);

    expect(screen.getByText("Total tokens")).toBeInTheDocument();
    expect(screen.getByText("1,024")).toBeInTheDocument();
    expect(screen.getByText("All time")).toBeInTheDocument();
  });
});
