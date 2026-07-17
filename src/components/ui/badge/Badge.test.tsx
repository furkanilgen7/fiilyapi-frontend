import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("icerigi render eder", () => {
    render(<Badge>Aktif</Badge>);
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });
  it("variant sinifini uygular", () => {
    render(<Badge variant="success">Onayli</Badge>);
    expect(screen.getByText("Onayli").className).toContain("badge--success");
  });
  it("count sekli count sinifini uygular", () => {
    render(<Badge shape="count">3</Badge>);
    expect(screen.getByText("3").className).toContain("badge--count");
  });
});
