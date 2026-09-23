import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectSummaryHero } from "./ProjectSummaryHero";
import type { ProjectDetail } from "@/lib/api/hooks/useProjects";
import type { ProjectCostsResponse } from "@/lib/api/hooks/useProjectCosts";

const EMPTY_METRIC = { available: false, pending_module: null, value: null };

function landShareProject(overrides: Partial<ProjectDetail["land_share"]> = {}): ProjectDetail {
  return {
    id: "p-1",
    name: "Güneşkent",
    code: "GK-1",
    city: "İstanbul",
    status: "active",
    project_type: "kat_karsiligi",
    is_draft: false,
    site_count: 1,
    start_date: null,
    end_date: null,
    progress_pct: null,
    budget: null,
    budget_lines: { construction: EMPTY_METRIC, land: EMPTY_METRIC, other: EMPTY_METRIC } as never,
    category: null,
    contract: null,
    contract_amount: null,
    contract_no: null,
    contracting: null,
    employer: null,
    employer_name: null,
    investment: null,
    land_share: {
      construction_area_m2: null,
      construction_cost: EMPTY_METRIC,
      construction_progress: EMPTY_METRIC,
      contract_no: "TSD-9",
      daily_penalty: null,
      delivery_date: null,
      estimated_profit: EMPTY_METRIC,
      guarantee_amount: null,
      land_area_m2: null,
      // 🔴 KAYIT NO 210 — kanonik "Arsa Maliyeti" kaynağı BUDUR.
      land_cost: "5000000.00",
      landowner_name: "Ahmet Arsa",
      margin: EMPTY_METRIC,
      notary_date: null,
      our_share_pct: "60.00",
      our_share_value: EMPTY_METRIC,
      owner_share_pct: "40.00",
      retainage_pct: "5.00",
      signature_date: null,
      vat_pct: "20.00",
      ...overrides,
    } as never,
  } as unknown as ProjectDetail;
}

function costs(overrides: Partial<ProjectCostsResponse["breakdown"]> = {}): ProjectCostsResponse {
  return {
    project_id: "p-1",
    project_type: "kat_karsiligi",
    breakdown: {
      construction_budget: null,
      construction_spent: null,
      financing: EMPTY_METRIC,
      // Kat karşılığında bu alan TANIM GEREĞİ 0'dır — arsa maliyeti KPI'ının
      // kaynağı OLAMAZ.
      land_cost: "0.00",
      marketing: EMPTY_METRIC,
      permits: EMPTY_METRIC,
      total_spent: "0.00",
      ...overrides,
    } as never,
    profit: {
      cost: null,
      margin_pct: null,
      profit: null,
      realized_sales: null,
      remaining_stock_value: null,
      revenue: null,
    },
    subcontractor_total: { count: 0, total: null } as never,
    subcontractors: [],
  } as unknown as ProjectCostsResponse;
}

describe("ProjectSummaryHero — Arsa Maliyeti kaynağı (KAYIT NO 210)", () => {
  it("kat karşılığı projede `land_share.land_cost`i basar, `costs.breakdown.land_cost` (her zaman 0) DEĞİL", () => {
    render(
      <ProjectSummaryHero project={landShareProject()} costs={costs()} totals={null} />,
    );

    const hero = screen.getByTestId("psum-hero");
    // 5.000.000 basılmalı; kaynak `costs.breakdown.land_cost` (0.00) olsaydı "₺0" basardı.
    expect(hero.textContent).toContain("5.000.000");
    expect(hero.textContent).not.toMatch(/Arsa Maliyeti[^₺]*₺0(?!\d)/);
  });
});
