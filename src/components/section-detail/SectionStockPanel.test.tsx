import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { SectionStockPanel } from "./SectionStockPanel";

// F-BLMSEK T3 · Bölüm Detay › "Malzeme" sekmesinin gövdesi.
//
// 🔴 Bu sekme BİLİNÇLİ OLARAK pending kalır (Malzeme diğer dört sekmenin
// aksine bölüm bağı AÇILAMAZ — ölçüldü: `backend/app/modules/inventory/`
// içinde `section_id` SIFIR kolon isabeti). Görevin amacı jenerik
// `${label} — bu bölümde henüz görüntülenemiyor` şablonunu SPESİFİK bir
// başlıkla değiştirmek ve kullanıcıyı GERÇEK veriye (şantiye stok ekranı)
// yönlendirmektir — bkz. `CardEmptyState` + `pendingModule="section_stock"`
// hâlâ KORUNUR, yalnız başlık ve bağlantı eklenir.

const SECTION_NAME = "Kat 6–10 Kaba İnşaat";
const STOCK_HREF = "/projeler/p-1/santiyeler/s-1/stok";

function renderPanel(props: Partial<React.ComponentProps<typeof SectionStockPanel>> = {}) {
  return render(
    <SectionStockPanel sectionName={SECTION_NAME} stockHref={STOCK_HREF} {...props} />,
  );
}

describe("SectionStockPanel", () => {
  it("başlık jenerik '${label} — bu bölümde henüz görüntülenemiyor' şablonunu KULLANMAZ", () => {
    renderPanel();

    expect(screen.queryByText(/— bu bölümde henüz görüntülenemiyor/)).not.toBeInTheDocument();
  });

  it("başlık bölüm adını taşır (jenerik doldur-boşluk DEĞİL)", () => {
    renderPanel();

    expect(screen.getByTestId("section-stock")).toHaveTextContent(SECTION_NAME);
  });

  it("section_stock pending gerekçesini basar — bu sekme GERÇEKTEN pending", () => {
    renderPanel();

    expect(
      screen.getByText(/Stok hareketi bölüm alanı taşımıyor/),
    ).toBeInTheDocument();
  });

  it("şantiye stok ekranına giden bir bağlantı basar", () => {
    renderPanel();

    const panel = screen.getByTestId("section-stock");
    const link = within(panel).getByRole("link");
    expect(link).toHaveAttribute("href", STOCK_HREF);
  });

  it("bağlantı bölüm süzgeci TAŞIMAZ (?section= yok — carriesSection:false kararı)", () => {
    renderPanel();

    const panel = screen.getByTestId("section-stock");
    const link = within(panel).getByRole("link");
    expect(link.getAttribute("href")).not.toContain("?section=");
  });
});
