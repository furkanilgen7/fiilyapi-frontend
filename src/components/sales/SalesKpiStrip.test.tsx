import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SalesKpiStrip } from "./SalesKpiStrip";
import { COLLECTION_PCT_UNKNOWN_REASON } from "./sales-labels";
import type { SalesSummaryResponse } from "@/lib/api/hooks/useSalesSummary";

/**
 * F-P8 T2 · SY 54-60. Kanıtlanan ilke: BEŞ kutunun da tek kaynağı sunucunun
 * summary ucudur — ekran hiçbir KPI'yı HESAPLAMAZ ve sunucu `null` verdiğinde
 * uydurma bir rakam yerine "—" + görünür gerekçe basar.
 */

function summary(overrides: Partial<SalesSummaryResponse> = {}): SalesSummaryResponse {
  return {
    sold: { count: 34, deed_transferred_count: 30, amount: "31420000.00" },
    reserved: { count: 5, expired_count: 1, amount: "4200000.00" },
    available_units: { count: 13, list_price_total: "12600000.00" },
    collection: {
      collected_amount: "24820000.00",
      contracted_amount: "31420000.00",
      collection_pct: "79.00",
    },
    overdue: { installment_count: 3, amount: "840000.00", late_fee_amount: "4200.00" },
    upcoming_collections: [],
    expired_reservations: [],
    pending_modules: [],
    ...overrides,
  } as unknown as SalesSummaryResponse;
}

describe("SalesKpiStrip — BEŞ kutu sunucudan (54-60)", () => {
  it("kutuların etiketleri ve değerleri mockup sırasıyla basılır", () => {
    render(<SalesKpiStrip summary={summary()} />);
    const strip = screen.getByTestId("satis-kpi-strip");
    for (const label of [
      "Satılan (Tapulu)",
      "Rezerve",
      "Boş Ünite",
      "Tahsil Edilen",
      "Vadesi Geçen",
    ]) {
      expect(strip).toHaveTextContent(label);
    }
    expect(strip).toHaveTextContent("34");
    expect(strip).toHaveTextContent("13");
    expect(strip).toHaveTextContent("3 taksit"); // 59
    expect(strip).toHaveTextContent("potansiyel"); // 56
    expect(strip).toHaveTextContent("stok"); // 57
  });

  it("tahsilat yüzdesi SUNUCUDAN gelir (istemci bölme yapmaz)", () => {
    render(<SalesKpiStrip summary={summary()} />);
    expect(screen.getByTestId("satis-kpi-collection-pct")).toHaveTextContent("%79 tahsilat");
  });

  // MUTASYON KANITI: yalnız `collection_pct` null olur; ekran uydurma bir oran
  // (24.8M / 31.4M ≈ %79) HESAPLAMAZ, "—" + gerekçe basar.
  it("sunucu yüzdeyi `null` verdiğinde oran UYDURULMAZ, '—' + gerekçe basılır", () => {
    render(
      <SalesKpiStrip
        summary={summary({
          collection: {
            collected_amount: "24820000.00",
            contracted_amount: "0.00",
            collection_pct: null,
          },
        } as Partial<SalesSummaryResponse>)}
      />,
    );
    const cell = screen.getByTestId("satis-kpi-collection-pct");
    expect(cell).toHaveTextContent("— tahsilat");
    expect(cell).not.toHaveTextContent("%");
    expect(cell).toHaveAttribute("title", COLLECTION_PCT_UNKNOWN_REASON);
  });

  it("summary yüklenmemişken sahte SIFIR basılmaz — beş kutu da '—' gösterir", () => {
    render(<SalesKpiStrip summary={undefined} />);
    const strip = screen.getByTestId("satis-kpi-strip");
    expect(strip).not.toHaveTextContent("0");
    // Beş değer + beş ipucu = on yer tutucu.
    expect(strip.textContent?.match(/—/g)).toHaveLength(10);
  });
});
