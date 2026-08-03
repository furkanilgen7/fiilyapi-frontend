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
    workCategory: "Betonarme İşleri",
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
    const pending = screen.getByTitle("İş kategorisi alanıyla birlikte gelir");
    expect(pending).toHaveTextContent("—");
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
