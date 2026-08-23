import { describe, it, expect } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

import { SubcontractorCostTable } from "./SubcontractorCostTable";
import type {
  SubcontractorCostRow,
  SubcontractorCostSummary,
} from "@/lib/api/hooks/useProjectCosts";

/**
 * F-PKK · KY 205-249 / KK 210-247 taşeron tablosu — bu dilimin EN ÇOK KARAR
 * taşıyan bileşeni. İki mockup'ın sütunları AYNI DEĞİLDİR ve emrin ilk hâli
 * `Durum`u YANLIŞ tabloya atfediyordu; buradaki iddialar o ölçümü çakar.
 */
const TOTAL: SubcontractorCostSummary = {
  contract_amount: "12600000.00",
  paid: "6912000.00",
  pending: "840000.00",
};

function row(overrides: Partial<SubcontractorCostRow> = {}): SubcontractorCostRow {
  return {
    contract_id: "c-1",
    contract_no: "TSD-1",
    subcontractor_id: "s-1",
    subcontractor_name: "Akın İnşaat",
    work_category: "Kaba İnşaat",
    contract_amount: "8400000.00",
    paid: "5712000.00",
    pending: "840000.00",
    progress_pct: "68.00",
    ...overrides,
  };
}

describe("SubcontractorCostTable — sütunlar türe göre AYRIŞIR", () => {
  it("KY'de 'Bekleyen' sutunu VARDIR (KY 212)", () => {
    render(
      <SubcontractorCostTable rows={[row()]} total={TOTAL} projectType="kendi_yatirim" />,
    );
    expect(screen.getByRole("columnheader", { name: "Bekleyen" })).toBeInTheDocument();
    cleanup();
  });

  /**
   * 🔴 KK'da `Bekleyen` YOKTUR (mockup öyle çizer) ve `Durum` da BASILMAZ:
   * satırda durum alanı yok, ayrıca `ContractStatus{active,completed,on_hold}`
   * mockup'ın sözcüklerine ("Başlamadı") oturmuyor.
   */
  it("KK'da ne 'Bekleyen' ne 'Durum' sutunu basilir", () => {
    render(<SubcontractorCostTable rows={[row()]} total={TOTAL} projectType="kat_karsiligi" />);
    expect(screen.queryByRole("columnheader", { name: "Bekleyen" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Durum" })).toBeNull();
    cleanup();
  });

  it("KK'da basilmayan 'Durum' sutununun gerekcesi EKRANDA gorunur", () => {
    render(<SubcontractorCostTable rows={[row()]} total={TOTAL} projectType="kat_karsiligi" />);
    expect(screen.getByText(/Sözleşme durumu maliyet satırından gelmiyor/)).toBeVisible();
    cleanup();
  });

  it("KY'de o gerekce BASILMAZ (orada sutun zaten yok)", () => {
    render(<SubcontractorCostTable rows={[row()]} total={TOTAL} projectType="kendi_yatirim" />);
    expect(screen.queryByText(/Sözleşme durumu maliyet satırından gelmiyor/)).toBeNull();
    cleanup();
  });
});

describe("SubcontractorCostTable — İlerleme hücresi", () => {
  /**
   * 🔴 İKİ SIFIR AYRI ŞEYDİR. Bedeli `0` olan sözleşmede oran TANIMSIZDIR
   * (`progress_pct: null`) ve `—` basılır; bedeli olup ödeme görmemiş
   * sözleşme ise GERÇEK `%0` basar (KY 236-243 mockup'ta harfiyen `%0`).
   */
  it("progress_pct null ise '—' basar, '%0' DEGIL", () => {
    render(
      <SubcontractorCostTable
        rows={[row({ contract_amount: "0.00", paid: "0.00", progress_pct: null })]}
        total={TOTAL}
        projectType="kendi_yatirim"
      />,
    );
    const dataRow = screen.getAllByRole("row")[1];
    expect(within(dataRow).getByText("—")).toBeVisible();
    expect(within(dataRow).queryByText("%0")).toBeNull();
    cleanup();
  });

  it("bedeli olup odeme gormemis sozlesme GERCEK %0 basar", () => {
    render(
      <SubcontractorCostTable
        rows={[row({ paid: "0.00", progress_pct: "0.00" })]}
        total={TOTAL}
        projectType="kendi_yatirim"
      />,
    );
    expect(screen.getByText("%0")).toBeVisible();
    cleanup();
  });
});

describe("SubcontractorCostTable — boş/eksik alanlar", () => {
  /** `work_category` NULL MEŞRUDUR (taslak sözleşme): uydurma metin YOK. */
  it("work_category null ise hucre '—' basar", () => {
    render(
      <SubcontractorCostTable
        rows={[row({ work_category: null })]}
        total={TOTAL}
        projectType="kendi_yatirim"
      />,
    );
    const dataRow = screen.getAllByRole("row")[1];
    expect(within(dataRow).getAllByText("—").length).toBeGreaterThan(0);
    cleanup();
  });

  it("hic sozlesme yoksa tablo degil DURUST bir bos hal basar", () => {
    render(<SubcontractorCostTable rows={[]} total={TOTAL} projectType="kendi_yatirim" />);
    expect(screen.getByText("Bu projede taşeron sözleşmesi yok.")).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
    cleanup();
  });

  /**
   * KY 248 tfoot'unun "İlerleme" hücresi HARFİYEN BOŞTUR — şema bunu bilinçli
   * sayar ("hangi ortalama" sorusunun tek doğru cevabı yok). Toplam satırı
   * bir yüzde UYDURMAZ.
   */
  it("tfoot toplam bir ILERLEME yuzdesi UYDURMAZ", () => {
    render(<SubcontractorCostTable rows={[row()]} total={TOTAL} projectType="kendi_yatirim" />);
    const footRow = screen.getAllByRole("row").at(-1)!;
    expect(footRow).toHaveTextContent("TOPLAM TAŞERON MALİYETİ");
    expect(footRow).not.toHaveTextContent("%");
    cleanup();
  });
});
