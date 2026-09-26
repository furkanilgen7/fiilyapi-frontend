import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { SiteDiarySummary, SiteDiarySummaryItem } from "@/lib/api/hooks/useSiteDiary";

import { DiarySummaryAccrualTable } from "./DiarySummaryAccrualTable";

/**
 * 🔴 FIX-F1 Kusur 2 — backend `completion_ratio` 0–1 KESİRdir
 * (`backend/app/modules/site_diary/summary.py:46-52`, golden
 * `backend/tests/site_diary/test_summary.py:500` `Decimal("0.7500")`).
 * Bileşen ÖNCEDEN kesri doğrudan yüzde biçimleyicilere veriyordu → "%" sütunu
 * 100 kat küçük basılıyordu (ör. "%0,75" yerine "%75", çubuk genişliği %1
 * yerine %75). Mockup metin biçimi (`Şantiye - Hakediş Özeti.dc.html:139`)
 * ondalıksız tam sayı yüzdedir ("%75"), CEO'nun "%75,0" örneği DEĞİL.
 */

function item(overrides: Partial<SiteDiarySummaryItem> = {}): SiteDiarySummaryItem {
  return {
    amount: "148000.00",
    boq_amount: "2220000.00",
    boq_item_id: "boq-1",
    boq_quantity: "1200.000",
    code: "01.001",
    completion_ratio: "0.7500",
    contract_item_id: null,
    contract_item_quantity: null,
    contract_item_unit_price: null,
    description: "Kat Döşemesi C25/30",
    quantity: "900.000",
    unit: "m³",
    unit_price: "1850.00",
    ...overrides,
  } as SiteDiarySummaryItem;
}

function summary(items: SiteDiarySummaryItem[]): SiteDiarySummary {
  return {
    entry_count: 1,
    items,
    site_id: "site-1",
    total_amount: "148000.00",
    year: 2026,
    month: 7,
  } as SiteDiarySummary;
}

describe("DiarySummaryAccrualTable · kesir→yüzde ölçeği", () => {
  it("backend golden'ı 0.7500 → '%75' metin ve %75 çubuk genişliği", () => {
    render(
      <DiarySummaryAccrualTable
        summary={summary([item({ completion_ratio: "0.7500" })])}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.getByText("%75")).toBeInTheDocument();
    const fill = document.querySelector(".diary-summary-table__bar-fill") as HTMLElement;
    expect(fill.style.width).toBe("75%");
    expect(fill.className).not.toContain("--low");
  });

  it("eşik SINIRI: 0.5 (%50) düşük DEĞİL", () => {
    render(
      <DiarySummaryAccrualTable
        summary={summary([item({ completion_ratio: "0.5" })])}
        isLoading={false}
        isError={false}
      />,
    );
    const fill = document.querySelector(".diary-summary-table__bar-fill") as HTMLElement;
    expect(fill.className).not.toContain("--low");
  });

  it("eşik SINIRI: 0.4999 (%49,99) düşük — turuncu ton", () => {
    render(
      <DiarySummaryAccrualTable
        summary={summary([item({ completion_ratio: "0.4999" })])}
        isLoading={false}
        isError={false}
      />,
    );
    const fill = document.querySelector(".diary-summary-table__bar-fill") as HTMLElement;
    expect(fill.className).toContain("--low");
  });

  it("null oran → '—' basılır, çubuk genişliği 0", () => {
    render(
      <DiarySummaryAccrualTable
        summary={summary([item({ completion_ratio: null })])}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    const fill = document.querySelector(".diary-summary-table__bar-fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });
});
