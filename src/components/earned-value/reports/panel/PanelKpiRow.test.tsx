import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelKpiRow } from "./PanelKpiRow";
import { panelReportFixture } from "./panel-fixtures";

const KPI = panelReportFixture().kpi!;

describe("PanelKpiRow", () => {
  it("6 kart basar (role=listitem)", () => {
    render(<PanelKpiRow kpi={KPI} weekNo={21} distributeHref="/gunluk-kayit" canDistribute />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("kpi null ise HİÇBİR ŞEY basmaz (uydurma veri yok)", () => {
    const { container } = render(<PanelKpiRow kpi={null} weekNo={21} distributeHref="/gunluk-kayit" canDistribute />);
    expect(container).toBeEmptyDOMElement();
  });

  it("Kümülatif PF bandı bant sınıfını taşır", () => {
    render(<PanelKpiRow kpi={KPI} weekNo={21} distributeHref="/gunluk-kayit" canDistribute />);
    expect(screen.getByText("1,03")).toHaveClass(`pf-band-cell--${KPI.pf_cum_band}`);
  });

  it("hafta numarası başlığa eklenir", () => {
    render(<PanelKpiRow kpi={KPI} weekNo={21} distributeHref="/gunluk-kayit" canDistribute />);
    expect(screen.getByText("Bu hafta PF · H21")).toBeInTheDocument();
  });

  it("canDistribute=false → 'Dağıt →' bağlantısı BASILMAZ (salt okunur varyant)", () => {
    render(<PanelKpiRow kpi={KPI} weekNo={21} distributeHref="/gunluk-kayit" canDistribute={false} />);
    expect(screen.queryByRole("link", { name: /Dağıt/ })).toBeNull();
  });

  it("canDistribute=true → 'Dağıt →' bağlantısı verilen href'e gider", () => {
    render(<PanelKpiRow kpi={KPI} weekNo={21} distributeHref="/projeler/p/santiyeler/s/gunluk-kayit?tarih=2026-09-24" canDistribute />);
    expect(screen.getByRole("link", { name: /Dağıt/ })).toHaveAttribute(
      "href",
      "/projeler/p/santiyeler/s/gunluk-kayit?tarih=2026-09-24",
    );
  });

  it("Durum rozeti geride (▼) glifini INLINE SVG ile basar (çıplak glif YOK)", () => {
    render(<PanelKpiRow kpi={KPI} weekNo={21} distributeHref="/gunluk-kayit" canDistribute />);
    expect(screen.getByText("Geride")).toBeInTheDocument();
  });
});

/**
 * LİDER DENETİMİ (F3.3-ek) · 10 mutasyondan 4'ü hayatta kaldı — hepsi
 * PanelKpiRow'un DEĞER alanlarında (mhr/yüzde/sapma/hafta PF), çünkü önceki
 * testler yalnız ETİKET/yapı doğruluyordu, biçimlenmiş METNİ değil. Her satır
 * kendi `beklenen ≠ ham-virgül` denetimini taşır (Number.isNaN — ayırt edici
 * girdi biçimlendiriciyi GERÇEKTEN çağırmazsa test kendi kendine patlar).
 *
 * Girdi seçimi BİLEREK ayırt edici:
 *   - a-s alanları: binlik ayracı gerektiren tam sayılar (ör. "22345" →
 *     "22.345") — ham metin noktasız kalırdı.
 *   - yüzde: yarım-yukarı yuvarlama sınırı ("0.4585" → nokta ikinci basamak
 *     5 → "%45,9"; ham metin "45.85" ya da "0.4585" kalırdı).
 *   - sapma: işaret + yarım-yukarı ("-0.0245" → "−2,5"; ham metin "-2.45"
 *     ya da eksi işareti ASCII "-" kalırdı, ürün Unicode MINUS SIGN kullanır).
 *   - PF: yarım-yukarı 2 ondalık ("1.005" → "1,01"; ham metin "1.005" kalırdı).
 */
describe("PanelKpiRow · TABLO GÜDÜMLÜ biçim denetimi (F3.3-ek)", () => {
  const DISTINCT_KPI = {
    ...KPI,
    budget_mhr: "22345",
    earned_cum: "18642",
    earned_day: "5432",
    spent_day: "9876",
    timesheet_total_day: "12345",
    undistributed_day: "1234",
    planned_pct_cum: "0.5015",
    progress_pct_cum: "0.4585",
    variance: "-0.0245",
    pf_cum: "1.005",
    pf_week: "0.995",
  };

  /**
   * `budget_mhr` TEK BAŞINA kendi elemanına sahip değil — "Kazanılmış / Bütçe"
   * kartının PAYDA'sında "/ {mhr} a-s" biçiminde komşu metinle aynı `<span>`de
   * basılır (PanelKpiRow.tsx satır 76). Bu yüzden o SATIR `getAllByText` DEĞİL,
   * kapsayıcı elemanın `textContent`ine `toContain` ile bakar; diğer TÜM
   * alanlar kendi izole elemanlarında (`<span>`/`<b>`) basıldığı için exact
   * eşleşir.
   */
  const CASES: readonly { label: string; raw: string; expected: string; containerSelector?: string }[] = [
    { label: "Bütçe a-s (budget_mhr) → binlik ayracı", raw: "22345", expected: "22.345", containerSelector: ".ev-panel-kpi__ratio-den" },
    { label: "Kazanılmış (earned_cum) → binlik ayracı", raw: "18642", expected: "18.642" },
    { label: "Bugün kazanılmış (earned_day) → binlik ayracı", raw: "5432", expected: "5.432" },
    { label: "Bugün harcanan (spent_day) → binlik ayracı", raw: "9876", expected: "9.876" },
    { label: "Puantaj toplamı (timesheet_total_day) → binlik ayracı", raw: "12345", expected: "12.345" },
    { label: "Dağıtılmamış saat (undistributed_day) → binlik ayracı", raw: "1234", expected: "1.234" },
    { label: "Planlı % (planned_pct_cum) → yarım-yukarı", raw: "0.5015", expected: "%50,2" },
    { label: "Gerçek % (progress_pct_cum) → yarım-yukarı", raw: "0.4585", expected: "%45,9" },
    { label: "Sapma (variance) → işaret + yarım-yukarı", raw: "-0.0245", expected: "−2,5" },
    { label: "Kümülatif PF (pf_cum) → yarım-yukarı 2 ondalık", raw: "1.005", expected: "1,01" },
    { label: "Bu hafta PF (pf_week) → yarım-yukarı 2 ondalık", raw: "0.995", expected: "1,00" },
  ];

  function assertShown({ expected, containerSelector }: { expected: string; containerSelector?: string }) {
    if (containerSelector !== undefined) {
      expect(document.querySelector(containerSelector)?.textContent).toContain(expected);
      return;
    }
    expect(screen.getAllByText(expected, { exact: true }).length).toBeGreaterThan(0);
  }

  it.each(CASES)("$label → ekranda '$expected' basılır (ham virgül DEĞİL)", (testCase) => {
    render(<PanelKpiRow kpi={DISTINCT_KPI} weekNo={21} distributeHref="/gunluk-kayit" canDistribute />);
    // Kendi kendini denetler: beklenen değer KAYNAK (API) alanının ham hâliyle
    // AYNI OLAMAZ — aksi hâlde bu satır biçimleyiciyi gerçekten sınamaz,
    // yalnız tesadüfen eşleşir (raw API her zaman nokta ondalıklı ASCII string'dir).
    expect(testCase.expected).not.toBe(testCase.raw);
    assertShown(testCase);
  });

  it("tüm değer alanları TEK render'da bir arada doğru basılır (kartlar birbirine karışmaz)", () => {
    render(<PanelKpiRow kpi={DISTINCT_KPI} weekNo={21} distributeHref="/gunluk-kayit" canDistribute />);
    for (const testCase of CASES) {
      assertShown(testCase);
    }
  });
});
