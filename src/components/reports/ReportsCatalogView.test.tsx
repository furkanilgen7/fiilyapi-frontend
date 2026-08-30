import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NAV_GROUPS } from "@/components/shell/nav-config";

import { REPORT_CATEGORIES, allReportRows, isLinkedRow } from "./reports-catalog";
import { ReportsCatalogView } from "./ReportsCatalogView";

/**
 * 🔴 GEREKÇE MÜHRÜ (F-MT emsali): gerekçe metinleri `pending-modules`tan
 * TÜREMELİDİR. Mühür, elle yazılmış bir gerekçeyi kırmızıya çevirir.
 */
vi.mock("@/lib/pending-modules", () => ({
  pendingModuleLabel: (key: string) => `GEREKÇE[${key}]`,
}));

/** 🔴 `getByRole("link")` açık `role` taşıyan öğeleri GÖRMEZ — DOM'dan topla. */
function hrefsInDom(container: HTMLElement): string[] {
  return [...container.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") ?? "");
}

describe("R1/R3 — bağlantılar", () => {
  it("DÖRT kategori kartı basılır", () => {
    render(<ReportsCatalogView />);
    for (const category of REPORT_CATEGORIES) {
      expect(screen.getByTestId(`rap-card-${category.key}`)).toHaveTextContent(category.title);
    }
  });

  it("YALNIZ etkin satırlar bağlantıdır; sayısı katalogla birebir", () => {
    const { container } = render(<ReportsCatalogView />);
    const linked = allReportRows().filter(isLinkedRow);
    const hrefs = hrefsInDom(container);
    expect(hrefs.sort()).toEqual(linked.map((r) => r.href).sort());
  });

  /**
   * 🔴 R3 · POZİTİF KONTROL — devre dışı satır TIKLANAMAZ.
   *
   * "Bağlantı sayısı doğru" iddiası, devre dışı satır `<a aria-disabled>`
   * olarak basılsaydı da geçerdi (o da bir `a[href]`tir ve sayıyı bozardı —
   * ama sayı iddiasını gevşetmek kolaydır). Bu yüzden her devre dışı satırın
   * KENDİ içinde hiç `a[href]` OLMADIĞI ayrıca iddia edilir.
   */
  it("devre dışı satırın içinde HİÇ bağlantı yoktur", () => {
    render(<ReportsCatalogView />);
    for (const row of allReportRows()) {
      if (isLinkedRow(row)) continue;
      const node = screen.getByTestId(`rap-row-${row.key}`);
      expect(node.querySelectorAll("a[href]"), `"${row.title}"`).toHaveLength(0);
    }
  });
});

describe("R4 — gerekçeler", () => {
  it("her devre dışı satır GÖRÜNÜR gerekçesini basar", () => {
    render(<ReportsCatalogView />);
    for (const row of allReportRows()) {
      if (isLinkedRow(row)) continue;
      expect(screen.getByTestId(`rap-${row.key}-reason`)).toHaveTextContent(row.reason);
    }
  });

  /** 🔴 POZİTİF KONTROL: etkin satırda gerekçe BASILMAZ. */
  it("etkin satırda gerekçe düğümü YOKTUR", () => {
    render(<ReportsCatalogView />);
    for (const row of allReportRows()) {
      if (!isLinkedRow(row)) continue;
      expect(screen.queryByTestId(`rap-${row.key}-reason`), `"${row.title}"`).toBeNull();
    }
  });

  it("iki gerekçe `pending-modules` kaydından TÜRER (elle yazılmaz)", () => {
    render(<ReportsCatalogView />);
    expect(screen.getByTestId("rap-proje-karlilik-reason")).toHaveTextContent(
      "GEREKÇE[project_profitability]",
    );
    expect(screen.getByTestId("rap-nakit-tahmin-reason")).toHaveTextContent(
      "GEREKÇE[cash_flow_projection]",
    );
  });
});

describe("mockup'ın kaynaksız öğeleri — silinmez, devre dışı basılır", () => {
  it("R62 proje süzgeci devre dışıdır ve gerekçesi görünür", () => {
    render(<ReportsCatalogView />);
    expect(screen.getByTestId("rap-project-filter")).toBeDisabled();
    expect(screen.getByTestId("rap-project-filter-reason")).toHaveTextContent(
      "GEREKÇE[financial_statements_project_filter]",
    );
  });

  it("R62 — uçta karşılığı olmayan ikinci proje seçeneği BASILMAZ", () => {
    render(<ReportsCatalogView />);
    const options = within(screen.getByTestId("rap-project-filter")).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Tüm Projeler");
  });

  it("R77-80 — HER biçim çipi devre dışıdır (14 satırın hepsinde)", () => {
    render(<ReportsCatalogView />);
    let chips = 0;
    for (const row of allReportRows()) {
      for (const format of row.formats) {
        expect(
          screen.getByTestId(`rap-${row.key}-${format.toLowerCase()}`),
          `"${row.title}" ${format}`,
        ).toBeDisabled();
        chips += 1;
      }
    }
    // Mockup'ın çizdiği çip sayısı, kart kart sayıldı:
    //   Mali 4×2=8 · Saha 2+1+1+2=6 · İK 2+1+1=4 · Stok 2+1+1=4  ⇒ 22.
    expect(chips).toBe(22);
  });

  it("biçim çiplerinin ORTAK gerekçesi bir kez basılır", () => {
    render(<ReportsCatalogView />);
    expect(screen.getByTestId("rap-export-reason")).toHaveTextContent("GEREKÇE[pdf_export]");
  });
});

describe("kabuk ile tutarlılık", () => {
  /**
   * R59 "Genel" kabuk nav'ının GRUP BAŞLIĞIdır. Metin KOPYALANMAZ: grup adı
   * değişirse bu satır kendiliğinden ona uyar — iddia da nav'dan okur.
   */
  it("eyebrow kabuk nav'ının ilk grup başlığından TÜRER", () => {
    render(<ReportsCatalogView />);
    expect(screen.getByText(NAV_GROUPS[0].heading)).toBeInTheDocument();
  });

  /** 🔴 Kırıntı üst çubuktadır; sayfa İKİNCİ bir `Raporlar › …` basmaz. */
  it("sayfa içinde ikinci bir kırıntı YOKTUR (tek `h1`)", () => {
    render(<ReportsCatalogView />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Raporlar" })).toBeInTheDocument();
  });
});
