import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectCard } from "./ProjectCard";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";

// NOT: Gercek semada tip-basi metrikler duz alanlar degil, ContractingCard /
// InvestmentCard / LandShareCard icine gomulu (plan Task 4 duz `project.spent` vb.
// varsaymisti — schema.d.ts'teki gercek yapiya uyduk, spec §3'teki alan adlari
// yerine bu iceriklerle raporda not edildi).
const METRIC_PENDING = (m: string) => ({ available: false, value: null, pending_module: m });
const COUNT_PENDING = (m: string) => ({ available: false, count: null, pending_module: m });

const CONTRACTING_PLACEHOLDERS = {
  spent: METRIC_PENDING("project_costs"),
  physical_progress: METRIC_PENDING("progress_payments"),
  final_progress_payment: METRIC_PENDING("progress_payments"),
  worker_count: COUNT_PENDING("timesheet"),
  subcontractor_count: COUNT_PENDING("subcontracts"),
};

const base: ProjectListItem = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "GK-A",
  name: "Güneşkent A-Blok",
  project_type: "taahhut",
  status: "active",
  category: "Konut",
  city: "Ankara",
  employer_name: "Güneşkent A.Ş.",
  employer: null,
  contract: null,
  budget_lines: { material: "0", labor: "0", subcontractor: "0", overhead: "0" },
  is_draft: false,
  contract_no: "SZL-2025-01",
  contract_amount: "11200000.00",
  start_date: "2025-03-01",
  end_date: "2026-12-01",
  budget: "1000000.00",
  progress_pct: "75.00",
  contracting: { ...CONTRACTING_PLACEHOLDERS },
  investment: null,
  land_share: null,
};

describe("ProjectCard — taahhut", () => {
  it("sozlesme bedeli, tarihler ve yer tutucu harcanan ile basar", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText("TAAHHÜT")).toBeInTheDocument();
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
    expect(screen.getByText("Konut · Ankara · İşveren: Güneşkent A.Ş.")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Sözleşme Bedeli")).toBeInTheDocument();
    expect(screen.getByText("₺ 11,2M")).toBeInTheDocument();
    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
    expect(screen.getByText("Ara 2026")).toBeInTheDocument();
    expect(screen.getByTitle("Maliyet takibiyle birlikte gelir")).toHaveTextContent("—");
    expect(screen.getByText("Fiziksel İlerleme")).toBeInTheDocument();
    expect(screen.getByText("%75")).toBeInTheDocument();
  });

  it("tiklanabilir degildir (spec §9)", () => {
    render(<ProjectCard project={base} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("tamamlanmis kart iki KPI hucresine iner", () => {
    render(
      <ProjectCard
        project={{ ...base, status: "completed", progress_pct: "100.00" }}
      />,
    );
    expect(screen.getByText("Tamamlandı")).toBeInTheDocument();
    expect(screen.getByText("Final Hakediş")).toBeInTheDocument();
    expect(screen.getByTitle("Hakediş modülüyle birlikte gelir")).toHaveTextContent("—");
    expect(screen.queryByText("Başlangıç")).not.toBeInTheDocument();
    expect(screen.getByText("%100")).toBeInTheDocument();
  });
});

describe("ProjectCard — kendi yatirim", () => {
  it("satis hedefi gercek, kalan KPI'lar yer tutucudur", () => {
    render(
      <ProjectCard
        project={{
          ...base,
          project_type: "kendi_yatirim",
          name: "Yeşilvadi Rezidans",
          employer_name: null,
          contracting: null,
          investment: {
            sales_target: "48200000.00",
            land_cost: "5000000.00",
            sold_amount: METRIC_PENDING("units"),
            sales_ratio: METRIC_PENDING("units"),
            unit_summary: COUNT_PENDING("units"),
            total_cost: METRIC_PENDING("project_costs"),
            estimated_profit: METRIC_PENDING("progress_payments"),
            margin: METRIC_PENDING("progress_payments"),
          },
        }}
      />,
    );
    expect(screen.getByText("KENDİ YATIRIM")).toBeInTheDocument();
    expect(screen.getByText("Konut · Ankara")).toBeInTheDocument();
    expect(screen.getByText("Satış Hedefi")).toBeInTheDocument();
    expect(screen.getByText("₺ 48,2M")).toBeInTheDocument();
    expect(screen.getByTitle("Ünite satış modülüyle birlikte gelir")).toHaveTextContent("—");
    // Mockup "Satış Oranı" der; units modulu gelene kadar durust etiket (spec §7.5)
    expect(screen.getByText("İnşaat İlerlemesi")).toBeInTheDocument();
  });
});

describe("ProjectCard — kat karsiligi", () => {
  it("pay cubugu gercek yuzdelerle, arsa maliyeti backend degeriyle basar", () => {
    render(
      <ProjectCard
        project={{
          ...base,
          project_type: "kat_karsiligi",
          name: "Bahçelievler Konut",
          employer_name: null,
          contracting: null,
          land_share: {
            landowner_name: "Yılmaz Ailesi",
            our_share_pct: "55.00",
            owner_share_pct: "45.00",
            land_cost: "0.00",
            contract_no: null,
            notary_date: null,
            land_area_m2: null,
            construction_area_m2: null,
            delivery_date: null,
            daily_penalty: null,
            guarantee_amount: null,
            shareholder_count: 0,
            shareholders: [],
            our_unit_count: COUNT_PENDING("units"),
            owner_unit_count: COUNT_PENDING("units"),
            our_share_value: METRIC_PENDING("units"),
            construction_cost: METRIC_PENDING("project_costs"),
            estimated_profit: METRIC_PENDING("progress_payments"),
            margin: METRIC_PENDING("progress_payments"),
            construction_progress: METRIC_PENDING("progress_payments"),
          },
        }}
      />,
    );
    expect(screen.getByText("KAT KARŞILIĞI")).toBeInTheDocument();
    expect(screen.getByText("Konut · Ankara · Arsa Sahibi: Yılmaz Ailesi")).toBeInTheDocument();
    expect(screen.getByText("Biz %55")).toBeInTheDocument();
    expect(screen.getByText("Arsa %45")).toBeInTheDocument();
    expect(screen.getByText("Arsa Maliyeti")).toBeInTheDocument();
    expect(screen.getByText("₺ 0")).toBeInTheDocument();
    expect(screen.getByText("Kendi Pay Değeri")).toBeInTheDocument();
    expect(screen.getByTitle("Ünite satış modülüyle birlikte gelir")).toHaveTextContent("—");
  });
});
