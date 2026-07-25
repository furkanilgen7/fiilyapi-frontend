import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { KpiCard } from "./KpiCard";

describe("KpiCard", () => {
  it("veri yokken bos durum basar", () => {
    render(
      <KpiCard
        label="Tahsil Edilecek"
        emptyTitle="Henüz fatura verisi yok"
        metric={{ available: false, value: null, pending_module: "invoicing" }}
      />,
    );
    expect(screen.getByText("Tahsil Edilecek")).toBeInTheDocument();
    expect(screen.getByText("Henüz fatura verisi yok")).toBeInTheDocument();
  });

  it("veri varken tutari basar", () => {
    render(
      <KpiCard
        label="Tahsil Edilecek"
        emptyTitle="Henüz fatura verisi yok"
        metric={{ available: true, value: "8400000.00", pending_module: "invoicing" }}
      />,
    );
    expect(screen.getByText("₺ 8,4M")).toBeInTheDocument();
  });
});
