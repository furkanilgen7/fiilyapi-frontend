import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectCard } from "./ProjectCard";
import { EMPTY_CELL } from "@/lib/format";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";

/**
 * KAPSAM MASKESİ — kat karşılığı kartının "Arsa Maliyeti" hücresi.
 *
 * 🔴 `LandShareCard.land_cost` `Gorunurluk.para` etiketlidir ve `limited`
 * kapsamlı rollerde (`projects` satırında ÜÇ hücre `_LIM`) `null` gelir.
 * Hücre `?? 0` kestirmesiyle yazılıyordu: `formatCompactCurrency(0)` →
 * **"₺ 0"**. Yani gizlenmiş bir tutar ekrana GERÇEK bir sayı olarak basılıyor
 * ve kullanıcı arsanın bedava olduğunu sanıyordu.
 *
 * Aynı dosyadaki her komşu hücre (`MetricValue`, `MarginChip`, `ProgressRow`)
 * boş/maskeli değerde "—" basar; bu tek hücre o kanonun dışında kalmıştı.
 *
 * 🔴 SIFIR MASKELENMİŞ DEĞİLDİR: alanın tanımsal gerçeği "her zaman 0"dır
 * (backend `land_cost` saklanmaz, spec §3.3) — o hâlde "₺ 0" DOĞRU cevaptır ve
 * basılmaya devam eder. Testin ikinci yarısı tam olarak bunu bekçiler.
 */

const METRIC_REAL = (value: string) => ({ available: true, value, pending_module: null });

type LandShare = NonNullable<ProjectListItem["land_share"]>;

function project(landCost: string | null): ProjectListItem {
  return {
    id: "p-kk-1",
    code: "PRJ-KK",
    name: "Bahçelievler Kat Karşılığı",
    project_type: "kat_karsiligi",
    status: "active",
    category: "Konut",
    city: "İstanbul",
    employer_name: null,
    employer: null,
    contract: null,
    budget_lines: { material: "0", labor: "0", subcontractor: "0", overhead: "0" },
    is_draft: false,
    contract_no: null,
    contract_amount: null,
    start_date: "2025-03-01",
    end_date: "2026-12-01",
    budget: "1000000",
    progress_pct: "20",
    contracting: null,
    investment: null,
    land_share: {
      landowner_name: "Arsa Sahibi A.Ş.",
      land_cost: landCost,
      our_share_value: METRIC_REAL("8400000"),
      construction_cost: METRIC_REAL("5200000"),
      estimated_profit: METRIC_REAL("3200000"),
      construction_progress: METRIC_REAL("45.00"),
    } as unknown as LandShare,
  } as ProjectListItem;
}

describe("ProjectCard 'Arsa Maliyeti' — maskeli tutar SIFIR basmaz", () => {
  it("🔴 maskeli (null) arsa maliyeti '—' basar, '₺ 0' BASMAZ", () => {
    render(<ProjectCard project={project(null)} />);
    const cell = screen.getByTestId("prj-land-cost");
    expect(cell).toHaveTextContent(EMPTY_CELL);
    expect(cell.textContent).not.toMatch(/0/);
  });

  it("🔴 POZİTİF KONTROL — gerçek 0 HÂLÂ '₺ 0' basar (tanım gereği sıfır)", () => {
    render(<ProjectCard project={project("0")} />);
    expect(screen.getByTestId("prj-land-cost")).toHaveTextContent("₺ 0");
  });

  it("🔴 POZİTİF KONTROL — sıfırdan farklı gerçek tutar bozulmaz", () => {
    render(<ProjectCard project={project("2400000")} />);
    expect(screen.getByTestId("prj-land-cost")).toHaveTextContent("₺ 2,4M");
  });
});
