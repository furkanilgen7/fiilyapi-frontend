import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelBaselineEmptyState } from "./PanelBaselineEmptyState";

describe("PanelBaselineEmptyState (a)", () => {
  it("başlık + açıklama + Bütçe'ye giden düğmeyi basar", () => {
    render(<PanelBaselineEmptyState budgetHref="/planlama/adam-saat-butcesi?site=s-1" />);
    expect(screen.getByText("Henüz baseline yok")).toBeInTheDocument();
    expect(
      screen.getByText("Önce Adam-Saat Bütçesi oluşturup baseline'ı dondurun."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Adam-Saat Bütçesi'ne git/ })).toHaveAttribute(
      "href",
      "/planlama/adam-saat-butcesi?site=s-1",
    );
  });
});
