import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectCard } from "./ProjectCard";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";

/**
 * kalan-4 · #261 + #262 — MARJ İŞARET KÖRLÜĞÜ.
 *
 * `_margin_pct` (backend/app/modules/projects/costs.py) revenue>0 iken
 * profit negatifse NEGATİF yüzde döndürebilir. Ekran bugüne kadar
 * `.prj-card__margin` rengini SABİT `--color-success` basıyordu ve
 * `tone="profit"` sınıfı da işarete bakmadan hep aynı (mor/turkuaz)
 * rengi uyguluyordu — zarar eden bir proje YEŞİL/nötr "kâr" görünümüyle
 * basılıyordu.
 */

const METRIC_REAL = (value: string) => ({ available: true, value, pending_module: null });
const COUNT_PENDING = (m: string) => ({ available: false, count: null, pending_module: m });

const base: ProjectListItem = {
  id: "22222222-2222-2222-2222-222222222222",
  code: "KY-1",
  name: "Zarar Sitesi",
  project_type: "kendi_yatirim",
  status: "active",
  category: "Konut",
  city: "İzmir",
  employer_name: null,
  employer: null,
  contract: null,
  budget_lines: { material: "0", labor: "0", subcontractor: "0", overhead: "0" },
  is_draft: false,
  contract_no: null,
  contract_amount: null,
  start_date: "2025-01-01",
  end_date: "2026-01-01",
  budget: "1000000.00",
  progress_pct: "40.00",
  contracting: null,
  investment: {
    sales_target: "10000000.00",
    land_cost: "1000000.00",
    sold_amount: METRIC_REAL("2000000.00"),
    sales_ratio: METRIC_REAL("20.00"),
    unit_summary: COUNT_PENDING("units"),
    total_cost: METRIC_REAL("9000000.00"),
    estimated_profit: METRIC_REAL("-1500000.00"),
    margin: METRIC_REAL("-12.50"),
  },
  land_share: null,
};

describe("ProjectCard — negatif marj/kâr (kalan-4 #261/#262)", () => {
  it("negatif marj cipini danger tonuyla basar, success DEĞİL", () => {
    render(<ProjectCard project={base} />);
    const chip = screen.getByText("%-12,5 marj");
    expect(chip.className).toContain("prj-card__margin--negative");
  });

  it("negatif tahmini kâr hücresini danger tonuyla basar, profit tonu DEĞİL", () => {
    render(<ProjectCard project={base} />);
    const value = screen.getByText(/-1,5M/);
    expect(value.className).toContain("prj-kpi__value--danger");
    expect(value.className).not.toContain("prj-kpi__value--profit");
  });
});
