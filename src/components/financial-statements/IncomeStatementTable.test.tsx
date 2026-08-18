import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { IncomeStatementResponse } from "@/lib/api/hooks/useIncomeStatement";

import { IncomeStatementBanner } from "./IncomeStatementBanner";
import { IncomeStatementTable } from "./IncomeStatementTable";

/**
 * F-MT2 T3/T4 · E11:87-147 tablosu + K1 mutabakat şeridi.
 *
 * 🔴 ETİKETLER SUNUCUDAN: fikstürün başlıkları mockup'ınkinden BİLEREK
 * FARKLIdır ("GELİRLER" yerine "SUNUCU GELİR BAŞLIĞI"). Bileşen mockup
 * metnini sabitlerse bu testler kırmızıya döner — kanon: *sabit metin bir
 * olgu iddia ediyorsa, o olguyu okumak zorundadır.*
 */
function fixture(overrides: Partial<IncomeStatementResponse> = {}): IncomeStatementResponse {
  return {
    year: 2026,
    month: 7,
    sections: [
      {
        key: "revenue",
        title: "SUNUCU GELİR BAŞLIĞI",
        subtotal_label: "Sunucu Toplam Gelir",
        subtotal: "24994700.00",
        lines: [
          { key: "construction_revenue", label: "İş Hasılatı", amount: "24870500.00", account_codes: ["600"] },
          { key: "other_revenue", label: "Diğer Gelirler", amount: "124200.00", account_codes: ["649"] },
        ],
      },
      {
        key: "expenses",
        title: "SUNUCU GİDER BAŞLIĞI",
        subtotal_label: "Sunucu Toplam Gider",
        subtotal: "21482000.00",
        lines: [
          { key: "material_costs", label: "Malzeme Giderleri", amount: "12480000.00", account_codes: ["150"] },
          { key: "labor_costs", label: "İşçilik Giderleri", amount: "5840000.00", account_codes: ["720"] },
          { key: "subcontractor_costs", label: "Taşeron Ödemeleri", amount: "3120000.00", account_codes: ["740"] },
          { key: "general_expenses", label: "Genel Giderler", amount: "42000.00", account_codes: ["770"] },
        ],
      },
    ],
    total_revenue: "24994700.00",
    total_expense: "21482000.00",
    profit_label: "DÖNEM KARI",
    period_profit: "3512700.00",
    ...overrides,
  };
}

describe("E11:87-147 · tablo iskeleti", () => {
  it("🔴 bölüm bandı, ara toplam ve kâr etiketleri SUNUCUDAN gelir", () => {
    render(<IncomeStatementTable data={fixture()} />);

    expect(screen.getByTestId("mt-is-section-revenue-band")).toHaveTextContent(
      "SUNUCU GELİR BAŞLIĞI",
    );
    expect(screen.getByTestId("mt-is-section-revenue-subtotal")).toHaveTextContent(
      "Sunucu Toplam Gelir",
    );
    expect(screen.getByTestId("mt-is-section-expenses-band")).toHaveTextContent(
      "SUNUCU GİDER BAŞLIĞI",
    );
    expect(screen.getByTestId("mt-is-profit")).toHaveTextContent("DÖNEM KARI");
  });

  it("E11:98-99 kalem tutarları `₺` SİZ ve tr-TR ayraçlı basılır", () => {
    render(<IncomeStatementTable data={fixture()} />);

    const line = screen.getByTestId("mt-is-section-revenue-construction_revenue");
    expect(line).toHaveTextContent("24.870.500");
    expect(line).not.toHaveTextContent("₺");
  });

  it("🔴 HAREKETSİZ kalem (`0`) listeden DÜŞMEZ, `0` basar", () => {
    const data = fixture();
    const zeroed: IncomeStatementResponse = {
      ...data,
      sections: data.sections.map((section) =>
        section.key !== "revenue"
          ? section
          : {
              ...section,
              lines: section.lines.map((line) =>
                line.key === "other_revenue" ? { ...line, amount: "0.00" } : line,
              ),
            },
      ),
    };
    render(<IncomeStatementTable data={zeroed} />);

    const row = screen.getByTestId("mt-is-section-revenue-other_revenue");
    expect(row).toBeInTheDocument();
    expect(within(row).getByText("0")).toBeInTheDocument();
  });

  it("küme SABİTtir: 2 bant + 6 kalem + 2 ara toplam + 1 kâr = 11 satır", () => {
    render(<IncomeStatementTable data={fixture()} />);
    expect(screen.getByTestId("mt-is-table").querySelectorAll("tbody tr")).toHaveLength(11);
  });
});

describe("🔴 K2 · ORAN sütunu — GİDER payı hesaplanır, TREND hesaplanmaz", () => {
  it("gider kalemleri toplam gelire oranını basar (E11:117-126)", () => {
    render(<IncomeStatementTable data={fixture()} />);

    expect(screen.getByTestId("mt-is-section-expenses-material_costs")).toHaveTextContent("%49,9");
    expect(screen.getByTestId("mt-is-section-expenses-general_expenses")).toHaveTextContent("%0,2");
  });

  it("E11:142 kâr satırı NET marjı basar (mockup'ın `Brüt Marj` etiketi YANLIŞTIR)", () => {
    render(<IncomeStatementTable data={fixture()} />);
    expect(screen.getByTestId("mt-is-profit")).toHaveTextContent("%14,1");
  });

  it("🔴 GELİR kalemlerinde trend UYDURULMAZ — hücre `—` basar (E11:99)", () => {
    render(<IncomeStatementTable data={fixture()} />);

    for (const key of ["construction_revenue", "other_revenue"]) {
      const cell = screen
        .getByTestId(`mt-is-section-revenue-${key}`)
        .querySelector(".fs-is-ratio");
      expect(cell?.textContent).toBe("—");
    }
    // Gerekçe EKRANDA basılır, `title`da SAKLANMAZ.
    expect(screen.getByTestId("mt-is-ratio-note")).toBeInTheDocument();
  });

  it("🔴 SIFIR gelirde oran `NaN`/`Infinity` DEĞİL `—` basar (K1.4)", () => {
    const data = fixture({ total_revenue: "0.00", period_profit: "0.00" });
    render(<IncomeStatementTable data={data} />);

    expect(screen.getByTestId("mt-is-table")).not.toHaveTextContent("NaN");
    expect(screen.getByTestId("mt-is-table")).not.toHaveTextContent("Infinity");
    expect(
      screen.getByTestId("mt-is-section-expenses-material_costs").querySelector(".fs-is-ratio")
        ?.textContent,
    ).toBe("—");
    expect(screen.getByTestId("mt-is-profit").querySelector(".fs-is-ratio")?.textContent).toBe("—");
  });

  it("ara toplam satırlarının oran hücresi BOŞtur (E11:106/136)", () => {
    render(<IncomeStatementTable data={fixture()} />);
    expect(
      screen.getByTestId("mt-is-section-revenue-subtotal").querySelector(".fs-is-ratio")
        ?.textContent,
    ).toBe("");
  });
});

describe("🔴 K1 · DÖNEM KARI satırı `period_profit` basar", () => {
  it("mutabık dalda `total_revenue − total_expense` ile aynı sayıdır", () => {
    render(<IncomeStatementTable data={fixture()} />);
    expect(screen.getByTestId("mt-is-profit")).toHaveTextContent("3.512.700");
  });

  it("🔴 AYRIŞMA NOKTASI: fark sıfır DEĞİLKEN de `period_profit` basılır", () => {
    // Aktarım fişi atılmış defter: kalemlerden çıkan 3.512.700 DEĞİL,
    // `period_profit`in 3.000.000'i basılır — Bilanço'nun `Dönem Net Kârı`
    // ile AYNI fonksiyondur, ayrışırsa iki mali tablo çelişir.
    render(<IncomeStatementTable data={fixture({ period_profit: "3000000.00" })} />);

    expect(screen.getByTestId("mt-is-profit")).toHaveTextContent("3.000.000");
    expect(screen.getByTestId("mt-is-profit")).not.toHaveTextContent("3.512.700");
  });
});

/**
 * 🔴 İKİ AYRI BEKÇİ (kanon: *"atladı mı" ve "bağırdı mı" AYRI çakılır*).
 * Yukarıdaki describe "doğru sayı basıldı mı"yı, aşağıdaki "şerit çıktı mı"yı
 * sorar; biri ötekinin yerine geçemez.
 */
describe("🔴 K1.3 · mutabakat şeridi", () => {
  it("fark SIFIRSA şerit YEŞİL daldadır ve mutabakatı söyler", () => {
    render(<IncomeStatementBanner data={fixture()} />);

    const banner = screen.getByTestId("mt-is-banner");
    expect(banner).toHaveClass("fs-banner--ok");
    expect(banner).toHaveTextContent("Mutabık");
    // Etiket SUNUCUDAN (`profit_label`).
    expect(banner).toHaveTextContent("DÖNEM KARI");
  });

  it("fark SIFIR DEĞİLSE şerit KIRMIZI dala döner, farkı ve GEREKÇESİNİ söyler", () => {
    render(<IncomeStatementBanner data={fixture({ period_profit: "3000000.00" })} />);

    const banner = screen.getByTestId("mt-is-banner");
    expect(banner).toHaveClass("fs-banner--off");
    expect(banner).toHaveTextContent("fark: ₺ 512.700");
    expect(banner).toHaveTextContent(/maliyet aktarım/i);
    // 🔴 `≠` (U+2260) YAZILMAZ — `fonts.css`in hiçbir alt kümesi kapsamıyor.
    expect(banner.textContent ?? "").not.toContain("≠");
  });

  it("fark TERS yöndeyken de MUTLAK değer basılır (eksi işareti sızmaz)", () => {
    render(<IncomeStatementBanner data={fixture({ period_profit: "4000000.00" })} />);

    const banner = screen.getByTestId("mt-is-banner");
    expect(banner).toHaveClass("fs-banner--off");
    expect(banner).toHaveTextContent("fark: ₺ 487.300");
    expect(banner.textContent ?? "").not.toContain("-487.300");
  });
});
