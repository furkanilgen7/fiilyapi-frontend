import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { UpcomingPaymentsResponse } from "@/lib/api/hooks/useUpcomingPayments";

import { UpcomingPaymentsPanel } from "./UpcomingPaymentsPanel";

const RESPONSE: UpcomingPaymentsResponse = {
  days: 7,
  as_of: "2026-07-17",
  items: [
    {
      source_type: "subcontractor_progress_payment",
      source_id: "pp-1",
      counterparty: "Akın İnşaat",
      document_no: "47",
      due_date: "2026-07-19",
      days_remaining: 2,
      amount: "1016800.00",
    },
    {
      source_type: "invoice",
      source_id: "inv-1",
      counterparty: "Yılmaz Elektrik",
      document_no: "FT-118",
      due_date: "2026-07-24",
      days_remaining: 7,
      amount: "475600.00",
    },
  ],
};

function renderPanel(upcoming: UpcomingPaymentsResponse | undefined) {
  return render(
    <UpcomingPaymentsPanel upcoming={upcoming} isLoading={false} errorMessage={undefined} />,
  );
}

describe("UpcomingPaymentsPanel — E9:109-125", () => {
  it("E9:110 başlığındaki gün sayısını SUNUCUNUN echo'sundan basar", () => {
    renderPanel({ ...RESPONSE, days: 30 });
    expect(screen.getByText("Yaklaşan Ödemeler (30 Gün)")).toBeInTheDocument();
    // Sabit 7 yazılsaydı bu iddia kırılırdı.
    expect(screen.queryByText("Yaklaşan Ödemeler (7 Gün)")).not.toBeInTheDocument();
  });

  it("E9:110 başlığı ayrık modifier taşır (alt boşluğu 14px, 91'deki 16px değil)", () => {
    renderPanel(RESPONSE);
    const title = screen.getByText("Yaklaşan Ödemeler (7 Gün)");
    expect(title).toHaveClass("hazine-panel__title");
    expect(title).toHaveClass("hazine-panel__title--upcoming");
  });

  it("E9:113 satır başlığını en-dash + kaynak etiketiyle kurar", () => {
    renderPanel(RESPONSE);
    expect(screen.getByText("Akın İnşaat – Hakediş #47")).toBeInTheDocument();
    expect(screen.getByText("Yılmaz Elektrik – Fatura #FT-118")).toBeInTheDocument();
  });

  it("🔴 E9:113 tarihi UTC kaymadan basar ve gün sayısını SUNUCUDAN alır", () => {
    renderPanel(RESPONSE);
    // `new Date("2026-07-19")` UTC gece yarısıdır; "18 Temmuz" basılırsa kusur.
    expect(screen.getByText("19 Temmuz · 2 gün kaldı")).toBeInTheDocument();
    expect(screen.getByText("24 Temmuz · 7 gün kaldı")).toBeInTheDocument();
  });

  it("E9:114 tutarı BOŞLUKSUZ ₺ ile mono basar", () => {
    renderPanel(RESPONSE);
    expect(screen.getByText("₺1.016.800")).toBeInTheDocument();
    expect(screen.queryByText("₺ 1.016.800")).not.toBeInTheDocument();
  });

  it("ton `days_remaining` ile MONOTONdur (onaylı sapma)", () => {
    renderPanel({
      ...RESPONSE,
      items: [0, 2, 3, 4, 5, 7].map((days, index) => ({
        source_type: "invoice" as const,
        source_id: `inv-${index}`,
        counterparty: "X",
        document_no: String(index),
        due_date: "2026-07-19",
        days_remaining: days,
        amount: "1.00",
      })),
    });
    const tones = screen
      .getAllByTestId("hazine-upcoming-row")
      .map((node) => node.dataset.tone);
    expect(tones).toEqual(["danger", "danger", "warning", "warning", "success", "success"]);
  });

  it("counterparty NULL — satır YUTULMAZ, zarif düşüş + görünür bildirim", () => {
    renderPanel({
      ...RESPONSE,
      items: [{ ...RESPONSE.items[0]!, counterparty: null }],
    });
    expect(screen.getAllByTestId("hazine-upcoming-row")).toHaveLength(1);
    const title = screen.getByText("Karşı taraf belirtilmemiş – Hakediş #47");
    expect(title.getAttribute("title")).toMatch(/boş/);
    expect(screen.getByTestId("hazine-upcoming-counterparty-notice").textContent).toContain("1");
  });

  it("karşı tarafı dolu listede bildirim BASILMAZ", () => {
    renderPanel(RESPONSE);
    expect(
      screen.queryByTestId("hazine-upcoming-counterparty-notice"),
    ).not.toBeInTheDocument();
  });

  it("boş liste zarif boş durum basar", () => {
    renderPanel({ ...RESPONSE, items: [] });
    expect(screen.getByTestId("hazine-upcoming-empty")).toBeInTheDocument();
    expect(screen.queryAllByTestId("hazine-upcoming-row")).toHaveLength(0);
  });

  it("yüklenirken 'Yükleniyor…' basar, veri gelmeden satır çizmez", () => {
    render(
      <UpcomingPaymentsPanel upcoming={undefined} isLoading errorMessage={undefined} />,
    );
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByTestId("hazine-upcoming-empty")).not.toBeInTheDocument();
  });

  it("hata durumu görünür uyarı basar", () => {
    render(
      <UpcomingPaymentsPanel
        upcoming={undefined}
        isLoading={false}
        errorMessage="Yetkisiz işlem"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Yetkisiz işlem");
  });

  it("her satıra ayırt edici veri özniteliği koyar", () => {
    renderPanel(RESPONSE);
    const ids = screen
      .getAllByTestId("hazine-upcoming-row")
      .map((node) => node.dataset.sourceId);
    expect(ids).toEqual(["pp-1", "inv-1"]);
  });
});
