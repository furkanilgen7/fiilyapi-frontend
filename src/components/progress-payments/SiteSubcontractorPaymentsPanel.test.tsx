import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteSubcontractorPaymentsPanel } from "./SiteSubcontractorPaymentsPanel";
import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";

function item(overrides: Partial<SiteSubcontractorPaymentItem>): SiteSubcontractorPaymentItem {
  return {
    id: "scpp-1",
    contractId: "sc-1",
    subcontractorName: "Akın İnşaat",
    sequenceNo: 47,
    periodYear: 2026,
    periodMonth: 7,
    workCategory: "Betonarme İşleri",
    sectionId: null,
    grossTotal: "1240000.00",
    netTotal: "1016800.00",
    status: "pending_approval",
    isRevisionRequired: false,
    ...overrides,
  };
}

describe("SiteSubcontractorPaymentsPanel", () => {
  it("başlık ve 'Tümü →' linkini T2 rotasına basar (mockup satır 137-138)", () => {
    render(<SiteSubcontractorPaymentsPanel items={[]} isLoading={false} isError={false} />);
    expect(screen.getByText("Taşeron Hakedişleri")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tümü →" })).toHaveAttribute(
      "href",
      "/hakedisler/taseron",
    );
  });

  it("yükleniyor durumunda mesaj basar", () => {
    render(<SiteSubcontractorPaymentsPanel items={[]} isLoading={true} isError={false} />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    render(<SiteSubcontractorPaymentsPanel items={[]} isLoading={false} isError={true} />);
    expect(screen.getByText("Taşeron hakedişleri yüklenemedi")).toBeInTheDocument();
  });

  it("boş listede Türkçe boş-durum metni basar (boş kutu bırakmaz)", () => {
    render(<SiteSubcontractorPaymentsPanel items={[]} isLoading={false} isError={false} />);
    expect(screen.getByText("Bu şantiyede taşeron hakedişi yok")).toBeInTheDocument();
  });

  it("satır: isim #sıra, kategori, brüt tutar ve durum rozeti basar, /hakedisler/taseron/[id]'ye tıklanabilir", () => {
    render(
      <SiteSubcontractorPaymentsPanel
        items={[item({})]}
        isLoading={false}
        isError={false}
      />,
    );
    const link = screen.getByRole("link", { name: "Akın İnşaat — Hakediş #47" });
    expect(link).toHaveAttribute("href", "/hakedisler/taseron/scpp-1");
    expect(screen.getByText("Akın İnşaat #47")).toBeInTheDocument();
    expect(screen.getByText("Betonarme İşleri")).toBeInTheDocument();
    expect(screen.getByText("₺ 1.240.000")).toBeInTheDocument();
    expect(screen.getByText("Onay Bekliyor")).toBeInTheDocument();
  });

  it("iş kategorisi yoksa zarif düşüş uygular (satırı silmez, pending ipucu basar)", () => {
    render(
      <SiteSubcontractorPaymentsPanel
        items={[item({ workCategory: null })]}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.getByText("Akın İnşaat #47")).toBeInTheDocument();
    const pending = screen.getByTitle("İş kategorisi liste ucundan gelmiyor");
    expect(pending).toHaveTextContent("—");
  });

  // Fix round 1 (coordinator review) — alt metin BİLEŞİK ("iş kategorisi ·
  // bölüm"); bölüm bileşeni artık HİÇ kaybolmuyor.
  describe("alt metin: iş kategorisi · bölüm (fix round 1)", () => {
    it("(a) section_id DOLU ama adı çözülemiyorsa bölüm parçası pending gösterilir, kategori GERÇEK kalır", () => {
      render(
        <SiteSubcontractorPaymentsPanel
          items={[item({ workCategory: "Elektrik Tesisatı", sectionId: "sec-9" })]}
          isLoading={false}
          isError={false}
        />,
      );
      expect(screen.getByText("Elektrik Tesisatı")).toBeInTheDocument();
      const pending = screen.getByTitle("Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)");
      expect(pending).toHaveTextContent("—");
    });

    it("(b) section_id NULL ise 'Tüm Bölümler' GERÇEK metnini basar (pending DEĞİL)", () => {
      render(
        <SiteSubcontractorPaymentsPanel
          items={[item({ workCategory: "Elektrik Tesisatı", sectionId: null })]}
          isLoading={false}
          isError={false}
        />,
      );
      expect(screen.getByText("Tüm Bölümler")).toBeInTheDocument();
      expect(screen.queryByTitle("Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)")).not.toBeInTheDocument();
    });

    it("(c) kategori VE bölüm birlikte pending ise TEK birleşik gösterge basılır ('— · —' üretmez)", () => {
      render(
        <SiteSubcontractorPaymentsPanel
          items={[item({ workCategory: null, sectionId: "sec-9" })]}
          isLoading={false}
          isError={false}
        />,
      );
      // Tek bir "—" — iki ayrı pending tire yan yana DEĞİL.
      const dashes = screen.getAllByText("—");
      expect(dashes).toHaveLength(1);
      expect(dashes[0]).toHaveAttribute(
        "title",
        "İş kategorisi liste ucundan gelmiyor; Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)",
      );
    });
  });

  it("is_revision_required true ise durum yerine kırmızı 'Revize Gerekli' rozeti basar", () => {
    render(
      <SiteSubcontractorPaymentsPanel
        items={[item({ isRevisionRequired: true, status: "approved" })]}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.getByText("Revize Gerekli")).toBeInTheDocument();
    expect(screen.queryByText("Onaylandı")).not.toBeInTheDocument();
  });
});
