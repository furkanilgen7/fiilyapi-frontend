import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelLoadingSkeleton } from "./PanelLoadingSkeleton";

describe("PanelLoadingSkeleton (d)", () => {
  it("role=status + aria-busy ile erişilebilir yükleniyor bildirimi verir", () => {
    render(<PanelLoadingSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Planlama Paneli yükleniyor")).toBeInTheDocument();
  });
});
