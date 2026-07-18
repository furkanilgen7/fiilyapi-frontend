import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandPanel from "./BrandPanel";

describe("BrandPanel", () => {
  it("marka adini ve slogani gosterir", () => {
    render(<BrandPanel />);
    expect(screen.getByText("FİİL")).toBeInTheDocument();
    expect(screen.getByText(/tek platformda yönetin/i)).toBeInTheDocument();
  });
});
