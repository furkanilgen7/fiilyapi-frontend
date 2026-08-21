import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { BoqTotalsStrip } from "./BoqTotalsStrip";
import type { BoqTotals } from "@/lib/api/hooks/useBoq";

function totalsWith(overrides: Partial<BoqTotals> = {}): BoqTotals {
  return {
    contract_total: { available: false, value: null, pending_module: "contracts" },
    realized_total: { available: false, value: null, pending_module: "progress_payments" },
    remaining_total: { available: false, value: null, pending_module: "progress_payments" },
    revision_total: { available: false, value: null, pending_module: "contracts" },
    grand_total: "12399900.00",
    grand_progress_pct: { available: false, value: null, pending_module: "progress_payments" },
    ...overrides,
  };
}

const LABELS = ["Toplam Sözleşme", "Gerçekleşen", "Kalan İş", "Revize / Ek İş"];

describe("BoqTotalsStrip (spec §4, mockup 72–89)", () => {
  it("dört kart da — basar", () => {
    render(<BoqTotalsStrip totals={totalsWith()} />);
    const cards = screen.getAllByTestId("boq-kpi");
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(within(card).getByTestId("boq-kpi-value")).toHaveTextContent(/^—/);
    }
  });

  it("kart etiketleri mockup metinleriyle birebir", () => {
    render(<BoqTotalsStrip totals={totalsWith()} />);
    const labels = screen.getAllByTestId("boq-kpi-label").map((el) => el.textContent);
    expect(labels).toEqual(LABELS);
  });

  it("pendingModuleLabel metni yükten okunur, koda gömülü değildir", () => {
    render(
      <BoqTotalsStrip
        totals={totalsWith({
          contract_total: { available: false, value: null, pending_module: "uydurma_modul" },
        })}
      />,
    );
    const values = screen.getAllByTestId("boq-kpi-value");
    // 1. kart: bilinmeyen anahtar → yedek metin; 2. kart: yükteki anahtarın metni.
    expect(values[0]).toHaveAttribute("title", "İlgili modülle birlikte gelir");
    expect(values[1]).toHaveAttribute("title", "Hakediş verisi bu yüzeye henüz bağlanmadı");
  });

  it("yer tutucu değer sr-only metinle de erişilebilir (title tek başına yeterli değil)", () => {
    render(<BoqTotalsStrip totals={totalsWith()} />);
    const value = screen.getAllByTestId("boq-kpi-value")[0];
    expect(value).toHaveAttribute("title", "Sözleşme verisi bu yüzeye henüz bağlanmadı");
    expect(within(value).getByText("Sözleşme verisi bu yüzeye henüz bağlanmadı")).toHaveClass("sr-only");
  });

  it("grand_total kart olarak basılmaz", () => {
    render(<BoqTotalsStrip totals={totalsWith()} />);
    expect(screen.getAllByTestId("boq-kpi")).toHaveLength(4);
    expect(screen.queryByText(/12\.399\.900/)).not.toBeInTheDocument();
  });

  // spec §9 sonu: kart şeridi yükleme/hata durumlarında da basılır. O anda yük
  // yoktur → ipucu metni UYDURULMAZ, yalnız yer tutucu çizgi kalır.
  it("totals yokken kartlar yine basılır ama ipucu metni uydurulmaz", () => {
    render(<BoqTotalsStrip />);
    const values = screen.getAllByTestId("boq-kpi-value");
    expect(values).toHaveLength(4);
    expect(screen.getAllByTestId("boq-kpi-label").map((el) => el.textContent)).toEqual(LABELS);
    for (const value of values) {
      expect(value).not.toHaveAttribute("title");
      expect(value).toHaveTextContent("—");
    }
  });
});
