import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProjectCard } from "./ProjectCard";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";

// NOT: Gercek semada tip-basi metrikler duz alanlar degil, ContractingCard /
// InvestmentCard / LandShareCard icine gomulu (plan Task 4 duz `project.spent` vb.
// varsaymisti — schema.d.ts'teki gercek yapiya uyduk, spec §3'teki alan adlari
// yerine bu iceriklerle raporda not edildi).
const METRIC_PENDING = (m: string) => ({ available: false, value: null, pending_module: m });
const COUNT_PENDING = (m: string) => ({ available: false, count: null, pending_module: m });
// P10 (2026-08-11): dolu zarf. Sema sozlesmesi geregi `available=true` ⇒
// `pending_module is None` — testler de zarfi bu sekilde kurar.
const METRIC_REAL = (value: string) => ({ available: true, value, pending_module: null });

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

  // 2026-07-30: eski "kart tiklanmaz" kurali (spec §9) gecersiz — detay ekrani P2'de
  // geldi, mockup satir 106/134 kartlari <a> olarak basiyor.
  it("kartin tamami proje detayina goturen tek link olur", () => {
    render(<ProjectCard project={base} />);
    const link = screen.getByRole("link", { name: /Güneşkent A-Blok/ });
    expect(link).toHaveAttribute("href", `/projeler/${base.id}`);
    // Ic ice etkilesim yok: kartta tek bir etkilesimli oge var.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("link klavyeyle odaklanabilir", async () => {
    const user = userEvent.setup();
    render(<ProjectCard project={base} />);
    await user.tab();
    expect(screen.getByRole("link", { name: /Güneşkent A-Blok/ })).toHaveFocus();
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

  // P10 · alan seti mockup 120-123'e birebir
  // (Satış Hedefi / Satılan / Toplam Maliyet / Tahmini Kâr) + 128 marj cipi.
  it("dolu zarflarda gercek deger ve marj cipi basar", () => {
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
            sold_amount: METRIC_REAL("31400000.00"),
            sales_ratio: METRIC_PENDING("units"),
            unit_summary: COUNT_PENDING("units"),
            total_cost: METRIC_REAL("20300000.00"),
            estimated_profit: METRIC_REAL("18400000.00"),
            margin: METRIC_REAL("38.20"),
          },
        }}
      />,
    );
    expect(screen.getByText("₺ 48,2M")).toBeInTheDocument(); // mockup 120
    expect(screen.getByText("₺ 31,4M")).toBeInTheDocument(); // mockup 121 "Satılan"
    expect(screen.getByText("Toplam Maliyet")).toBeInTheDocument();
    expect(screen.getByText("₺ 20,3M")).toBeInTheDocument(); // mockup 122
    expect(screen.getByText("₺ 18,4M")).toBeInTheDocument(); // mockup 123 "Tahmini Kâr"
    expect(screen.getByText("%38,2 marj")).toBeInTheDocument(); // mockup 128
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
    // Zarf bos oldugunda marj cipi SILINMEZ: "—" + gerekce basar (mockup 160).
    expect(screen.getByText("— marj")).toBeInTheDocument();
  });

  // P10 · alan seti mockup 152-155 + 160 marj cipi.
  it("dolu zarflarda kendi pay / insaat maliyeti / kâr ve marj gercek basar", () => {
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
            shareholder_count: 3,
            shareholders: [],
            our_unit_count: COUNT_PENDING("units"),
            owner_unit_count: COUNT_PENDING("units"),
            our_share_value: METRIC_REAL("30400000.00"),
            construction_cost: METRIC_REAL("17600000.00"),
            estimated_profit: METRIC_REAL("12800000.00"),
            margin: METRIC_REAL("42.10"),
            construction_progress: METRIC_PENDING("progress_payments"),
          },
        }}
      />,
    );
    expect(screen.getByText("₺ 30,4M")).toBeInTheDocument(); // mockup 152
    expect(screen.getByText("₺ 0")).toBeInTheDocument(); // mockup 153 — arsa tanim geregi 0
    expect(screen.getByText("İnşaat Maliyeti")).toBeInTheDocument();
    expect(screen.getByText("₺ 17,6M")).toBeInTheDocument(); // mockup 154
    expect(screen.getByText("₺ 12,8M")).toBeInTheDocument(); // mockup 155
    expect(screen.getByText("%42,1 marj")).toBeInTheDocument(); // mockup 160
  });
});

describe("ProjectCard — dolu zarf `available` bayragina bakar", () => {
  // PT kurali: dallanma alan TIPINE degil BAYRAGA bakar. Ayni alan
  // (`contracting.spent`, mockup 181 "Harcanan") iki zarfla iki farkli sonuc verir.
  it("taahhutte harcanan dolu zarfla gercek deger basar", () => {
    render(
      <ProjectCard
        project={{
          ...base,
          contracting: { ...CONTRACTING_PLACEHOLDERS, spent: METRIC_REAL("8400000.00") },
        }}
      />,
    );
    expect(screen.getByText("Harcanan")).toBeInTheDocument();
    expect(screen.getByText("₺ 8,4M")).toBeInTheDocument();
    expect(screen.queryByTitle("Maliyet takibiyle birlikte gelir")).not.toBeInTheDocument();
  });

  // Zarf dolu ama deger null gelirse (sozlesme disi yuk) pending gorunumu KALIR.
  it("available=true fakat deger null ise pending gorunumune duser", () => {
    render(
      <ProjectCard
        project={{
          ...base,
          contracting: {
            ...CONTRACTING_PLACEHOLDERS,
            spent: { available: true, value: null, pending_module: null },
          },
        }}
      />,
    );
    expect(screen.getByTitle("İlgili modülle birlikte gelir")).toHaveTextContent("—");
  });

  it("taahhutte marj cipi YOKTUR (mockup 186-189 iscilik/taseron satiri)", () => {
    render(<ProjectCard project={base} />);
    expect(screen.queryByText(/marj$/)).not.toBeInTheDocument();
  });
});
